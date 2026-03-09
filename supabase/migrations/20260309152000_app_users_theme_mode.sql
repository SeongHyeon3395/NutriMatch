-- Persist app theme mode per user for cross-device restore

alter table if exists public.app_users
  add column if not exists theme_mode text not null default 'system';

update public.app_users
set theme_mode = 'system'
where theme_mode is null or theme_mode = '';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'app_users_theme_mode_check'
  ) then
    alter table public.app_users
      add constraint app_users_theme_mode_check
      check (theme_mode in ('light', 'dark', 'system'));
  end if;
end $$;