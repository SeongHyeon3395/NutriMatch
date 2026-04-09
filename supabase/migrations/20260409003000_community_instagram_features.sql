-- Community feature expansion: visibility, multi-images, hide/report tables

alter table if exists public.community_posts
  add column if not exists visibility text not null default 'public';

alter table if exists public.community_posts
  drop constraint if exists community_posts_visibility_check;

alter table if exists public.community_posts
  add constraint community_posts_visibility_check
  check (visibility in ('public', 'followers', 'private'));

create table if not exists public.community_post_images (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  image_path text,
  image_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint community_post_images_one_source check ((image_path is null) or (image_url is null))
);

create index if not exists idx_community_post_images_post on public.community_post_images (post_id, sort_order asc);

create table if not exists public.community_hidden_users (
  user_id uuid not null references auth.users(id) on delete cascade,
  hidden_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, hidden_user_id),
  constraint community_hidden_users_no_self check (user_id <> hidden_user_id)
);

create index if not exists idx_community_hidden_users_hidden_user on public.community_hidden_users (hidden_user_id);

create table if not exists public.community_post_reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  reporter_user_id uuid not null references auth.users(id) on delete cascade,
  reason_type text not null check (reason_type in ('inappropriate','harassment','spam','copyright','false_info','other')),
  reason_detail text,
  status text not null default 'pending' check (status in ('pending','reviewing','resolved','rejected')),
  created_at timestamptz not null default now()
);

create index if not exists idx_community_post_reports_post on public.community_post_reports (post_id);
create index if not exists idx_community_post_reports_reporter on public.community_post_reports (reporter_user_id);

alter table public.community_post_images enable row level security;
alter table public.community_hidden_users enable row level security;
alter table public.community_post_reports enable row level security;

drop policy if exists "community_post_images_select_all_authenticated" on public.community_post_images;
create policy "community_post_images_select_all_authenticated"
on public.community_post_images
for select
to authenticated
using (true);

drop policy if exists "community_post_images_insert_own_post" on public.community_post_images;
create policy "community_post_images_insert_own_post"
on public.community_post_images
for insert
to authenticated
with check (
  exists (
    select 1
    from public.community_posts p
    where p.id = post_id
      and p.user_id = auth.uid()
  )
);

drop policy if exists "community_post_images_update_own_post" on public.community_post_images;
create policy "community_post_images_update_own_post"
on public.community_post_images
for update
to authenticated
using (
  exists (
    select 1
    from public.community_posts p
    where p.id = post_id
      and p.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.community_posts p
    where p.id = post_id
      and p.user_id = auth.uid()
  )
);

drop policy if exists "community_post_images_delete_own_post" on public.community_post_images;
create policy "community_post_images_delete_own_post"
on public.community_post_images
for delete
to authenticated
using (
  exists (
    select 1
    from public.community_posts p
    where p.id = post_id
      and p.user_id = auth.uid()
  )
);

drop policy if exists "community_hidden_users_select_own" on public.community_hidden_users;
create policy "community_hidden_users_select_own"
on public.community_hidden_users
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "community_hidden_users_insert_own" on public.community_hidden_users;
create policy "community_hidden_users_insert_own"
on public.community_hidden_users
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "community_hidden_users_delete_own" on public.community_hidden_users;
create policy "community_hidden_users_delete_own"
on public.community_hidden_users
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "community_post_reports_select_own" on public.community_post_reports;
create policy "community_post_reports_select_own"
on public.community_post_reports
for select
to authenticated
using (auth.uid() = reporter_user_id);

drop policy if exists "community_post_reports_insert_own" on public.community_post_reports;
create policy "community_post_reports_insert_own"
on public.community_post_reports
for insert
to authenticated
with check (auth.uid() = reporter_user_id);

-- Allow service role/backend to view all report records for admin web processing.
grant select, update on public.community_post_reports to service_role;
