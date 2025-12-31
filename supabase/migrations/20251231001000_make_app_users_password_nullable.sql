-- Supabase Auth 전환: 비밀번호는 auth.users에서 관리하므로, 커스텀 테이블의 해시/솔트는 nullable로 변경

alter table public.app_users alter column password_hash drop not null;
alter table public.app_users alter column password_salt drop not null;
