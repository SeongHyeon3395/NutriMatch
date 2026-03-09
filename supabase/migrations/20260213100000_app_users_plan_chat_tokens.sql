-- Plan + monthly chat token usage on app_users

alter table if exists public.app_users
  add column if not exists plan_id text not null default 'free',
  add column if not exists chat_tokens_month text,
  add column if not exists chat_tokens_used integer not null default 0;

update public.app_users
set plan_id = coalesce(nullif(plan_id, ''), 'free')
where plan_id is null or plan_id = '';

alter table if exists public.app_users
  add constraint app_users_plan_id_check
  check (plan_id in ('free', 'plus', 'pro', 'premium', 'master'));

create or replace function public.plan_chat_tokens_limit(p_plan text)
returns integer
language plpgsql
immutable
as $$
begin
  case coalesce(lower(p_plan), 'free')
    when 'plus' then return 300000;
    when 'premium' then return 300000;
    when 'pro' then return 1000000;
    when 'master' then return 99999999;
    else return 40000;
  end case;
end;
$$;

create or replace function public.get_monthly_chat_token_status(p_month text default null)
returns table (
  month text,
  plan_id text,
  used integer,
  limit_value integer,
  remaining integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_month text := coalesce(p_month, to_char(now(), 'YYYY-MM'));
  v_plan text;
  v_used integer;
  v_limit integer;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  update public.app_users
  set
    chat_tokens_month = case
      when chat_tokens_month is null or chat_tokens_month <> v_month then v_month
      else chat_tokens_month
    end,
    chat_tokens_used = case
      when chat_tokens_month is null or chat_tokens_month <> v_month then 0
      else coalesce(chat_tokens_used, 0)
    end
  where id = v_uid;

  select u.plan_id, coalesce(u.chat_tokens_used, 0)
    into v_plan, v_used
  from public.app_users u
  where u.id = v_uid;

  if v_plan is null then v_plan := 'free'; end if;
  v_limit := public.plan_chat_tokens_limit(v_plan);

  return query
  select v_month, v_plan, v_used, v_limit, greatest(0, v_limit - v_used);
end;
$$;

create or replace function public.consume_monthly_chat_tokens(p_tokens integer, p_month text default null)
returns table (
  allowed boolean,
  month text,
  plan_id text,
  used integer,
  limit_value integer,
  remaining integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_month text := coalesce(p_month, to_char(now(), 'YYYY-MM'));
  v_tokens integer := greatest(0, coalesce(p_tokens, 0));
  v_plan text;
  v_used integer;
  v_limit integer;
  v_next integer;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  perform 1
  from public.app_users u
  where u.id = v_uid
  for update;

  update public.app_users
  set
    chat_tokens_month = case
      when chat_tokens_month is null or chat_tokens_month <> v_month then v_month
      else chat_tokens_month
    end,
    chat_tokens_used = case
      when chat_tokens_month is null or chat_tokens_month <> v_month then 0
      else coalesce(chat_tokens_used, 0)
    end
  where id = v_uid;

  select u.plan_id, coalesce(u.chat_tokens_used, 0)
    into v_plan, v_used
  from public.app_users u
  where u.id = v_uid;

  if v_plan is null then v_plan := 'free'; end if;
  v_limit := public.plan_chat_tokens_limit(v_plan);
  v_next := v_used + v_tokens;

  if v_next > v_limit then
    return query
    select false, v_month, v_plan, v_used, v_limit, greatest(0, v_limit - v_used);
    return;
  end if;

  update public.app_users
  set
    chat_tokens_month = v_month,
    chat_tokens_used = v_next
  where id = v_uid;

  return query
  select true, v_month, v_plan, v_next, v_limit, greatest(0, v_limit - v_next);
end;
$$;

grant execute on function public.plan_chat_tokens_limit(text) to anon, authenticated;
grant execute on function public.get_monthly_chat_token_status(text) to authenticated;
grant execute on function public.consume_monthly_chat_tokens(integer, text) to authenticated;
