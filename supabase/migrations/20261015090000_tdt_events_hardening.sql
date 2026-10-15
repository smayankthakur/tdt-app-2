-- Review fixes for 20261014120000 (run after it). Safe to re-run.

-- 1. Funnel events are anonymous: no account id is stored, only the random install id.
update public.tdt_events set user_id = null where user_id is not null;

-- 2. Flood guard on the server's own clock (the phone's time can be up to 3 days back), with an index,
--    plus a global cap so random install ids can't flood the table.
alter table public.tdt_events add column if not exists received_at timestamptz not null default now();
create index if not exists tdt_events_install_received on public.tdt_events (install_id, received_at desc);
create index if not exists tdt_events_received on public.tdt_events (received_at desc);

create or replace function public.tdt_log_events(p_install_id text, p_platform text, p_app_version text, p_events jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  e jsonb;
  n integer := 0;
  phone_at timestamptz;
  allowed text[] := array[
    'install', 'app_open', 'signup', 'login', 'reading_start', 'paywall_view', 'checkout_start',
    'payment_success', 'payment_failed', 'reading_done', 'horoscope_view', 'panchang_view',
    'share', 'invite_share', 'booking_start', 'booking_paid', 'course_view'
  ];
begin
  if p_install_id is null or length(p_install_id) not between 8 and 64 or jsonb_typeof(p_events) <> 'array' then
    return 0;
  end if;
  if (select count(*) from public.tdt_events where install_id = p_install_id and received_at > now() - interval '1 day') > 300 then
    return 0;
  end if;
  if (select count(*) from public.tdt_events where received_at > now() - interval '1 hour') > 50000 then
    return 0;
  end if;
  for e in select * from jsonb_array_elements(p_events) limit 50 loop
    continue when not ((e->>'event') = any (allowed));
    begin
      phone_at := (e->>'at')::timestamptz;
    exception when others then
      phone_at := null;
    end;
    insert into public.tdt_events (install_id, user_id, event, props, platform, app_version, at)
    values (
      p_install_id,
      null,
      e->>'event',
      case when jsonb_typeof(e->'props') = 'object' and pg_column_size(e->'props') <= 1000 then e->'props' else '{}'::jsonb end,
      left(coalesce(p_platform, ''), 16),
      left(coalesce(p_app_version, ''), 32),
      greatest(least(coalesce(phone_at, now()), now()), now() - interval '3 days')
    );
    n := n + 1;
  end loop;
  return n;
end;
$$;
revoke all on function public.tdt_log_events(text, text, text, jsonb) from public;
grant execute on function public.tdt_log_events(text, text, text, jsonb) to anon, authenticated;

-- 3. Owners are fixed website accounts (by id), not "whoever registers this email".
drop function if exists public.tdt_funnel_report(integer);
drop function if exists public.tdt_is_admin();
drop table if exists public.tdt_admins;
create table public.tdt_admins (ginni_user_id text primary key references public."User"(id) on delete cascade);
alter table public.tdt_admins enable row level security;
-- existing accounts only; add more later with:  insert into tdt_admins select id from "User" where email = '…';
insert into public.tdt_admins (ginni_user_id)
  select id from public."User" where lower(email) in ('smayankthakur25@gmail.com', 'thedivinetarot111@gmail.com')
  on conflict do nothing;

create or replace function public.tdt_is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.tdt_accounts a
      join public.tdt_admins ad on ad.ginni_user_id = a.ginni_user_id
     where a.auth_user_id = auth.uid()
  );
$$;

-- "paid" and "revenue" come from real payments (tdt_payments), not from what phones report.
create or replace function public.tdt_funnel_report(p_days integer default 30)
returns table (day date, installs bigint, opened bigint, logged_in bigint, tried_reading bigint, saw_paywall bigint,
               started_checkout bigint, paid bigint, got_reading bigint, payments bigint, revenue_rupees bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  since date := (now() at time zone 'Asia/Kolkata')::date - least(greatest(p_days, 1), 366);
begin
  if not public.tdt_is_admin() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  return query
    with days as (
      select f.day from public.tdt_funnel_daily f where f.day > since
      union
      select (p.created_at at time zone 'Asia/Kolkata')::date from public.tdt_payments p
       where (p.created_at at time zone 'Asia/Kolkata')::date > since
    ),
    pay as (
      select (p.created_at at time zone 'Asia/Kolkata')::date as day, count(*) as n, sum(p.amount_paise) / 100 as rupees
        from public.tdt_payments p
       where (p.created_at at time zone 'Asia/Kolkata')::date > since
       group by 1
    )
    select d.day,
           coalesce(f.installs, 0), coalesce(f.opened, 0), coalesce(f.logged_in, 0), coalesce(f.tried_reading, 0),
           coalesce(f.saw_paywall, 0), coalesce(f.started_checkout, 0), coalesce(f.paid, 0), coalesce(f.got_reading, 0),
           coalesce(pay.n, 0), coalesce(pay.rupees, 0)::bigint
      from days d
      left join public.tdt_funnel_daily f on f.day = d.day
      left join pay on pay.day = d.day
     order by d.day desc;
end;
$$;

revoke all on function public.tdt_is_admin() from public, anon;
revoke all on function public.tdt_funnel_report(integer) from public, anon;
grant execute on function public.tdt_is_admin() to authenticated;
grant execute on function public.tdt_funnel_report(integer) to authenticated;

-- 4. Invite codes: match the website's codes whatever their case; at most 5 tries per account.
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
  if (select count(*) from public.tdt_login_attempts where key = 'invite:' || gid) >= 5 then
    return 'too_many';
  end if;
  insert into public.tdt_login_attempts (key) values ('invite:' || gid);
  select id into inviter from public."User"
   where upper("referralCode") = upper(trim(coalesce(p_code, ''))) and id <> gid
   limit 1;
  if inviter is null then
    return 'unknown_code';
  end if;
  update public."User" set "referredByUserId" = inviter where id = gid and "referredByUserId" is null;
  return 'ok';
end;
$$;
revoke all on function public.tdt_set_referrer(text) from public, anon;
grant execute on function public.tdt_set_referrer(text) to authenticated;
