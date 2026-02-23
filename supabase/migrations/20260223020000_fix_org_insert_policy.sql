-- ============================================================
-- Fix: ensure INSERT policy exists on organizations table
-- Error: "new row violates row-level security policy"
-- ============================================================

-- Recreate INSERT policy (drop first to be idempotent)
drop policy if exists "Authenticated users can create organizations" on public.organizations;

create policy "Authenticated users can create organizations"
  on public.organizations for insert
  with check (auth.uid() is not null);
