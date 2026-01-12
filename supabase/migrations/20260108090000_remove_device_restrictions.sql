-- Remove device-based restrictions (signup should be device-independent)

-- app_users.device_id is no longer required nor unique
alter table if exists public.app_users
  alter column device_id drop not null;

drop index if exists public.ux_app_users_device_id;

-- free_trial_logs is no longer device-bound
alter table if exists public.free_trial_logs
  alter column device_id drop not null;

drop index if exists public.ux_free_trial_logs_device_id;
