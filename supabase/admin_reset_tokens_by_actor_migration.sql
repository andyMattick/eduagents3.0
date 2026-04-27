-- ============================================================
-- Migration: admin token reset by actor_key (replaces UUID-only version)
-- Allows resetting IP-tracked rows that have no user_id.
-- ============================================================

create or replace function public.admin_reset_tokens_by_actor(p_actor_key text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin_user() then
    raise exception 'Forbidden';
  end if;

  update public.user_daily_tokens
  set tokens_used = 0,
      updated_at = now()
  where actor_key = p_actor_key
    and date = current_date;
end;
$$;

revoke all on function public.admin_reset_tokens_by_actor(text) from public;
grant execute on function public.admin_reset_tokens_by_actor(text) to authenticated;
