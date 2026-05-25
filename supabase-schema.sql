create extension if not exists "pgcrypto";

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  title text not null,
  source text,
  description text,
  prep_time text,
  cook_time text,
  servings text,
  difficulty text,
  category text,
  status text default 'A tester',
  ingredients text[] not null default '{}',
  steps text[] not null default '{}',
  tags text[] not null default '{}',
  notes text,
  raw_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.recipes enable row level security;

create policy "Public can read recipes"
on public.recipes
for select
using (true);

create policy "Authenticated users can create recipes"
on public.recipes
for insert
with check (true);

create policy "Owners can update recipes"
on public.recipes
for update
using (true)
with check (true);

create policy "Owners can delete recipes"
on public.recipes
for delete
using (true);
