-- Run after the science-activities schema migration. All fixture writes are
-- rolled back so this can be executed against a project without leaving data.
begin;

do $$
declare
  v_activity_id uuid := gen_random_uuid();
  v_student_id uuid := gen_random_uuid();
  v_other_student_id uuid := gen_random_uuid();
  v_attempt_id uuid;
  v_saved_prediction text;
  v_rejected boolean;
begin
  insert into public.virtual_lab_activities (
    id, title, simulation_url, before_question, before_choices, after_question, after_choices
  ) values (
    v_activity_id,
    'RPC transaction test',
    'https://example.org/simulation',
    'Prediction?',
    '[{"id":"before-a","text":"A"},{"id":"before-b","text":"B"}]'::jsonb,
    'Conclusion?',
    '[{"id":"after-a","text":"A"},{"id":"after-b","text":"B"}]'::jsonb
  );

  insert into public.virtual_lab_answer_keys (activity_id, before_correct_answer, after_correct_answer)
  values (v_activity_id, 'before-a', 'after-a');

  perform set_config('request.jwt.claim.sub', v_student_id::text, true);
  v_attempt_id := public.start_virtual_lab_attempt(v_activity_id, 'before-a');

  perform public.update_virtual_lab_prediction(v_attempt_id, 'before-b');
  select before_answer into v_saved_prediction
  from public.virtual_lab_attempts where id = v_attempt_id;
  if v_saved_prediction <> 'before-b' then
    raise exception 'Valid owner prediction was not saved before simulation opened';
  end if;

  v_rejected := false;
  begin
    perform public.update_virtual_lab_prediction(v_attempt_id, 'not-a-choice');
  exception when raise_exception then
    v_rejected := true;
  end;
  if not v_rejected then
    raise exception 'Prediction RPC accepted a choice outside the activity';
  end if;

  perform public.mark_virtual_lab_opened(v_attempt_id);
  v_rejected := false;
  begin
    perform public.update_virtual_lab_prediction(v_attempt_id, 'before-a');
  exception when raise_exception then
    v_rejected := true;
  end;
  if not v_rejected then
    raise exception 'Prediction RPC allowed changing an answer after simulation opened';
  end if;

  perform set_config('request.jwt.claim.sub', v_other_student_id::text, true);
  v_rejected := false;
  begin
    perform public.update_virtual_lab_prediction(v_attempt_id, 'before-a');
  exception when raise_exception then
    v_rejected := true;
  end;
  if not v_rejected then
    raise exception 'Prediction RPC allowed another student to update the attempt';
  end if;
end;
$$;

rollback;
