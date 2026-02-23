-- ============================================================
-- Agen.cy — Initial Database Schema
-- Migration: 001_initial_schema
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ────────────────────────────────────────────────────────────
-- PROFILES (extends Supabase auth.users)
-- ────────────────────────────────────────────────────────────
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  avatar_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', '')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ────────────────────────────────────────────────────────────
-- ORGANIZATIONS
-- ────────────────────────────────────────────────────────────
create table public.organizations (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  slug text not null unique,
  logo_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index idx_organizations_slug on public.organizations(slug);

-- ────────────────────────────────────────────────────────────
-- ORGANIZATION MEMBERS
-- ────────────────────────────────────────────────────────────
create table public.organization_members (
  id uuid default uuid_generate_v4() primary key,
  organization_id uuid references public.organizations on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  role text not null default 'member' check (role in ('admin', 'member', 'viewer')),
  created_at timestamptz default now() not null,
  unique(organization_id, user_id)
);

create index idx_org_members_org on public.organization_members(organization_id);
create index idx_org_members_user on public.organization_members(user_id);

-- ────────────────────────────────────────────────────────────
-- PROJECTS
-- ────────────────────────────────────────────────────────────
create table public.projects (
  id uuid default uuid_generate_v4() primary key,
  organization_id uuid references public.organizations on delete cascade not null,
  name text not null,
  description text,
  website_url text,
  git_provider text check (git_provider in ('github', 'gitlab', 'bitbucket')),
  git_repo_url text,
  git_default_branch text default 'main',
  atlassian_project_key text,
  atlassian_base_url text,
  front_office_url text,
  back_office_url text,
  brand_context jsonb default '{}',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index idx_projects_org on public.projects(organization_id);

-- ────────────────────────────────────────────────────────────
-- USER STORIES
-- ────────────────────────────────────────────────────────────
create table public.user_stories (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects on delete cascade not null,
  title text not null default '',
  as_a text default '',
  i_want text default '',
  so_that text default '',
  acceptance_criteria jsonb default '[]',
  subtasks jsonb default '[]',
  story_points integer,
  priority text default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
  labels jsonb default '[]',
  affected_pages jsonb default '[]',
  affected_services jsonb default '[]',
  definition_of_done jsonb default '["Code reviewed and approved","Unit tests written and passing","Integration tests passing","Deployed to staging","QA validated","Documentation updated"]',
  status text default 'draft' check (status in ('draft', 'refining', 'ready')),
  -- Matrix
  effort integer default 0,
  impact integer default 0,
  matrix_position jsonb, -- { x: number, y: number }
  -- Production
  production_mode text default 'engineer-ai' check (production_mode in ('full-ai', 'engineer-ai')),
  production_status text default 'backlog' check (production_status in ('backlog', 'planned', 'in-progress', 'review', 'done')),
  release_id uuid,
  start_date timestamptz,
  end_date timestamptz,
  lines_of_code integer default 0,
  jira_key text,
  git_branch text,
  completion_percent integer default 0,
  -- Meta
  created_by uuid references auth.users not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index idx_stories_project on public.user_stories(project_id);
create index idx_stories_status on public.user_stories(status);
create index idx_stories_created_by on public.user_stories(created_by);

-- ────────────────────────────────────────────────────────────
-- CAPSULES
-- ────────────────────────────────────────────────────────────
create table public.capsules (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects on delete cascade not null,
  name text not null,
  status text default 'draft' check (status in ('draft', 'prioritizing', 'building', 'shipping', 'done')),
  deadline timestamptz,
  total_effort integer default 0,
  total_lines_of_code integer default 0,
  completion_percent integer default 0,
  created_by uuid references auth.users not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index idx_capsules_project on public.capsules(project_id);

-- Link stories to capsules (many-to-many)
create table public.capsule_stories (
  capsule_id uuid references public.capsules on delete cascade not null,
  story_id uuid references public.user_stories on delete cascade not null,
  primary key (capsule_id, story_id)
);

-- ────────────────────────────────────────────────────────────
-- RELEASES
-- ────────────────────────────────────────────────────────────
create table public.releases (
  id uuid default uuid_generate_v4() primary key,
  capsule_id uuid references public.capsules on delete cascade not null,
  name text not null,
  planned_date timestamptz not null,
  status text default 'planned' check (status in ('planned', 'in-progress', 'shipped')),
  created_at timestamptz default now() not null
);

-- Add FK from user_stories.release_id to releases
alter table public.user_stories
  add constraint fk_story_release
  foreign key (release_id) references public.releases(id) on delete set null;

create index idx_releases_capsule on public.releases(capsule_id);

-- ────────────────────────────────────────────────────────────
-- CHAT MESSAGES (conversation history per project)
-- ────────────────────────────────────────────────────────────
create table public.chat_messages (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects on delete cascade not null,
  user_id uuid references auth.users not null,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  message_type text default 'text' check (message_type in ('text', 'question', 'suggestion', 'preview', 'architecture')),
  metadata jsonb,
  created_at timestamptz default now() not null
);

create index idx_chat_project on public.chat_messages(project_id, created_at);

-- ────────────────────────────────────────────────────────────
-- AUTO-UPDATE updated_at TRIGGER
-- ────────────────────────────────────────────────────────────
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_profiles_updated_at before update on public.profiles
  for each row execute function public.update_updated_at();

create trigger update_organizations_updated_at before update on public.organizations
  for each row execute function public.update_updated_at();

create trigger update_projects_updated_at before update on public.projects
  for each row execute function public.update_updated_at();

create trigger update_stories_updated_at before update on public.user_stories
  for each row execute function public.update_updated_at();

create trigger update_capsules_updated_at before update on public.capsules
  for each row execute function public.update_updated_at();

-- ────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS)
-- ────────────────────────────────────────────────────────────

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.projects enable row level security;
alter table public.user_stories enable row level security;
alter table public.capsules enable row level security;
alter table public.capsule_stories enable row level security;
alter table public.releases enable row level security;
alter table public.chat_messages enable row level security;

-- Profiles: users can read/update their own profile
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Organizations: members can view their orgs
create policy "Org members can view organization"
  on public.organizations for select
  using (
    exists (
      select 1 from public.organization_members
      where organization_id = organizations.id
      and user_id = auth.uid()
    )
  );

create policy "Admins can update organization"
  on public.organizations for update
  using (
    exists (
      select 1 from public.organization_members
      where organization_id = organizations.id
      and user_id = auth.uid()
      and role = 'admin'
    )
  );

create policy "Authenticated users can create organizations"
  on public.organizations for insert
  with check (auth.uid() is not null);

-- Organization members: visible to org members
create policy "Org members can view members"
  on public.organization_members for select
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = organization_members.organization_id
      and om.user_id = auth.uid()
    )
  );

create policy "Admins can manage members"
  on public.organization_members for insert
  with check (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = organization_members.organization_id
      and om.user_id = auth.uid()
      and om.role = 'admin'
    )
    -- Also allow self-insert (for org creation)
    or (user_id = auth.uid() and role = 'admin')
  );

