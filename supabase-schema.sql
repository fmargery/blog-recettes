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
  ingredients text[] not null default '{}',
  steps text[] not null default '{}',
  tags text[] not null default '{}',
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
to authenticated
with check (auth.uid() = owner_id);

create policy "Owners can update recipes"
on public.recipes
for update
to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy "Owners can delete recipes"
on public.recipes
for delete
to authenticated
using (auth.uid() = owner_id);
