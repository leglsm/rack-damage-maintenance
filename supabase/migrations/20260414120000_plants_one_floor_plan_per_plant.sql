-- Plants + one master floor plan per plant.
--
-- Run this ENTIRE file in Supabase → SQL Editor first (creates public.plants).
-- Error "relation public.plants does not exist" = something referenced plants
-- before this script (e.g. an older enable-rls that altered plants first).
--
-- Run in Supabase SQL Editor, or via `supabase db push` if you use the CLI.
--
-- Legacy installs: if you already have MORE than one row in floor_plans, all
-- were tied to Greer below — fix plant_id manually BEFORE the unique index, or
-- delete extra plans so each plant has at most one floor_plans row.

-- 1) plants
create table if not exists public.plants (
  id uuid not null default gen_random_uuid (),
  name text not null,
  created_at timestamp with time zone null default now(),
  constraint plants_pkey primary key (id),
  constraint plants_name_key unique (name)
) tablespace pg_default;

-- 2) seed (idempotent-ish: skip if names exist)
insert into public.plants (name)
select v.name
from (
  values
    ('Greer Plant'),
    ('Duncan Plant'),
    ('Anderson Plant')
) as v (name)
where not exists (
  select 1 from public.plants p where p.name = v.name
);

-- 3) floor_plans.plant_id (nullable until backfill)
alter table public.floor_plans
  add column if not exists plant_id uuid null;

alter table public.floor_plans
  drop constraint if exists floor_plans_plant_id_fkey;

alter table public.floor_plans
  add constraint floor_plans_plant_id_fkey
  foreign key (plant_id) references public.plants (id) on delete restrict;

-- 4) backfill: existing plans → Greer Plant (adjust in SQL Editor if needed)
update public.floor_plans fp
set plant_id = p.id
from public.plants p
where fp.plant_id is null
  and p.name = 'Greer Plant';

-- 5) require plant on every floor plan
alter table public.floor_plans
  alter column plant_id set not null;

-- 6) exactly one master floor plan per plant
create unique index if not exists floor_plans_one_master_per_plant
  on public.floor_plans (plant_id);

-- 7) RLS (same permissive pattern as other tables in this project)
alter table public.plants enable row level security;

drop policy if exists "plants_all_anon_auth" on public.plants;

create policy "plants_all_anon_auth"
  on public.plants
  for all
  to anon, authenticated
  using (true)
  with check (true);
