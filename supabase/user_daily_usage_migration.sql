-- Migration: user_daily_usage
-- Tracks per-user document upload counts per day for rate limiting

create table if not exists user_daily_usage (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  date date not null,
  count int not null default 0,
  constraint user_daily_usage_user_date unique (user_id, date)
);

create index if not exists user_daily_usage_user_id_date_idx
  on user_daily_usage (user_id, date);

create or replace function increment_daily_usage(uid text, d date)
returns void
language plpgsql
as $$
begin
  insert into user_daily_usage (user_id, date, count)
    values (uid, d, 1)
  on conflict (user_id, date)
    do update set count = user_daily_usage.count + 1;
end;
$$;
