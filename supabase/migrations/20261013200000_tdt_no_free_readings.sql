-- The Divine Tarot app: no free Ginni readings in the app (13 Oct 2026).
-- Readings need Ginni Unlimited (bought in the app) or Ginni Premium from the website.
-- The website's own free readings ("User"."readingsUsed", 3 + bonus) are untouched — the app no longer uses them.

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
  prem timestamptz;
begin
  if uid is null then raise exception 'auth_required' using errcode = '28000'; end if;
  select a.ginni_user_id into gid from public.tdt_accounts a where a.auth_user_id = uid;
  if gid is null then raise exception 'auth_required' using errcode = '28000'; end if;
  prem := public.tdt_premium_until(gid, uid);
  return jsonb_build_object(
    'used', 0,
    'limit', 0,
    'premiumUntil', case when prem is null then 0 else (extract(epoch from prem) * 1000)::bigint end
  );
end;
$$;

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
begin
  if uid is null then raise exception 'auth_required' using errcode = '28000'; end if;
  select a.ginni_user_id into gid from public.tdt_accounts a where a.auth_user_id = uid;
  if gid is null then raise exception 'auth_required' using errcode = '28000'; end if;
  prem := public.tdt_premium_until(gid, uid);
  if prem is not null and prem > now() then
    return jsonb_build_object('allowed', true, 'premium', true, 'premiumUntil', (extract(epoch from prem) * 1000)::bigint, 'remaining', null);
  end if;
  return jsonb_build_object('allowed', false, 'premium', false, 'remaining', 0);
end;
$$;

revoke all on function public.tdt_reading_status() from public, anon;
revoke all on function public.tdt_use_reading() from public, anon;
grant execute on function public.tdt_reading_status() to authenticated;
grant execute on function public.tdt_use_reading() to authenticated;
