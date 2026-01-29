-- Create a function to get random questions efficiently
create or replace function get_random_questions(limit_count int)
returns table (
  id uuid,
  text text
)
language plpgsql
security definer
as $$
begin
  return query
  select q.id, q.text
  from questions q
  where q.active = true
  order by random()
  limit limit_count;
end;
$$;
