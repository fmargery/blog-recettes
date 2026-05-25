drop policy if exists "Authenticated users can create recipes" on public.recipes;
drop policy if exists "Owners can update recipes" on public.recipes;
drop policy if exists "Owners can delete recipes" on public.recipes;

create policy "Anyone can create recipes temporarily"
on public.recipes
for insert
with check (true);

create policy "Anyone can update recipes temporarily"
on public.recipes
for update
using (true)
with check (true);

create policy "Anyone can delete recipes temporarily"
on public.recipes
for delete
using (true);
