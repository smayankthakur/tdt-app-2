-- The Divine Tarot mobile app — tables in the Supabase project "Tdt-Ginni".
-- Same login as Ginni Ki Baatein (auth.users). Additive only: no existing Ginni table is changed.
-- Already applied to the live project on 13 Oct 2026 (migrations "divine_tarot_app_tables" and
-- "divine_tarot_app_no_anonymous_writes"). Kept here as the record / for a fresh project.

create table public.app_profiles (
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

create table public.app_readings (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null check (length(id) <= 64),
  created_at timestamptz not null default now(),
  data jsonb not null check (pg_column_size(data) <= 20000),
  primary key (user_id, id)
);
create index app_readings_user_created on public.app_readings (user_id, created_at desc);

-- Purchases made in the app (Ginni Unlimited also extends ginni_access.premium_until). Written only by edge functions.
create table public.app_entitlements (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

-- One row per paid Razorpay order: replay guard + sales record. Written only by edge functions.
create table public.app_payments (
  order_id text primary key,
  user_id uuid references auth.users(id) on delete set null,
  product_id text not null,
  amount_paise integer not null,
  payment_id text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.app_profiles enable row level security;
alter table public.app_readings enable row level security;
alter table public.app_entitlements enable row level security;
alter table public.app_payments enable row level security;

create policy "own profile read" on public.app_profiles for select to authenticated using ((select auth.uid()) = user_id);
create policy "own profile insert" on public.app_profiles for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own profile update" on public.app_profiles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own profile delete" on public.app_profiles for delete to authenticated using ((select auth.uid()) = user_id);

create policy "own readings read" on public.app_readings for select to authenticated using ((select auth.uid()) = user_id);
create policy "own readings insert" on public.app_readings for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own readings update" on public.app_readings for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own readings delete" on public.app_readings for delete to authenticated using ((select auth.uid()) = user_id);

create policy "own entitlements read" on public.app_entitlements for select to authenticated using ((select auth.uid()) = user_id or public.has_role((select auth.uid()), 'admin'));
create policy "admins read app payments" on public.app_payments for select to authenticated using (public.has_role((select auth.uid()), 'admin'));

-- Ginni's website signs visitors in anonymously; only real accounts may store app data.
create policy "real accounts only" on public.app_profiles as restrictive for all to authenticated
  using (coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false)
  with check (coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false);
create policy "real accounts only" on public.app_readings as restrictive for all to authenticated
  using (coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false)
  with check (coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false);

-- ── 13 Oct 2026 (migration "divine_tarot_app_lifetime_free_readings") ──
-- 3 free readings per account, for life, then Ginni Unlimited. (Ginni on the website keeps its own daily rules; premium is shared.)
create table public.app_reading_usage (
  user_id uuid primary key references auth.users(id) on delete cascade,
  free_used integer not null default 0 check (free_used >= 0),
  total_readings integer not null default 0 check (total_readings >= 0),
  updated_at timestamptz not null default now()
);
alter table public.app_reading_usage enable row level security;
create policy "own usage read" on public.app_reading_usage for select to authenticated
  using ((select auth.uid()) = user_id or public.has_role((select auth.uid()), 'admin'));

create or replace function public.app_use_reading()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  is_anon boolean := coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false);
  free_limit constant integer := 3;
  prem timestamptz;
  used integer;
begin
  if uid is null or is_anon then
    raise exception 'auth_required' using errcode = '28000';
  end if;

  select greatest(
    (select g.premium_until from public.ginni_access g where g.user_id = uid),
    (select e.expires_at from public.app_entitlements e where e.user_id = uid and e.product_id = 'ginni_unlimited_30d')
  ) into prem;

  insert into public.app_reading_usage (user_id) values (uid) on conflict (user_id) do nothing;

  if prem is not null and prem > now() then
    update public.app_reading_usage set total_readings = total_readings + 1, updated_at = now() where user_id = uid;
    return jsonb_build_object('allowed', true, 'premium', true, 'premiumUntil', (extract(epoch from prem) * 1000)::bigint, 'remaining', null);
  end if;

  update public.app_reading_usage
     set free_used = free_used + 1, total_readings = total_readings + 1, updated_at = now()
   where user_id = uid and free_used < free_limit
  returning free_used into used;

  if used is null then
    return jsonb_build_object('allowed', false, 'premium', false, 'remaining', 0);
  end if;
  return jsonb_build_object('allowed', true, 'premium', false, 'remaining', free_limit - used);
end;
$$;

revoke all on function public.app_use_reading() from public, anon;
grant execute on function public.app_use_reading() to authenticated;
