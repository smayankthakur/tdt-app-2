-- The Divine Tarot mobile app — on the Ginni website's Supabase project (ginni2, ref hnaggjopklxcgzxsyswc).
-- Accounts = the website's own "User" table (same email + password as reading.thedivinetarotonline.com).
-- The app signs in with Supabase Auth; tdt_accounts links each Auth user to its "User" row.
-- Everything the app adds is prefixed tdt_. The website's tables are only read/updated through the functions below.

-- ── Links ──────────────────────────────────────────────────────────────────────
create table public.tdt_accounts (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  ginni_user_id text not null unique references public."User"(id) on update cascade on delete cascade,
  created_at timestamptz not null default now()
);

-- Login / sign-up attempts, for rate limiting (written by the tdt-auth function only)
create table public.tdt_login_attempts (
  id bigint generated always as identity primary key,
  key text not null,
  at timestamptz not null default now()
);
create index tdt_login_attempts_key_at on public.tdt_login_attempts (key, at desc);

-- ── App data ───────────────────────────────────────────────────────────────────
create table public.tdt_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '' check (length(name) <= 120),
  gender text not null default '' check (gender in ('', 'male', 'female', 'other')),
  birthplace text not null default '' check (length(birthplace) <= 200),
  dob text not null default '' check (length(dob) <= 10),
  tob text not null default '' check (length(tob) <= 5),
  marital text not null default '' check (marital in ('', 'single', 'married', 'divorced', 'widowed')),
  occupation text not null default '' check (length(occupation) <= 120),
  photo text not null default '' check (length(photo) <= 400000),
  updated_at timestamptz not null default now()
);

create table public.tdt_readings (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null check (length(id) <= 64),
  created_at timestamptz not null default now(),
  data jsonb not null check (pg_column_size(data) <= 20000),
  primary key (user_id, id)
);
create index tdt_readings_user_created on public.tdt_readings (user_id, created_at desc);

