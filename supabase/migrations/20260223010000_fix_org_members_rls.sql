-- ============================================================
-- Fix: infinite recursion in organization_members RLS policies
--
-- Problem: policies on organization_members do a sub-SELECT on
-- organization_members itself, which triggers the same policy → loop.
--
-- Solution:
-- 1. SELECT policy uses simple auth.uid() = user_id (see own rows)
-- 2. A SECURITY DEFINER function checks admin status (bypasses RLS)
-- 3. INSERT/UPDATE/DELETE policies use that function
-- ============================================================

-- Drop all existing policies on organization_members
drop policy if exists "Org members can view members" on public.organization_members;
drop policy if exists "Admins can manage members" on public.organization_members;
drop policy if exists "Admins can update members" on public.organization_members;
drop policy if exists "Admins can delete members" on public.organization_members;

-- Helper function: check if a user is admin of an org (bypasses RLS)
create or replace function public.is_org_admin(org_id uuid, uid uuid)
returns boolean as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = org_id
    and user_id = uid
    and role = 'admin'
  );
$$ language sql security definer stable;

-- Helper function: check if a user is member of an org (bypasses RLS)
create or replace function public.is_org_member(org_id uuid, uid uuid)
returns boolean as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = org_id
    and user_id = uid
  );
$$ language sql security definer stable;

-- SELECT: users can see all members of orgs they belong to
-- Uses the SECURITY DEFINER function to avoid recursion
create policy "Members can view org members"
  on public.organization_members for select
  using (
    public.is_org_member(organization_id, auth.uid())
  );

-- INSERT: admins can add members, OR user can self-insert as admin (org creation)
create policy "Admins can add members"
  on public.organization_members for insert
  with check (
    public.is_org_admin(organization_id, auth.uid())
    or (user_id = auth.uid() and role = 'admin')
  );

-- UPDATE: only admins
create policy "Admins can update members"
  on public.organization_members for update
  using (
    public.is_org_admin(organization_id, auth.uid())
  );

-- DELETE: only admins
create policy "Admins can delete members"
  on public.organization_members for delete
  using (
    public.is_org_admin(organization_id, auth.uid())
  );

-- Also fix organization policies that reference organization_members
drop policy if exists "Org members can view organization" on public.organizations;
drop policy if exists "Admins can update organization" on public.organizations;

create policy "Org members can view organization"
  on public.organizations for select
  using (
    public.is_org_member(id, auth.uid())
  );

create policy "Admins can update organization"
  on public.organizations for update
  using (
    public.is_org_admin(id, auth.uid())
  );
