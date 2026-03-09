-- Persist health-chat messages per user
-- Generated at: 2026-02-12

begin;

create table if not exists public.health_chat_messages (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists health_chat_messages_user_id_created_at_idx
  on public.health_chat_messages (user_id, created_at);

alter table public.health_chat_messages enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'health_chat_messages'
      and policyname = 'health_chat_messages_select_own'
  ) then
    create policy health_chat_messages_select_own
      on public.health_chat_messages
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'health_chat_messages'
      and policyname = 'health_chat_messages_insert_own'
  ) then
    create policy health_chat_messages_insert_own
      on public.health_chat_messages
      for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'health_chat_messages'
      and policyname = 'health_chat_messages_delete_own'
  ) then
    create policy health_chat_messages_delete_own
      on public.health_chat_messages
      for delete
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'health_chat_messages'
      and policyname = 'health_chat_messages_update_own'
  ) then
    create policy health_chat_messages_update_own
      on public.health_chat_messages
      for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

commit;
