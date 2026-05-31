
create table if not exists public.app_settings (
  id int primary key default 1,
  maintenance_mode boolean not null default false,
  announcement_enabled boolean not null default false,
  announcement_text text not null default '',
  default_plan text not null default 'solo',
  feature_pdf_reports boolean not null default false,
  feature_prop_team boolean not null default false,
  feature_api_access boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint singleton check (id = 1)
);

insert into public.app_settings (id) values (1) on conflict do nothing;

grant select on public.app_settings to anon, authenticated;
grant all on public.app_settings to service_role;

alter table public.app_settings enable row level security;

drop policy if exists "Anyone reads settings" on public.app_settings;
create policy "Anyone reads settings" on public.app_settings
  for select using (true);

drop policy if exists "Admins update settings" on public.app_settings;
create policy "Admins update settings" on public.app_settings
  for update to authenticated using (public.has_role(auth.uid(), 'admin'));
