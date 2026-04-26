-- Make app_settings admin access depend on user_roles, even on projects
-- where the older role migrations have not been applied yet.

create table if not exists public.app_settings (
  key text primary key,
  value text,
  updated_at timestamptz default now()
);

alter table public.app_settings enable row level security;

insert into public.app_settings (key, value)
values ('admin_email', '')
on conflict (key) do nothing;

create table if not exists public.user_roles (
  user_id uuid references auth.users on delete cascade not null primary key,
  role text not null default 'student' check (role in ('admin', 'student')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.user_roles enable row level security;

create or replace function public.handle_new_user_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_roles (user_id, role)
  values (new.id, 'student')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_role on auth.users;

create trigger on_auth_user_created_role
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user_role();

insert into public.user_roles (user_id, role)
select id, 'student'
from auth.users
where id not in (select user_id from public.user_roles)
on conflict (user_id) do nothing;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role = 'admin'
  );
$$;

drop policy if exists "Users can read their own role" on public.user_roles;
create policy "Users can read their own role"
  on public.user_roles
  for select
  using (auth.uid() = user_id);

drop policy if exists "Admins can do everything with user_roles" on public.user_roles;
create policy "Admins can do everything with user_roles"
  on public.user_roles
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

do $$
begin
  if not exists (select 1 from public.user_roles where role = 'admin') then
    update public.user_roles
    set role = 'admin'
    where user_id = (
      select id
      from auth.users
      order by created_at asc
      limit 1
    );
  end if;
end
$$;

drop policy if exists "Admins can manage settings" on public.app_settings;
create policy "Admins can manage settings"
  on public.app_settings
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Service role can read settings" on public.app_settings;
create policy "Service role can read settings"
  on public.app_settings
  for select
  to service_role
  using (true);
