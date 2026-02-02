-- Create a table for user roles
create table if not exists public.user_roles (
  user_id uuid references auth.users on delete cascade not null primary key,
  role text not null default 'student' check (role in ('admin', 'student')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.user_roles enable row level security;

-- Policies
create policy "Users can read their own role"
  on public.user_roles for select
  using (auth.uid() = user_id);

create policy "Admins can do everything with user_roles"
  on public.user_roles for all
  using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role = 'admin'
    )
  );

-- Function to handle new user signup
create or replace function public.handle_new_user_role()
returns trigger as $$
begin
  insert into public.user_roles (user_id, role)
  values (new.id, 'student');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new users
-- Note: Check if trigger exists first to avoid error in repeated runs if manually applied
drop trigger if exists on_auth_user_created_role on auth.users;
create trigger on_auth_user_created_role
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user_role();

-- Backfill existing users as 'student' if they don't have a role
insert into public.user_roles (user_id, role)
select id, 'student' from auth.users
where id not in (select user_id from public.user_roles);

-- SAFETY NET: If there are NO admins, make the oldest user an admin
-- This prevents total lockout if this is run on an existing populated db with no admins yet
do $$
begin
  if not exists (select 1 from public.user_roles where role = 'admin') then
    update public.user_roles
    set role = 'admin'
    where user_id = (select id from auth.users order by created_at asc limit 1);
  end if;
end $$;
