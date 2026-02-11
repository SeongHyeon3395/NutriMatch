-- Admin functions for managing user scan quotas
-- 관리자용 스캔 횟수 관리 함수

begin;

-- 1) 특정 사용자의 이번 달 스캔 횟수 초기화
create or replace function public.admin_reset_monthly_scans(
  p_user_id uuid,
  p_month timestamptz default now()
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  -- 관리자 권한 체크는 RLS 또는 별도 로직으로 처리
  -- 현재는 기본 구현만 제공
  
  if p_user_id is null then
    raise exception using message = 'USER_ID_REQUIRED';
  end if;

  delete from public.scan_events
  where user_id = p_user_id
    and source = 'food_analyze'
    and occurred_at >= date_trunc('month', p_month)
    and occurred_at <  (date_trunc('month', p_month) + interval '1 month');
  
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

comment on function public.admin_reset_monthly_scans is 
'관리자용: 특정 사용자의 이번 달 스캔 기록을 모두 삭제하여 횟수를 초기화합니다.';

-- 2) 특정 사용자의 스캔 기록 N개 삭제 (횟수 복구)
create or replace function public.admin_add_scan_quota(
  p_user_id uuid,
  p_count integer default 1,
  p_month timestamptz default now()
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  if p_user_id is null then
    raise exception using message = 'USER_ID_REQUIRED';
  end if;

  if p_count is null or p_count <= 0 then
    raise exception using message = 'INVALID_COUNT';
  end if;

  -- 최근 스캔 기록 N개를 삭제하여 횟수 복구
  delete from public.scan_events
  where id in (
    select id from public.scan_events
    where user_id = p_user_id
      and source = 'food_analyze'
      and occurred_at >= date_trunc('month', p_month)
      and occurred_at <  (date_trunc('month', p_month) + interval '1 month')
    order by occurred_at desc
    limit p_count
  );
  
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

comment on function public.admin_add_scan_quota is 
'관리자용: 특정 사용자의 최근 스캔 기록 N개를 삭제하여 스캔 횟수를 추가합니다.';

-- 3) 사용자 스캔 현황 조회
create or replace function public.admin_get_user_scan_status(
  p_user_id uuid,
  p_month timestamptz default now()
)
returns table(
  user_id uuid,
  username text,
  monthly_scans integer,
  scan_limit integer
)
language sql
stable
as $$
  select 
    u.id as user_id,
    u.username,
    (
      select count(*)::int
      from public.scan_events se
      where se.user_id = u.id
        and se.source = 'food_analyze'
        and se.occurred_at >= date_trunc('month', p_month)
        and se.occurred_at <  (date_trunc('month', p_month) + interval '1 month')
    ) as monthly_scans,
    100 as scan_limit  -- MONTHLY_SCAN_LIMIT 값
  from public.app_users u
  where u.id = p_user_id;
$$;

comment on function public.admin_get_user_scan_status is 
'관리자용: 특정 사용자의 이번 달 스캔 사용 현황을 조회합니다.';

-- Grant 권한은 필요시 추가 (보안상 authenticated 전체에는 부여하지 않음)
-- grant execute on function public.admin_reset_monthly_scans(uuid, timestamptz) to authenticated;
-- grant execute on function public.admin_add_scan_quota(uuid, integer, timestamptz) to authenticated;
-- grant execute on function public.admin_get_user_scan_status(uuid, timestamptz) to authenticated;

commit;
