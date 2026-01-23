-- Consumable scan usage: deleting history must not refund monthly quota.

begin;

-- 1) Event table
create table if not exists public.scan_events (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null default 'food_scan',
  food_log_id uuid null references public.food_logs(id) on delete set null,
  occurred_at timestamptz not null default now()
);

create index if not exists idx_scan_events_user_occurred_at
on public.scan_events (user_id, occurred_at desc);

alter table public.scan_events enable row level security;

-- RLS: own rows only
drop policy if exists "select own scan_events" on public.scan_events;
create policy "select own scan_events"
on public.scan_events
for select
to authenticated
using (user_id = auth.uid());

-- no insert/update/delete from client (service_role or trigger only)

-- 2) Trigger: when a food_log is inserted, record a scan event
create or replace function public.trg_record_scan_event()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.scan_events(user_id, source, food_log_id, occurred_at)
  values (new.user_id, 'food_log_insert', new.id, new.occurred_at);
  return new;
end;
$$;

drop trigger if exists trg_food_logs_record_scan_event on public.food_logs;
create trigger trg_food_logs_record_scan_event
after insert on public.food_logs
for each row execute function public.trg_record_scan_event();

-- 3) New monthly count based on scan_events (consumable)
create or replace function public.get_monthly_scan_count_consumed(p_month timestamptz default now())
returns integer
language sql
stable
as $$
  select count(*)::int
  from public.scan_events
  where user_id = auth.uid()
    and occurred_at >= date_trunc('month', p_month)
    and occurred_at <  (date_trunc('month', p_month) + interval '1 month');
$$;

grant execute on function public.get_monthly_scan_count_consumed(timestamptz) to authenticated;

-- Optional: keep old function for backwards compatibility

commit;