-- Purchases made in the app (written by the tdt-payments / tdt-razorpay-webhook functions only)
create table public.tdt_entitlements (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

-- One row per paid Razorpay order: sales record + "one payment, one unlock" guard
create table public.tdt_payments (
  order_id text primary key,
  user_id uuid references auth.users(id) on delete set null,
  product_id text not null,
  amount_paise integer not null,
  payment_id text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.tdt_accounts enable row level security;
alter table public.tdt_login_attempts enable row level security;
alter table public.tdt_profiles enable row level security;
alter table public.tdt_readings enable row level security;
alter table public.tdt_entitlements enable row level security;
alter table public.tdt_payments enable row level security;

create policy "own link read" on public.tdt_accounts for select to authenticated using ((select auth.uid()) = auth_user_id);

create policy "own profile read" on public.tdt_profiles for select to authenticated using ((select auth.uid()) = user_id);
create policy "own profile insert" on public.tdt_profiles for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own profile update" on public.tdt_profiles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own profile delete" on public.tdt_profiles for delete to authenticated using ((select auth.uid()) = user_id);

create policy "own readings read" on public.tdt_readings for select to authenticated using ((select auth.uid()) = user_id);
create policy "own readings insert" on public.tdt_readings for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own readings update" on public.tdt_readings for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own readings delete" on public.tdt_readings for delete to authenticated using ((select auth.uid()) = user_id);

create policy "own entitlements read" on public.tdt_entitlements for select to authenticated using ((select auth.uid()) = user_id);
-- tdt_payments / tdt_login_attempts: no policies → only the server (service role) can read or write them.

-- ── Website account checks (server only) ───────────────────────────────────────
-- Checks an email + password against the website's "User" table (bcrypt, same as the website).
create or replace function public.tdt_check_password(p_email text, p_password text)
returns table (id text, email text, name text)
language sql
stable
security definer
set search_path = ''
as $$
  select u.id, u.email, u.name
  from public."User" u
  where u.email = lower(trim(p_email))
    and u."passwordHash" = extensions.crypt(p_password, u."passwordHash");
$$;

-- Creates a website account (so an account made in the app also works on reading.thedivinetarotonline.com).
create or replace function public.tdt_create_user(p_email text, p_password text, p_name text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id text := gen_random_uuid()::text;
  code text;
begin
  if exists (select 1 from public."User" where email = lower(trim(p_email))) then
    raise exception 'already_registered' using errcode = '23505';
  end if;
  loop
    code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
    exit when not exists (select 1 from public."User" where "referralCode" = code);
  end loop;
  insert into public."User" (id, email, "passwordHash", name, "referralCode")
  values (new_id, lower(trim(p_email)), extensions.crypt(p_password, extensions.gen_salt('bf', 10)), nullif(trim(p_name), ''), code);
  return new_id;
end;
$$;

revoke all on function public.tdt_check_password(text, text) from public, anon, authenticated;
revoke all on function public.tdt_create_user(text, text, text) from public, anon, authenticated;
grant execute on function public.tdt_check_password(text, text) to service_role;
grant execute on function public.tdt_create_user(text, text, text) to service_role;

-- ── Readings: 3 free per account for life (the website's own counter), then Premium ─────────
create or replace function public.tdt_premium_until(p_gid text, p_uid uuid)
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select greatest(
    (select u."subscriptionExpires" at time zone 'UTC' from public."User" u where u.id = p_gid),
    (select u."subscriptionEndsAt" from public."User" u where u.id = p_gid),
    (select e.expires_at from public.tdt_entitlements e where e.user_id = p_uid and e.product_id = 'ginni_unlimited_30d')
  );
$$;
revoke all on function public.tdt_premium_until(text, uuid) from public, anon, authenticated;

-- Read-only: how many free readings are used, the limit, and Premium end (ms).
create or replace function public.tdt_reading_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  gid text;
  used integer;
  bonus integer;
  prem timestamptz;
begin
  if uid is null then raise exception 'auth_required' using errcode = '28000'; end if;
  select a.ginni_user_id into gid from public.tdt_accounts a where a.auth_user_id = uid;
  if gid is null then raise exception 'auth_required' using errcode = '28000'; end if;
  select u."readingsUsed", u."bonusReadings" into used, bonus from public."User" u where u.id = gid;
  prem := public.tdt_premium_until(gid, uid);
  return jsonb_build_object(
    'used', coalesce(used, 0),
    'limit', 3 + coalesce(bonus, 0),
    'premiumUntil', case when prem is null then 0 else (extract(epoch from prem) * 1000)::bigint end
  );
end;
$$;

-- Uses up one reading (when the cards are revealed). Premium = unlimited.
create or replace function public.tdt_use_reading()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  gid text;
  prem timestamptz;
  used integer;
  lim integer;
begin
  if uid is null then raise exception 'auth_required' using errcode = '28000'; end if;
  select a.ginni_user_id into gid from public.tdt_accounts a where a.auth_user_id = uid;
  if gid is null then raise exception 'auth_required' using errcode = '28000'; end if;

  prem := public.tdt_premium_until(gid, uid);
  if prem is not null and prem > now() then
    return jsonb_build_object('allowed', true, 'premium', true, 'premiumUntil', (extract(epoch from prem) * 1000)::bigint, 'remaining', null);
  end if;

  update public."User" u
     set "readingsUsed" = u."readingsUsed" + 1
   where u.id = gid and u."readingsUsed" < 3 + u."bonusReadings"
  returning u."readingsUsed", 3 + u."bonusReadings" into used, lim;

  if used is null then
    return jsonb_build_object('allowed', false, 'premium', false, 'remaining', 0);
  end if;
  return jsonb_build_object('allowed', true, 'premium', false, 'remaining', lim - used);
end;
$$;

revoke all on function public.tdt_reading_status() from public, anon;
revoke all on function public.tdt_use_reading() from public, anon;
grant execute on function public.tdt_reading_status() to authenticated;
grant execute on function public.tdt_use_reading() to authenticated;

grant execute on function public.tdt_premium_until(text, uuid) to service_role;
