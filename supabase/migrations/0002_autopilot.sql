-- Portion Autopilot: weight history and each pet's learned calorie factor.

alter table public.pets
  add column calorie_factor numeric(4, 3) not null default 1 check (calorie_factor between 0.5 and 1.6),
  add column plan_reviewed_at timestamptz;

create table public.weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  pet_id uuid not null references public.pets (id) on delete cascade,
  date date not null,
  weight_kg numeric(5, 2) not null check (weight_kg > 0 and weight_kg < 150),
  created_at timestamptz not null default now(),
  unique (pet_id, date)
);

create index weight_logs_pet_idx on public.weight_logs (pet_id, date);

alter table public.weight_logs enable row level security;

create policy weight_logs_owner on public.weight_logs for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and public.owns_pet(pet_id));
