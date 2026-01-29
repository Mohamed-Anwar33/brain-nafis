-- Create a function to verify exam answer efficiently
create or replace function verify_exam_answer(
  p_attempt_id uuid,
  p_question_id uuid,
  p_selected_choice_id uuid
) returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_correct boolean;
  v_score int;
  v_total_penalty int;
  v_wrong_count int;
  v_penalty_applied boolean;
  v_existing_answer_id uuid;
  v_existing_wrong_count int;
  v_existing_penalty_applied boolean;
  v_current_attempt_score int;
  v_current_attempt_penalty int;
begin
  -- 1. Check if choice is correct
  select is_correct into v_is_correct
  from choices
  where id = p_selected_choice_id and question_id = p_question_id;

  if v_is_correct is null then
    return json_build_object('error', 'Invalid choice');
  end if;

  -- 2. Check for existing answer
  select id, wrong_count, penalty_applied
  into v_existing_answer_id, v_existing_wrong_count, v_existing_penalty_applied
  from attempt_answers
  where attempt_id = p_attempt_id and question_id = p_question_id;

  -- 3. Get current attempt stats
  select score, total_penalty
  into v_current_attempt_score, v_current_attempt_penalty
  from attempts
  where id = p_attempt_id;

  if not found then
    return json_build_object('error', 'Attempt not found');
  end if;

  -- 4. Process Answer
  if v_is_correct then
    -- Correct Answer
    if v_existing_answer_id is not null then
      update attempt_answers
      set selected_choice_id = p_selected_choice_id,
          is_correct = true,
          answered_at = now()
      where id = v_existing_answer_id;
    else
      insert into attempt_answers (attempt_id, question_id, selected_choice_id, is_correct, wrong_count, penalty_applied)
      values (p_attempt_id, p_question_id, p_selected_choice_id, true, 0, false);
    end if;

    v_score := v_current_attempt_score;
    v_wrong_count := coalesce(v_existing_wrong_count, 0);
    v_penalty_applied := coalesce(v_existing_penalty_applied, false);

  else
    -- Wrong Answer
    v_wrong_count := coalesce(v_existing_wrong_count, 0) + 1;
    v_penalty_applied := coalesce(v_existing_penalty_applied, false);
    
    if not v_penalty_applied then
      -- Apply penalty
      v_score := greatest(0, v_current_attempt_score - 1);
      v_total_penalty := v_current_attempt_penalty + 1;
      v_penalty_applied := true;

      -- Update attempt
      update attempts
      set score = v_score,
          total_penalty = v_total_penalty
      where id = p_attempt_id;
    else
      -- Penalty already applied
      v_score := v_current_attempt_score;
    end if;

    if v_existing_answer_id is not null then
      update attempt_answers
      set selected_choice_id = p_selected_choice_id,
          is_correct = false,
          wrong_count = v_wrong_count,
          penalty_applied = v_penalty_applied,
          answered_at = now()
      where id = v_existing_answer_id;
    else
      insert into attempt_answers (attempt_id, question_id, selected_choice_id, is_correct, wrong_count, penalty_applied)
      values (p_attempt_id, p_question_id, p_selected_choice_id, false, 1, true);
    end if;
  end if;

  -- 5. Return Result
  return json_build_object(
    'correct', v_is_correct,
    'score', v_score,
    'wrong_count', v_wrong_count,
    'penalty_applied', v_penalty_applied
  );
end;
$$;
