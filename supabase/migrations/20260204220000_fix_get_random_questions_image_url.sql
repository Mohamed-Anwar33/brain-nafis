-- Drop the old function first to avoid type conflict
DROP FUNCTION IF EXISTS get_random_questions(integer);

-- Create the updated function with image_url support
create or replace function get_random_questions(limit_count int)
returns table (
  id uuid,
  text text,
  image_url text
)
language plpgsql
security definer
as $$
begin
  return query
  select q.id, q.text, q.image_url
  from questions q
  where q.active = true
  order by random()
  limit limit_count;
end;
$$;
