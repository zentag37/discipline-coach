
-- Roles enum
do $$ begin
  create type public.app_role as enum ('admin', 'moderator', 'user');
exception when duplicate_object then null; end $$;

-- user_roles table
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;

alter table public.user_roles enable row level security;

drop policy if exists "Users view own roles" on public.user_roles;
create policy "Users view own roles" on public.user_roles
  for select to authenticated using (auth.uid() = user_id);

-- has_role security definer
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  );
$$;

-- Admins-can-view-all policies for existing tables
drop policy if exists "Admins view all profiles" on public.profiles;
create policy "Admins view all profiles" on public.profiles
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins update all profiles" on public.profiles;
create policy "Admins update all profiles" on public.profiles
  for update to authenticated using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins view all trades" on public.trades;
create policy "Admins view all trades" on public.trades
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins view all sessions" on public.sessions;
create policy "Admins view all sessions" on public.sessions
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins view all reviews" on public.journal_reviews;
create policy "Admins view all reviews" on public.journal_reviews
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- admin_logs
create table if not exists public.admin_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_user_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);

grant select, insert on public.admin_logs to authenticated;
grant all on public.admin_logs to service_role;

alter table public.admin_logs enable row level security;

drop policy if exists "Admins view logs" on public.admin_logs;
create policy "Admins view logs" on public.admin_logs
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins insert logs" on public.admin_logs;
create policy "Admins insert logs" on public.admin_logs
  for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));

create index if not exists idx_admin_logs_created_at on public.admin_logs(created_at desc);
