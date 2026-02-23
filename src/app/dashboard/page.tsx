"use client";

import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, Building2, FolderKanban, Users, Settings, Plus,
  ArrowLeft, Globe, GitBranch, LayoutGrid, ExternalLink,
  Trash2, Pencil, X, Check, ChevronRight, LogOut, ArrowRight,
} from "lucide-react";
import Link from "next/link";

interface DBProject {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  website_url: string | null;
  git_provider: string | null;
  git_repo_url: string | null;
  git_default_branch: string | null;
  atlassian_project_key: string | null;
  atlassian_base_url: string | null;
  front_office_url: string | null;
  back_office_url: string | null;
  created_at: string;
  updated_at: string;
}

type Tab = "projects" | "members" | "settings";

export default function DashboardPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { organizations, currentOrg, members, loading: orgLoading, isAdmin } = useOrganization();
  const [projects, setProjects] = useState<DBProject[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("projects");
  const [showNewProject, setShowNewProject] = useState(false);
  const router = useRouter();

  // Load projects for current org
  const loadProjects = useCallback(async () => {
    if (!currentOrg) return;
    setProjectsLoading(true);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data } = await supabase
        .from("projects")
        .select("*")
        .eq("organization_id", currentOrg.id)
        .order("created_at", { ascending: false });
      if (data) setProjects(data);
    } catch {}
    setProjectsLoading(false);
  }, [currentOrg]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  if (authLoading || orgLoading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
      </div>
    );
  }

  if (!currentOrg) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Aucune organisation trouvée</p>
          <Link href="/onboarding" className="btn-primary">
            Créer une organisation
          </Link>
        </div>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: typeof FolderKanban; count?: number }[] = [
    { key: "projects", label: "Projets", icon: FolderKanban, count: projects.length },
    { key: "members", label: "Membres", icon: Users, count: members.length },
    { key: "settings", label: "Paramètres", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Header */}
      <header className="h-14 flex items-center px-6 border-b border-border-light bg-white/80 backdrop-blur-sm">
        <Link
          href="/"
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <div className="w-7 h-7 bg-foreground rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-sm text-foreground">Agen.cy</span>
        </Link>

        <div className="flex-1" />

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg">
            <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-sm font-medium">{currentOrg.name}</span>
            {isAdmin && (
              <span className="text-[9px] px-1.5 py-0.5 bg-foreground text-white rounded-md font-medium">
                Admin
              </span>
            )}
          </div>
          <button
            onClick={signOut}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
            title="Se déconnecter"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Administration</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gérez vos projets, membres et paramètres d&apos;organisation
          </p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-8 border-b border-border-light">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
                  tab === t.key
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
                {t.count !== undefined && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded-md">
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {tab === "projects" && (
            <motion.div
              key="projects"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              <ProjectsTab
                projects={projects}
                orgId={currentOrg.id}
                isAdmin={isAdmin}
                loading={projectsLoading}
                showNew={showNewProject}
                setShowNew={setShowNewProject}
                onRefresh={loadProjects}
              />
            </motion.div>
          )}

          {tab === "members" && (
            <motion.div
              key="members"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              <MembersTab members={members} isAdmin={isAdmin} />
            </motion.div>
          )}

          {tab === "settings" && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              <SettingsTab org={currentOrg} isAdmin={isAdmin} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── PROJECTS TAB ───
function ProjectsTab({
  projects,
  orgId,
  isAdmin,
  loading,
  showNew,
  setShowNew,
  onRefresh,
}: {
  projects: DBProject[];
  orgId: string;
  isAdmin: boolean;
  loading: boolean;
  showNew: boolean;
  setShowNew: (v: boolean) => void;
  onRefresh: () => void;
}) {
  const router = useRouter();

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Supprimer le projet "${name}" ? Cette action est irréversible.`)) return;

    const res = await fetch(`/api/projects?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      onRefresh();
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Projets</h2>
        <button
          onClick={() => setShowNew(true)}
          className="btn-primary flex items-center gap-1.5 text-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          Nouveau projet
        </button>
      </div>

      {/* New project form */}
      <AnimatePresence>
        {showNew && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-4"
          >
            <NewProjectForm
              orgId={orgId}
              onCreated={() => {
                setShowNew(false);
                onRefresh();
              }}
              onCancel={() => setShowNew(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Projects list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-5 h-5 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FolderKanban className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Aucun projet encore</p>
          <button
            onClick={() => setShowNew(true)}
            className="text-xs text-foreground font-medium mt-2 hover:underline"
          >
            Créer votre premier projet
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {projects.map((project) => (
            <div
              key={project.id}
              className="panel shadow-soft p-4 flex items-center gap-4 hover:shadow-md transition-shadow group"
            >
              <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center flex-shrink-0">
                <FolderKanban className="w-5 h-5 text-muted-foreground" />
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold truncate">{project.name}</h3>
                <div className="flex items-center gap-3 mt-1">
                  {project.website_url && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Globe className="w-2.5 h-2.5" />
                      {project.website_url.replace(/https?:\/\//, "").slice(0, 30)}
                    </span>
                  )}
                  {project.git_provider && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <GitBranch className="w-2.5 h-2.5" />
                      {project.git_provider}
                    </span>
                  )}
                  {project.atlassian_project_key && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <LayoutGrid className="w-2.5 h-2.5" />
                      {project.atlassian_project_key}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Link
                  href={`/dashboard/project/${project.id}`}
                  className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  title="Paramètres"
                >
                  <Settings className="w-4 h-4" />
                </Link>
                {isAdmin && (
                  <button
                    onClick={() => handleDelete(project.id, project.name)}
                    className="p-2 rounded-lg hover:bg-red-50 transition-colors text-muted-foreground hover:text-red-500"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <Link
                href="/"
                className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                title="Ouvrir dans le workspace"
              >
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── NEW PROJECT FORM ───
function NewProjectForm({
  orgId,
  onCreated,
  onCancel,
}: {
  orgId: string;
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [gitProvider, setGitProvider] = useState("");
  const [gitRepoUrl, setGitRepoUrl] = useState("");
  const [jiraKey, setJiraKey] = useState("");
  const [jiraBaseUrl, setJiraBaseUrl] = useState("");
  const [frontOfficeUrl, setFrontOfficeUrl] = useState("");
  const [backOfficeUrl, setBackOfficeUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organization_id: orgId,
          name,
          website_url: websiteUrl || null,
          git_provider: gitProvider || null,
          git_repo_url: gitRepoUrl || null,
          atlassian_project_key: jiraKey || null,
          atlassian_base_url: jiraBaseUrl || null,
          front_office_url: frontOfficeUrl || null,
          back_office_url: backOfficeUrl || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        setLoading(false);
        return;
      }

      onCreated();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="panel shadow-soft p-5 border-2 border-foreground/10">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Nouveau projet</h3>
        <button onClick={onCancel} className="p-1 rounded hover:bg-muted">
          <X className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
              Nom du projet *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Refonte site e-commerce"
              className="input-clean w-full"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
              URL du site
            </label>
            <input
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://monsite.com"
              className="input-clean w-full"
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
              Git provider
            </label>
            <select
              value={gitProvider}
              onChange={(e) => setGitProvider(e.target.value)}
              className="input-clean w-full"
            >
              <option value="">Aucun</option>
              <option value="github">GitHub</option>
              <option value="gitlab">GitLab</option>
              <option value="bitbucket">Bitbucket</option>
            </select>
          </div>
          {gitProvider && (
            <div className="col-span-2">
              <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                URL du repository
              </label>
              <input
                type="url"
                value={gitRepoUrl}
                onChange={(e) => setGitRepoUrl(e.target.value)}
                placeholder="https://github.com/org/repo"
                className="input-clean w-full"
              />
            </div>
          )}
          <div>
            <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
              Jira base URL
            </label>
            <input
              type="text"
              value={jiraBaseUrl}
              onChange={(e) => setJiraBaseUrl(e.target.value)}
              placeholder="https://team.atlassian.net"
              className="input-clean w-full"
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
              Jira project key
            </label>
            <input
              type="text"
              value={jiraKey}
              onChange={(e) => setJiraKey(e.target.value)}
              placeholder="PROJ"
              className="input-clean w-full"
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
              URL front office
            </label>
            <input
              type="url"
              value={frontOfficeUrl}
              onChange={(e) => setFrontOfficeUrl(e.target.value)}
              placeholder="https://..."
              className="input-clean w-full"
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
              URL back office
            </label>
            <input
              type="url"
              value={backOfficeUrl}
              onChange={(e) => setBackOfficeUrl(e.target.value)}
              placeholder="https://..."
              className="input-clean w-full"
            />
          </div>
        </div>

        {error && (
          <p className="text-xs text-error bg-red-50 px-3 py-2 rounded-lg">{error}</p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onCancel} className="px-4 py-2 text-xs text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors">
            Annuler
          </button>
          <button
            type="submit"
            disabled={loading || !name}
            className="btn-primary flex items-center gap-1.5 text-xs disabled:opacity-50"
          >
            {loading ? (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                Créer
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── MEMBERS TAB ───
function MembersTab({
  members,
  isAdmin,
}: {
  members: { id: string; user_id: string; role: string; profile: { email: string; full_name: string | null; avatar_url: string | null } }[];
  isAdmin: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Membres</h2>
        {isAdmin && (
          <p className="text-[11px] text-muted-foreground bg-muted px-3 py-1.5 rounded-lg">
            Les utilisateurs doivent d&apos;abord créer un compte
          </p>
        )}
      </div>

      {members.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Aucun membre</p>
        </div>
      ) : (
        <div className="space-y-2">
          {members.map((member) => (
            <div
              key={member.id}
              className="panel shadow-soft p-4 flex items-center gap-4"
            >
              <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                {member.profile.avatar_url ? (
                  <img
                    src={member.profile.avatar_url}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-sm font-semibold text-muted-foreground">
                    {(member.profile.full_name || member.profile.email)
                      .charAt(0)
                      .toUpperCase()}
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold truncate">
                  {member.profile.full_name || "—"}
                </h3>
                <p className="text-[11px] text-muted-foreground truncate">
                  {member.profile.email}
                </p>
              </div>

              <span
                className={`text-[10px] px-2 py-1 rounded-md font-medium ${
                  member.role === "admin"
                    ? "bg-foreground text-white"
                    : member.role === "member"
                    ? "bg-muted text-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {member.role}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── SETTINGS TAB ───
function SettingsTab({
  org,
  isAdmin,
}: {
  org: { id: string; name: string; slug: string; logo_url: string | null };
  isAdmin: boolean;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Paramètres</h2>

      <div className="panel shadow-soft p-6 space-y-4">
        <div>
          <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
            Nom de l&apos;organisation
          </label>
          <input
            type="text"
            value={org.name}
            readOnly={!isAdmin}
            className="input-clean w-full"
          />
        </div>
        <div>
          <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
            Slug
          </label>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">agency.app/</span>
            <input
              type="text"
              value={org.slug}
              readOnly={!isAdmin}
              className="input-clean flex-1"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-border-light">
          <p className="text-[11px] text-muted-foreground">
            ID: <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{org.id}</code>
          </p>
        </div>
      </div>
    </div>
  );
}
