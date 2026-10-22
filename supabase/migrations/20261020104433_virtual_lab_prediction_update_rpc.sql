-- Students can revise a prediction until the simulation has been opened.
-- The answer choice and attempt are validated inside the privileged function
-- because students cannot write to virtual_lab_attempts directly.
create or replace function public.update_virtual_lab_prediction(
  p_attempt_id uuid,
  p_before_answer text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1
    from public.virtual_lab_attempts a
    join public.virtual_lab_activities activity on activity.id = a.activity_id
    cross join lateral pg_catalog.jsonb_array_elements(activity.before_choices) choice
    where a.id = p_attempt_id
      and a.student_id = auth.uid()
      and a.simulation_opened_at is null
      and choice->>'id' = p_before_answer
  ) then
    raise exception 'Attempt unavailable or prediction choice invalid';
  end if;

  update public.virtual_lab_attempts
  set before_answer = p_before_answer
  where id = p_attempt_id
    and student_id = auth.uid()
    and simulation_opened_at is null;

  if not found then
    raise exception 'Attempt unavailable or simulation already opened';
  end if;
end;
$$;

revoke all on function public.update_virtual_lab_prediction(uuid, text) from public, anon, authenticated;
grant execute on function public.update_virtual_lab_prediction(uuid, text) to authenticated;

-- Reject malformed post-simulation choice IDs at the database boundary.
create or replace function public.submit_virtual_lab_answer(p_attempt_id uuid, p_after_answer text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_correct boolean;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1
    from public.virtual_lab_attempts a
    join public.virtual_lab_activities activity on activity.id = a.activity_id
    cross join lateral pg_catalog.jsonb_array_elements(activity.after_choices) choice
    where a.id = p_attempt_id
      and a.student_id = auth.uid()
      and choice->>'id' = p_after_answer
  ) then
    raise exception 'Conclusion choice unavailable';
  end if;

  update public.virtual_lab_attempts a
  set after_answer = p_after_answer,
      mastered = (answer_key.after_correct_answer = p_after_answer),
      completed_at = pg_catalog.now()
  from public.virtual_lab_answer_keys answer_key
  where a.id = p_attempt_id
    and a.student_id = auth.uid()
    and a.simulation_opened_at is not null
    and a.before_answer is not null
    and answer_key.activity_id = a.activity_id
  returning a.mastered into v_correct;

  if v_correct is null then
    raise exception 'Complete the prediction and open the simulation first';
  end if;

  return v_correct;
end;
$$;

revoke all on function public.submit_virtual_lab_answer(uuid, text) from public, anon, authenticated;
grant execute on function public.submit_virtual_lab_answer(uuid, text) to authenticated;
