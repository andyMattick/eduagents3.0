create table if not exists public.user_daily_uploads (
  user_id uuid not null,
  date date not null,
  pages_uploaded integer not null default 0,
  primary key (user_id, date)
);

create index if not exists user_daily_uploads_date_idx
  on public.user_daily_uploads (date);

do $$
declare
  upload_date_column text;
  upload_pages_column text;
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'user_daily_usage'
  ) then
    select case
      when exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'user_daily_usage'
          and column_name = 'usage_date'
      ) then 'usage_date'
      else 'date'
    end
    into upload_date_column;

    select case
      when exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'user_daily_usage'
          and column_name = 'pages_uploaded'
      ) then 'pages_uploaded'
      else 'count'
    end
    into upload_pages_column;

    execute format(
      'insert into public.user_daily_uploads (user_id, date, pages_uploaded)
       select legacy.user_id::uuid,
              legacy.%1$I as date,
              sum(coalesce(legacy.%2$I, 0)) as pages_uploaded
       from public.user_daily_usage legacy
       where legacy.user_id is not null
         and legacy.user_id::text ~* %3$L
         and legacy.%1$I is not null
       group by legacy.user_id::uuid, legacy.%1$I
       on conflict (user_id, date)
       do update set pages_uploaded = excluded.pages_uploaded',
      upload_date_column,
      upload_pages_column,
      '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    );
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'user_daily_simulations'
  ) and not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'user_daily_simulations_legacy'
  ) then
    alter table public.user_daily_simulations rename to user_daily_simulations_legacy;
  end if;
end $$;

create table if not exists public.user_daily_simulations (
  user_id uuid not null,
  date date not null,
  simulations_run integer not null default 0,
  primary key (user_id, date)
);

create index if not exists user_daily_simulations_date_idx
  on public.user_daily_simulations (date);

do $$
declare
  simulation_date_column text;
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'user_daily_simulations_legacy'
  ) then
    select case
      when exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'user_daily_simulations_legacy'
          and column_name = 'usage_date'
      ) then 'usage_date'
      else 'date'
    end
    into simulation_date_column;

    execute format(
      'insert into public.user_daily_simulations (user_id, date, simulations_run)
       select legacy.user_id,
              legacy.%1$I as date,
              sum(coalesce(legacy.simulations_run, 0)) as simulations_run
       from public.user_daily_simulations_legacy legacy
       where legacy.user_id is not null
         and legacy.%1$I is not null
       group by legacy.user_id, legacy.%1$I
       on conflict (user_id, date)
       do update set simulations_run = excluded.simulations_run',
      simulation_date_column
    );
  end if;
end $$;

create table if not exists public.simulation_reviews (
  id uuid primary key default gen_random_uuid(),
  simulation_id uuid not null references public.simulation_runs(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  document_id uuid not null,
  user_id uuid not null,
  severity text not null check (severity in ('low', 'medium', 'high')),
  message text not null,
  simulation_snapshot jsonb,
  created_at timestamptz not null default now(),
  resolved boolean not null default false,
  resolved_at timestamptz
);

create index if not exists simulation_reviews_created_at_idx
  on public.simulation_reviews (created_at desc);

create index if not exists simulation_reviews_severity_idx
  on public.simulation_reviews (severity, created_at desc);

create index if not exists simulation_reviews_class_id_idx
  on public.simulation_reviews (class_id, created_at desc);

create index if not exists simulation_reviews_user_id_idx
  on public.simulation_reviews (user_id, created_at desc);