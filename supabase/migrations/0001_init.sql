-- ANIMA schema, v1.
-- Run in the Supabase SQL editor or with `supabase db push`.
-- Every table is private to its owner through row level security.

create extension if not exists pgcrypto;

create table public.pets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 50),
  species text not null check (species in ('DOG', 'CAT')),
  breed text not null check (char_length(breed) between 1 and 80),
  date_of_birth date not null,
  sex text not null check (sex in ('MALE', 'FEMALE')),
  neutered boolean not null default true,
  weight_kg numeric(5, 2) not null check (weight_kg > 0 and weight_kg < 150),
  body_condition smallint not null check (body_condition between 1 and 9),
  activity_minutes_per_day smallint check (activity_minutes_per_day between 0 and 600),
  primary_food_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.meal_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  pet_id uuid not null references public.pets (id) on delete cascade,
  type text not null check (type in ('MEAL', 'TREAT')),
  items jsonb not null check (jsonb_typeof(items) = 'array'),
  total_calories integer not null check (total_calories between 0 and 20000),
  logged_at timestamptz not null default now()
);

create table public.care_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  pet_id uuid not null references public.pets (id) on delete cascade,
  kind text not null check (kind in ('WELLNESS_EXAM', 'VACCINATION', 'DENTAL', 'PARASITE_PREVENTION')),
  date date not null,
  note text check (char_length(note) <= 500),
  created_at timestamptz not null default now()
);

-- Foods a user entered from a label. The product is stored as the same JSON
-- shape the app's rating engine reads.
create table public.custom_foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  data jsonb not null check (jsonb_typeof(data) = 'object' and pg_column_size(data) < 16384),
  created_at timestamptz not null default now()
);

-- One Score per pet per day, for the trend line.
create table public.score_snapshots (
  pet_id uuid not null references public.pets (id) on delete cascade,
  day date not null,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  score smallint not null check (score between 0 and 999),
  factors jsonb not null,
  algorithm_version text not null,
  primary key (pet_id, day)
);

create index pets_user_idx on public.pets (user_id);
create index meal_logs_pet_idx on public.meal_logs (pet_id, logged_at desc);
create index care_events_pet_idx on public.care_events (pet_id, date desc);
create index custom_foods_user_idx on public.custom_foods (user_id);

create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger pets_touch before update on public.pets
for each row execute function public.touch_updated_at();

-- A child row must belong to a pet the same user owns.
create or replace function public.owns_pet(p uuid) returns boolean
language sql stable security invoker set search_path = '' as $$
  select exists (select 1 from public.pets where id = p and user_id = auth.uid());
$$;

alter table public.pets enable row level security;
alter table public.meal_logs enable row level security;
alter table public.care_events enable row level security;
alter table public.custom_foods enable row level security;
alter table public.score_snapshots enable row level security;

create policy pets_owner on public.pets for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy meal_logs_owner on public.meal_logs for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and public.owns_pet(pet_id));

create policy care_events_owner on public.care_events for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and public.owns_pet(pet_id));

create policy custom_foods_owner on public.custom_foods for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy score_snapshots_owner on public.score_snapshots for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and public.owns_pet(pet_id));
