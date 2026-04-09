-- Community core: posts, reactions, comments, follows + storage policies

create extension if not exists pgcrypto;

-- Posts
create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  caption text not null check (char_length(trim(caption)) between 1 and 1000),
  image_path text,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint community_posts_one_image_source check (
    (image_path is null) or (image_url is null)
  )
);

create index if not exists idx_community_posts_created_at on public.community_posts (created_at desc);
create index if not exists idx_community_posts_user_id on public.community_posts (user_id);

-- Reactions (공감)
create table if not exists public.community_post_reactions (
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction_type text not null default 'like' check (reaction_type in ('like')),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists idx_community_post_reactions_user_id on public.community_post_reactions (user_id);
create index if not exists idx_community_post_reactions_post_id on public.community_post_reactions (post_id);

-- Comments
create table if not exists public.community_post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(trim(content)) between 1 and 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_community_post_comments_post_created on public.community_post_comments (post_id, created_at asc);
create index if not exists idx_community_post_comments_user_id on public.community_post_comments (user_id);

-- Follow
create table if not exists public.community_follows (
  follower_user_id uuid not null references auth.users(id) on delete cascade,
  followee_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_user_id, followee_user_id),
  constraint community_follows_no_self check (follower_user_id <> followee_user_id)
);

create index if not exists idx_community_follows_followee on public.community_follows (followee_user_id);

-- updated_at trigger helper
create or replace function public.set_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_community_posts_updated_at on public.community_posts;
create trigger trg_community_posts_updated_at
before update on public.community_posts
for each row
execute function public.set_updated_at_column();

drop trigger if exists trg_community_post_comments_updated_at on public.community_post_comments;
create trigger trg_community_post_comments_updated_at
before update on public.community_post_comments
for each row
execute function public.set_updated_at_column();

alter table public.community_posts enable row level security;
alter table public.community_post_reactions enable row level security;
alter table public.community_post_comments enable row level security;
alter table public.community_follows enable row level security;

-- Posts policies
drop policy if exists "community_posts_select_all_authenticated" on public.community_posts;
create policy "community_posts_select_all_authenticated"
on public.community_posts
for select
to authenticated
using (true);

drop policy if exists "community_posts_insert_own" on public.community_posts;
create policy "community_posts_insert_own"
on public.community_posts
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "community_posts_update_own" on public.community_posts;
create policy "community_posts_update_own"
on public.community_posts
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "community_posts_delete_own" on public.community_posts;
create policy "community_posts_delete_own"
on public.community_posts
for delete
to authenticated
using (auth.uid() = user_id);

-- Reactions policies
drop policy if exists "community_post_reactions_select_all_authenticated" on public.community_post_reactions;
create policy "community_post_reactions_select_all_authenticated"
on public.community_post_reactions
for select
to authenticated
using (true);

drop policy if exists "community_post_reactions_insert_own" on public.community_post_reactions;
create policy "community_post_reactions_insert_own"
on public.community_post_reactions
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "community_post_reactions_delete_own" on public.community_post_reactions;
create policy "community_post_reactions_delete_own"
on public.community_post_reactions
for delete
to authenticated
using (auth.uid() = user_id);

-- Comments policies
drop policy if exists "community_post_comments_select_all_authenticated" on public.community_post_comments;
create policy "community_post_comments_select_all_authenticated"
on public.community_post_comments
for select
to authenticated
using (true);

drop policy if exists "community_post_comments_insert_own" on public.community_post_comments;
create policy "community_post_comments_insert_own"
on public.community_post_comments
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "community_post_comments_update_own" on public.community_post_comments;
create policy "community_post_comments_update_own"
on public.community_post_comments
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "community_post_comments_delete_own" on public.community_post_comments;
create policy "community_post_comments_delete_own"
on public.community_post_comments
for delete
to authenticated
using (auth.uid() = user_id);

-- Follows policies
drop policy if exists "community_follows_select_all_authenticated" on public.community_follows;
create policy "community_follows_select_all_authenticated"
on public.community_follows
for select
to authenticated
using (true);

drop policy if exists "community_follows_insert_own" on public.community_follows;
create policy "community_follows_insert_own"
on public.community_follows
for insert
to authenticated
with check (auth.uid() = follower_user_id);

drop policy if exists "community_follows_delete_own" on public.community_follows;
create policy "community_follows_delete_own"
on public.community_follows
for delete
to authenticated
using (auth.uid() = follower_user_id);

-- Storage bucket/policies
insert into storage.buckets (id, name, public)
values ('community-images', 'community-images', false)
on conflict (id) do nothing;

drop policy if exists "community_images_read_authenticated" on storage.objects;
create policy "community_images_read_authenticated"
on storage.objects
for select
to authenticated
using (bucket_id = 'community-images');

drop policy if exists "community_images_insert_own_folder" on storage.objects;
create policy "community_images_insert_own_folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'community-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "community_images_update_own_folder" on storage.objects;
create policy "community_images_update_own_folder"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'community-images'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'community-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "community_images_delete_own_folder" on storage.objects;
create policy "community_images_delete_own_folder"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'community-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);