create policy "Admins can update members"
  on public.organization_members for update
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = organization_members.organization_id
      and om.user_id = auth.uid()
      and om.role = 'admin'
    )
  );

create policy "Admins can delete members"
  on public.organization_members for delete
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = organization_members.organization_id
      and om.user_id = auth.uid()
      and om.role = 'admin'
    )
  );

-- Projects: org members can view, admins can create/edit
create policy "Org members can view projects"
  on public.projects for select
  using (
    exists (
      select 1 from public.organization_members
      where organization_id = projects.organization_id
      and user_id = auth.uid()
    )
  );

create policy "Org admins can create projects"
  on public.projects for insert
  with check (
    exists (
      select 1 from public.organization_members
      where organization_id = projects.organization_id
      and user_id = auth.uid()
      and role in ('admin', 'member')
    )
  );

create policy "Org admins can update projects"
  on public.projects for update
  using (
    exists (
      select 1 from public.organization_members
      where organization_id = projects.organization_id
      and user_id = auth.uid()
      and role in ('admin', 'member')
    )
  );

-- User Stories: accessible to project org members
create policy "Org members can view stories"
  on public.user_stories for select
  using (
    exists (
      select 1 from public.projects p
      join public.organization_members om on om.organization_id = p.organization_id
      where p.id = user_stories.project_id
      and om.user_id = auth.uid()
    )
  );

