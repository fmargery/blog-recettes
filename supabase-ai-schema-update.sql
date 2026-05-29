alter table public.recipes
add column if not exists category text,
add column if not exists status text default 'A tester',
add column if not exists notes text;
