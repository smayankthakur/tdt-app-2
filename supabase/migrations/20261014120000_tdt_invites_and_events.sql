-- The Divine Tarot app: invite codes and funnel events (project ginni2).
-- Run once in Dashboard → SQL Editor. Safe to re-run (create or replace / if not exists).

-- ── Invites ────────────────────────────────────────────────────────────────────
-- The invite code is the website's own "User"."referralCode". The app shows it and records who invited
-- a new account in "User"."referredByUserId" (the website's own column). The app gives no reward for it.

-- The logged-in user's own invite code.
create or replace function public.tdt_my_referral_code()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select u."referralCode"
    from public.tdt_accounts a
    join public."User" u on u.id = a.ginni_user_id
   where a.auth_user_id = auth.uid();
$$;

-- Records the inviter for the logged-in user's own account: only once, only within 2 days of the
-- account being created, never yourself. Returns 'ok', 'unknown_code', 'already_set' or 'too_late'.
create or replace function public.tdt_set_referrer(p_code text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  gid text;
  created timestamp;
  current_ref text;
  inviter text;
begin
  select u.id, u."createdAt", u."referredByUserId" into gid, created, current_ref
    from public.tdt_accounts a
    join public."User" u on u.id = a.ginni_user_id
   where a.auth_user_id = auth.uid();
  if gid is null then
    raise exception 'auth_required' using errcode = '28000';
  end if;
  if current_ref is not null then
    return 'already_set';
  end if;
  if created is not null and created < (now() at time zone 'UTC') - interval '2 days' then
    return 'too_late';
  end if;
  select id into inviter from public."User" where "referralCode" = upper(trim(coalesce(p_code, ''))) and id <> gid;
  if inviter is null then
    return 'unknown_code';
  end if;
  update public."User" set "referredByUserId" = inviter where id = gid and "referredByUserId" is null;
  return 'ok';
end;
$$;

revoke all on function public.tdt_my_referral_code() from public, anon;
revoke all on function public.tdt_set_referrer(text) from public, anon;
grant execute on function public.tdt_my_referral_code() to authenticated;
grant execute on function public.tdt_set_referrer(text) to authenticated;

-- ── Funnel events ──────────────────────────────────────────────────────────────
-- Sent by the app only while "Share anonymous usage data" is on (Profile → Privacy).
-- No questions, readings or profile details: just the step name, a random install id and a few labels.
create table if not exists public.tdt_events (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  install_id text not null check (length(install_id) between 8 and 64),
  user_id uuid,
  event text not null,
  props jsonb not null default '{}'::jsonb check (pg_column_size(props) <= 1000),
  platform text not null default '' check (length(platform) <= 16),
  app_version text not null default '' check (length(app_version) <= 32)
);
-- deleting an account keeps its funnel steps only as anonymous rows
do $$ begin
  alter table public.tdt_events add constraint tdt_events_user_fk foreign key (user_id) references auth.users(id) on delete set null;
exception when duplicate_object then null;
end $$;
create index if not exists tdt_events_at on public.tdt_events (at desc);
create index if not exists tdt_events_event_at on public.tdt_events (event, at desc);
alter table public.tdt_events enable row level security; -- no policies: only the function below writes, only the dashboard reads

create or replace function public.tdt_log_events(p_install_id text, p_platform text, p_app_version text, p_events jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  e jsonb;
  n integer := 0;
  allowed text[] := array[
    'install', 'app_open', 'signup', 'login', 'reading_start', 'paywall_view', 'checkout_start',
    'payment_success', 'payment_failed', 'reading_done', 'horoscope_view', 'panchang_view',
    'share', 'invite_share', 'booking_start', 'booking_paid', 'course_view'
  ];
begin
  if p_install_id is null or length(p_install_id) not between 8 and 64 then
    return 0;
  end if;
  if jsonb_typeof(p_events) <> 'array' then
    return 0;
  end if;
  -- simple flood guard: at most 300 events per install per day
  if (select count(*) from public.tdt_events where install_id = p_install_id and at > now() - interval '1 day') > 300 then
    return 0;
  end if;
  for e in select * from jsonb_array_elements(p_events) limit 50 loop
    if (e->>'event') = any (allowed) then
      insert into public.tdt_events (install_id, user_id, event, props, platform, app_version, at)
      values (
        p_install_id,
        auth.uid(),
        e->>'event',
        case when jsonb_typeof(e->'props') = 'object' and pg_column_size(e->'props') <= 1000 then e->'props' else '{}'::jsonb end,
        left(coalesce(p_platform, ''), 16),
        left(coalesce(p_app_version, ''), 32),
        -- the phone's time, but never in the future or more than 3 days back
        greatest(least(coalesce((e->>'at')::timestamptz, now()), now()), now() - interval '3 days')
      );
      n := n + 1;
    end if;
  end loop;
  return n;
exception when others then
  return n;
end;
$$;

revoke all on function public.tdt_log_events(text, text, text, jsonb) from public;
grant execute on function public.tdt_log_events(text, text, text, jsonb) to anon, authenticated;

-- Funnel by day: how many installs reached each step (look at it in SQL Editor:  select * from tdt_funnel_daily;)
create or replace view public.tdt_funnel_daily
with (security_invoker = true) as
select
  date_trunc('day', at at time zone 'Asia/Kolkata')::date as day,
  count(distinct install_id) filter (where event = 'install') as installs,
  count(distinct install_id) filter (where event = 'app_open') as opened,
  count(distinct install_id) filter (where event in ('signup', 'login')) as logged_in,
  count(distinct install_id) filter (where event = 'reading_start') as tried_reading,
  count(distinct install_id) filter (where event = 'paywall_view') as saw_paywall,
  count(distinct install_id) filter (where event = 'checkout_start') as started_checkout,
  count(distinct install_id) filter (where event = 'payment_success') as paid,
  count(distinct install_id) filter (where event = 'reading_done') as got_reading
from public.tdt_events
group by 1
order by 1 desc;

revoke all on public.tdt_funnel_daily from public, anon, authenticated;

-- ── Business numbers for the owners, inside the app (Profile → Business numbers) ──────────
-- Only accounts whose email is in tdt_admins can read the funnel; everyone else gets an error.
create table if not exists public.tdt_admins (email text primary key);
alter table public.tdt_admins enable row level security; -- no policies: read only by the functions below
insert into public.tdt_admins (email) values ('smayankthakur25@gmail.com'), ('thedivinetarot111@gmail.com') on conflict do nothing;

create or replace function public.tdt_is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.tdt_accounts a
      join public."User" u on u.id = a.ginni_user_id
      join public.tdt_admins ad on ad.email = lower(u.email)
     where a.auth_user_id = auth.uid()
  );
$$;

create or replace function public.tdt_funnel_report(p_days integer default 30)
returns table (day date, installs bigint, opened bigint, logged_in bigint, tried_reading bigint, saw_paywall bigint,
               started_checkout bigint, paid bigint, got_reading bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.tdt_is_admin() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  return query
    select f.day, f.installs, f.opened, f.logged_in, f.tried_reading, f.saw_paywall, f.started_checkout, f.paid, f.got_reading
      from public.tdt_funnel_daily f
     where f.day > (now() at time zone 'Asia/Kolkata')::date - least(greatest(p_days, 1), 366)
     order by f.day desc;
end;
$$;

revoke all on function public.tdt_is_admin() from public, anon;
revoke all on function public.tdt_funnel_report(integer) from public, anon;
grant execute on function public.tdt_is_admin() to authenticated;
grant execute on function public.tdt_funnel_report(integer) to authenticated;
