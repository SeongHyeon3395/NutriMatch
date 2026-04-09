-- Save/bookmark feature for community posts

create table if not exists public.community_saved_posts (
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists idx_community_saved_posts_user on public.community_saved_posts (user_id, created_at desc);
create index if not exists idx_community_saved_posts_post on public.community_saved_posts (post_id);

alter table public.community_saved_posts enable row level security;

drop policy if exists "community_saved_posts_select_own" on public.community_saved_posts;
create policy "community_saved_posts_select_own"
on public.community_saved_posts
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "community_saved_posts_insert_own" on public.community_saved_posts;
create policy "community_saved_posts_insert_own"
on public.community_saved_posts
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "community_saved_posts_delete_own" on public.community_saved_posts;
create policy "community_saved_posts_delete_own"
on public.community_saved_posts
for delete
to authenticated
using (auth.uid() = user_id);
