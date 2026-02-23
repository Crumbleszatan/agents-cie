-- ============================================================
-- Integration tokens: store OAuth tokens for Git & Jira per org
-- ============================================================

create table public.integration_tokens (
  id uuid default uuid_generate_v4() primary key,
  organization_id uuid references public.organizations on delete cascade not null,
  provider text not null check (provider in ('github', 'gitlab', 'bitbucket', 'jira')),
  access_token text not null,
  refresh_token text,
  token_expires_at timestamptz,
  account_name text, -- e.g. GitHub username or Jira site name
  account_url text,  -- e.g. https://github.com/org or https://site.atlassian.net
  scopes text,
  created_by uuid references auth.users not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique(organization_id, provider)
);

create index idx_integration_tokens_org on public.integration_tokens(organization_id);

-- Enable RLS
alter table public.integration_tokens enable row level security;

-- Only org admins/members can view tokens
create policy "Org members can view integration tokens"
  on public.integration_tokens for select
  using (
    public.is_org_member(organization_id, auth.uid())
  );

-- Only admins can manage tokens
create policy "Admins can manage integration tokens"
  on public.integration_tokens for all
  using (
    public.is_org_admin(organization_id, auth.uid())
  );

-- Auto-update updated_at
create trigger update_integration_tokens_updated_at before update on public.integration_tokens
  for each row execute function public.update_updated_at();
