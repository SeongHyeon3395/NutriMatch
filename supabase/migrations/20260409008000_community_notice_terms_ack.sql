-- Account-level community notice agreement timestamp

alter table if exists public.app_users
  add column if not exists community_notice_agreed_at timestamptz;
