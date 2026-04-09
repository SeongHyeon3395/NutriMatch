# Community Report Admin API/Query Guide

## Purpose
Web admin can inspect user reports and change moderation status.

## Data Sources
- Table: public.community_post_reports
- View (admin-friendly): public.community_post_reports_admin_v
- Status update function: public.community_set_report_status(uuid, text, text)
- Table (comments): public.community_comment_reports
- View (comments): public.community_comment_reports_admin_v
- Status update function (comments): public.community_set_comment_report_status(uuid, text, text)

## Suggested Admin Status
- pending: first received
- reviewing: moderator is reviewing
- resolved: action completed
- rejected: invalid report

## Example Queries (service role)

### 1) List latest pending/reviewing reports
```sql
select
  id,
  post_id,
  reporter_user_id,
  reason_type,
  reason_detail,
  status,
  created_at,
  reporter_username,
  post_owner_username,
  post_caption
from public.community_post_reports_admin_v
where status in ('pending', 'reviewing')
order by created_at desc
limit 100;
```

### 2) Filter reports by reason type
```sql
select *
from public.community_post_reports_admin_v
where reason_type = 'harassment'
order by created_at desc;
```

### 3) Move report to reviewing
```sql
select *
from public.community_set_report_status(
  '00000000-0000-0000-0000-000000000000'::uuid,
  'reviewing',
  '검토 시작'
);
```

### 4) Resolve report with admin note
```sql
select *
from public.community_set_report_status(
  '00000000-0000-0000-0000-000000000000'::uuid,
  'resolved',
  '게시글 삭제 및 경고 조치 완료'
);
```

### 5) List latest pending/reviewing comment reports
```sql
select
  id,
  comment_id,
  reporter_user_id,
  reason_type,
  reason_detail,
  status,
  created_at,
  reporter_username,
  comment_owner_username,
  comment_content,
  post_caption
from public.community_comment_reports_admin_v
where status in ('pending', 'reviewing')
order by created_at desc
limit 100;
```

### 6) Resolve comment report with admin note
```sql
select *
from public.community_set_comment_report_status(
  '00000000-0000-0000-0000-000000000000'::uuid,
  'resolved',
  '댓글 삭제 및 사용자 경고 조치 완료'
);
```

## REST Example (Supabase)
With server-side service role key:

- List reports:
  - GET /rest/v1/community_post_reports_admin_v?select=*&status=in.(pending,reviewing)&order=created_at.desc

- Update status (RPC):
  - POST /rest/v1/rpc/community_set_report_status
  - body:
```json
{
  "p_report_id": "00000000-0000-0000-0000-000000000000",
  "p_status": "resolved",
  "p_admin_note": "처리 완료"
}
```

## Notes
- service_role only for admin backend/server; never expose in client app.
- Keep moderation logs in your web backend if audit history is needed.
