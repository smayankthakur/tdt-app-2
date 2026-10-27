-- Change password from the app (tdt-auth action "change_password"). The password belongs to the Ginni website
-- account ("User"."passwordHash", bcrypt — the same format the website uses), so the new one works on the website too.
-- Only the service role (the tdt-auth function, after checking the current password) can call it.
create or replace function public.tdt_set_password(p_gid text, p_password text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if length(coalesce(p_password, '')) < 8 or length(p_password) > 200 then
    raise exception 'weak_password';
  end if;
  update public."User"
     set "passwordHash" = extensions.crypt(p_password, extensions.gen_salt('bf', 10))
   where id = p_gid;
  if not found then
    raise exception 'account_missing';
  end if;
end;
$$;
revoke all on function public.tdt_set_password(text, text) from public, anon, authenticated;
grant execute on function public.tdt_set_password(text, text) to service_role;
