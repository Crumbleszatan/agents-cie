-- ============================================================
-- Agen.cy — Epics, Organization Invites, Training Status
-- Migration: 20260224000000_epics_invites_training
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- EPICS (group related user stories)
-- ────────────────────────────────────────────────────────────
create table public.epics (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects on delete cascade not null,
  title text not null,
  description text default '',
  color text default '#6366f1',
  created_by uuid references auth.users on delete set null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index idx_epics_project on public.epics(project_id);

-- Add epic_id to user_stories
alter table public.user_stories
  add column if not exists epic_id uuid references public.epics on delete set null;

create index idx_user_stories_epic on public.user_stories(epic_id);

-- Add training_status to projects
alter table public.projects
  add column if not exists training_status text default 'not_started'
    check (training_status in ('not_started', 'in_progress', 'complete'));

-- ────────────────────────────────────────────────────────────
-- ORGANIZATION INVITES
-- ────────────────────────────────────────────────────────────
create table public.organization_invites (
  id uuid default uuid_generate_v4() primary key,
  organization_id uuid references public.organizations on delete cascade not null,
  email text not null,
  role text not null default 'member' check (role in ('admin', 'member', 'viewer')),
  token text not null unique default encode(gen_random_bytes(32), 'hex'),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired')),
  invited_by uuid references auth.users on delete set null,
  expires_at timestamptz default (now() + interval '7 days') not null,
  created_at timestamptz default now() not null,
  unique(organization_id, email)
);

create index idx_org_invites_org on public.organization_invites(organization_id);
create index idx_org_invites_email on public.organization_invites(email);
create index idx_org_invites_token on public.organization_invites(token);

-- ────────────────────────────────────────────────────────────
-- TRIGGER: Auto-accept invites on signup
-- When a user signs up, check if they have pending invites
-- and automatically add them to the organization
-- ────────────────────────────────────────────────────────────
create or replace function public.handle_invite_on_signup()
returns trigger as $$
declare
  inv record;
begin
  -- Find all pending, non-expired invites for this email
  for inv in
    select *
    from public.organization_invites
    where email = new.email
      and status = 'pending'
      and expires_at > now()
  loop
    -- Add user to the organization
    insert into public.organization_members (organization_id, user_id, role)
    values (inv.organization_id, new.id, inv.role)
    on conflict (organization_id, user_id) do nothing;

    -- Mark invite as accepted
    update public.organization_invites
    set status = 'accepted'
    where id = inv.id;
  end loop;

  return new;
end;
$$ language plpgsql security definer;

-- Attach trigger to auth.users (after the profile trigger)
create trigger on_auth_user_created_handle_invites
  after insert on auth.users
  for each row execute function public.handle_invite_on_signup();

-- ────────────────────────────────────────────────────────────
-- RLS POLICIES
-- ────────────────────────────────────────────────────────────

-- Epics: org members can read, admins/members can write
alter table public.epics enable row level security;

create policy "Org members can view epics"
  on public.epics for select
  using (
    exists (
      select 1 from public.projects p
      join public.organization_members om on om.organization_id = p.organization_id
      where p.id = epics.project_id
        and om.user_id = auth.uid()
    )
  );

create policy "Org members can insert epics"
  on public.epics for insert
  with check (
    exists (
      select 1 from public.projects p
      join public.organization_members om on om.organization_id = p.organization_id
      where p.id = epics.project_id
        and om.user_id = auth.uid()
        and om.role in ('admin', 'member')
    )
  );

create policy "Org members can update epics"
  on public.epics for update
  using (
    exists (
      select 1 from public.projects p
      join public.organization_members om on om.organization_id = p.organization_id
      where p.id = epics.project_id
        and om.user_id = auth.uid()
        and om.role in ('admin', 'member')
    )
  );

create policy "Org members can delete epics"
  on public.epics for delete
  using (
    exists (
      select 1 from public.projects p
      join public.organization_members om on om.organization_id = p.organization_id
      where p.id = epics.project_id
        and om.user_id = auth.uid()
        and om.role in ('admin', 'member')
    )
  );

-- Organization Invites: admins can manage, members can view
alter table public.organization_invites enable row level security;

create policy "Org admins can manage invites"
  on public.organization_invites for all
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = organization_invites.organization_id
        and om.user_id = auth.uid()
        and om.role = 'admin'
    )
  );

create policy "Org members can view invites"
  on public.organization_invites for select
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = organization_invites.organization_id
        and om.user_id = auth.uid()
    )
  );
