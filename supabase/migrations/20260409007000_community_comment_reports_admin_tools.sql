-- Admin tools for community comment reports (web/backoffice)

alter table if exists public.community_comment_reports
  add column if not exists admin_note text;

alter table if exists public.community_comment_reports
  add column if not exists reviewed_at timestamptz;

alter table if exists public.community_comment_reports
  add column if not exists reviewed_by uuid references auth.users(id);

create or replace view public.community_comment_reports_admin_v as
select
  r.id,
  r.comment_id,
  r.reporter_user_id,
  r.reason_type,
  r.reason_detail,
  r.status,
  r.admin_note,
  r.created_at,
  r.reviewed_at,
  r.reviewed_by,
  c.post_id,
  c.user_id as comment_owner_user_id,
  c.content as comment_content,
  c.created_at as comment_created_at,
  p.user_id as post_owner_user_id,
  p.caption as post_caption,
  reporter.username as reporter_username,
  reporter.nickname as reporter_nickname,
  comment_owner.username as comment_owner_username,
  comment_owner.nickname as comment_owner_nickname,
  post_owner.username as post_owner_username,
  post_owner.nickname as post_owner_nickname
from public.community_comment_reports r
left join public.community_post_comments c on c.id = r.comment_id
left join public.community_posts p on p.id = c.post_id
left join public.app_users reporter on reporter.id = r.reporter_user_id
left join public.app_users comment_owner on comment_owner.id = c.user_id
left join public.app_users post_owner on post_owner.id = p.user_id;

grant select on public.community_comment_reports_admin_v to service_role;

create or replace function public.community_set_comment_report_status(
  p_report_id uuid,
  p_status text,
  p_admin_note text default null
)
returns public.community_comment_reports
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.community_comment_reports;
  v_actor uuid;
begin
  if p_status not in ('pending', 'reviewing', 'resolved', 'rejected') then
    raise exception 'Invalid status: %', p_status;
  end if;

  v_actor := auth.uid();

  update public.community_comment_reports
  set
    status = p_status,
    admin_note = p_admin_note,
    reviewed_at = now(),
    reviewed_by = v_actor
  where id = p_report_id
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Comment report not found: %', p_report_id;
  end if;

  return v_row;
end;
$$;

revoke all on function public.community_set_comment_report_status(uuid, text, text) from public;
grant execute on function public.community_set_comment_report_status(uuid, text, text) to service_role;
