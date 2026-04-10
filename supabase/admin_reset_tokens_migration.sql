-- ============================================================
-- Migration: admin token reset controls
-- ============================================================

-- Teachers should not update their own daily token rows.
drop policy if exists "udt: own rows update" on public.user_daily_tokens;

-- Admins may update token rows (manual correction / emergency support).
create policy "udt: admin update"
  on public.user_daily_tokens for update
  using (public.is_admin_user())
  with check (public.is_admin_user());

-- Admin RPC: reset one teacher's token usage for today.
create or replace function public.admin_reset_tokens(target_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin_user(auth.uid()) then
    raise exception 'Forbidden';
  end if;

  update public.user_daily_tokens
  set tokens_used = 0,
      updated_at = now()
  where user_id = target_user
    and date = current_date;
end;
$$;

revoke all on function public.admin_reset_tokens(uuid) from public;
grant execute on function public.admin_reset_tokens(uuid) to authenticated;
