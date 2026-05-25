alter table public.recipes
add column if not exists category text,
add column if not exists status text default 'A tester',
add column if not exists notes text,
add column if not exists protein numeric,
add column if not exists carbs numeric,
add column if not exists fat numeric,
add column if not exists fiber numeric,
add column if not exists nutrition_summary text;
