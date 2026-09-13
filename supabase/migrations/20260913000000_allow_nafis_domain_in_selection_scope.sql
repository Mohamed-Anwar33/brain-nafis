-- ==============================================================================
-- Migration: Update enforce_selection_scope to allow optional domain_id for Nafis
-- ==============================================================================

create or replace function public.enforce_selection_scope()
returns trigger
language plpgsql
as $$
declare
  v_domain_grade_subject_id uuid;
begin
  if new.grade_subject_id is null then
    raise exception 'grade_subject_id is required';
  end if;

  if new.track_type not in ('nafis', 'central') then
    raise exception 'track_type must be nafis or central';
  end if;

  if new.track_type = 'central' and new.domain_id is null then
    raise exception 'domain_id is required for central track';
  end if;

  -- Allow domain_id for nafis (it is optional for nafis, but required for central)
  if new.domain_id is not null then
    select grade_subject_id into v_domain_grade_subject_id
    from public.central_domains
    where id = new.domain_id;

    if v_domain_grade_subject_id is null then
      raise exception 'domain_id does not exist';
    end if;

    if new.grade_subject_id <> v_domain_grade_subject_id then
      raise exception 'domain_id does not belong to grade_subject_id';
    end if;
  end if;

  return new;
end;
$$;