create policy "Org members can create stories"
  on public.user_stories for insert
  with check (
    exists (
      select 1 from public.projects p
      join public.organization_members om on om.organization_id = p.organization_id
      where p.id = user_stories.project_id
      and om.user_id = auth.uid()
      and om.role in ('admin', 'member')
    )
  );

create policy "Org members can update stories"
  on public.user_stories for update
  using (
    exists (
      select 1 from public.projects p
      join public.organization_members om on om.organization_id = p.organization_id
      where p.id = user_stories.project_id
      and om.user_id = auth.uid()
      and om.role in ('admin', 'member')
    )
  );

create policy "Org members can delete stories"
  on public.user_stories for delete
  using (
    exists (
      select 1 from public.projects p
      join public.organization_members om on om.organization_id = p.organization_id
      where p.id = user_stories.project_id
      and om.user_id = auth.uid()
      and om.role in ('admin', 'member')
    )
  );

-- Capsules: same as stories
create policy "Org members can view capsules"
  on public.capsules for select
  using (
    exists (
      select 1 from public.projects p
      join public.organization_members om on om.organization_id = p.organization_id
      where p.id = capsules.project_id
      and om.user_id = auth.uid()
    )
  );

create policy "Org members can manage capsules"
  on public.capsules for all
  using (
    exists (
      select 1 from public.projects p
      join public.organization_members om on om.organization_id = p.organization_id
      where p.id = capsules.project_id
      and om.user_id = auth.uid()
      and om.role in ('admin', 'member')
    )
  );

-- Capsule stories: same scope
create policy "Org members can view capsule stories"
  on public.capsule_stories for select
  using (
    exists (
      select 1 from public.capsules c
      join public.projects p on p.id = c.project_id
      join public.organization_members om on om.organization_id = p.organization_id
      where c.id = capsule_stories.capsule_id
      and om.user_id = auth.uid()
    )
  );

create policy "Org members can manage capsule stories"
  on public.capsule_stories for all
  using (
    exists (
      select 1 from public.capsules c
      join public.projects p on p.id = c.project_id
      join public.organization_members om on om.organization_id = p.organization_id
      where c.id = capsule_stories.capsule_id
      and om.user_id = auth.uid()
      and om.role in ('admin', 'member')
    )
  );

-- Releases: same as capsules
create policy "Org members can view releases"
  on public.releases for select
  using (
    exists (
      select 1 from public.capsules c
      join public.projects p on p.id = c.project_id
      join public.organization_members om on om.organization_id = p.organization_id
      where c.id = releases.capsule_id
      and om.user_id = auth.uid()
    )
  );

create policy "Org members can manage releases"
  on public.releases for all
  using (
    exists (
      select 1 from public.capsules c
      join public.projects p on p.id = c.project_id
      join public.organization_members om on om.organization_id = p.organization_id
      where c.id = releases.capsule_id
      and om.user_id = auth.uid()
      and om.role in ('admin', 'member')
    )
  );

-- Chat messages: project org members
create policy "Org members can view chat"
  on public.chat_messages for select
  using (
    exists (
      select 1 from public.projects p
      join public.organization_members om on om.organization_id = p.organization_id
      where p.id = chat_messages.project_id
      and om.user_id = auth.uid()
    )
  );

create policy "Org members can send messages"
  on public.chat_messages for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.projects p
      join public.organization_members om on om.organization_id = p.organization_id
      where p.id = chat_messages.project_id
      and om.user_id = auth.uid()
    )
  );
