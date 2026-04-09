-- Community comments controls: owner can lock comments, owner can delete comments, comment reports

alter table if exists public.community_posts
  add column if not exists comments_enabled boolean not null default true;

create or replace function public.community_block_comment_when_disabled()
returns trigger
language plpgsql
as $$
declare
  v_enabled boolean;
begin
  select p.comments_enabled
    into v_enabled
  from public.community_posts p
  where p.id = new.post_id;

  if coalesce(v_enabled, true) = false then
    raise exception 'comments_disabled';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_community_post_comments_block_disabled on public.community_post_comments;
create trigger trg_community_post_comments_block_disabled
before insert on public.community_post_comments
for each row
execute function public.community_block_comment_when_disabled();

drop policy if exists "community_post_comments_delete_own" on public.community_post_comments;
create policy "community_post_comments_delete_own_or_post_owner"
on public.community_post_comments
for delete
to authenticated
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.community_posts p
    where p.id = post_id
      and p.user_id = auth.uid()
  )
);

create table if not exists public.community_comment_reports (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.community_post_comments(id) on delete cascade,
  reporter_user_id uuid not null references auth.users(id) on delete cascade,
  reason_type text not null check (reason_type in ('inappropriate','harassment','spam','copyright','false_info','other')),
  reason_detail text,
  status text not null default 'pending' check (status in ('pending','reviewing','resolved','rejected')),
  created_at timestamptz not null default now()
);

create index if not exists idx_community_comment_reports_comment on public.community_comment_reports (comment_id);
create index if not exists idx_community_comment_reports_reporter on public.community_comment_reports (reporter_user_id);

alter table public.community_comment_reports enable row level security;

drop policy if exists "community_comment_reports_select_own" on public.community_comment_reports;
create policy "community_comment_reports_select_own"
on public.community_comment_reports
for select
to authenticated
using (auth.uid() = reporter_user_id);

drop policy if exists "community_comment_reports_insert_own" on public.community_comment_reports;
create policy "community_comment_reports_insert_own"
on public.community_comment_reports
for insert
to authenticated
with check (auth.uid() = reporter_user_id);

grant select, update on public.community_comment_reports to service_role;
