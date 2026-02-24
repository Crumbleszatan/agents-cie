"use client";

import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, ArrowLeft, Save, Globe, GitBranch, LayoutGrid,
  FolderKanban, ExternalLink, Trash2, Check, X, Loader2,
  Link2, Unplug, ChevronDown, Search, Sparkles,
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface ProjectData {
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
  training_status: string | null;
  created_at: string;
  updated_at: string;
}

interface IntegrationStatus {
  connected: boolean;
  account_name: string;
  account_url: string;
  connected_at: string;
}

interface RepoItem {
  id: string;
  name: string;
  full_name: string;
  url: string;
  default_branch: string;
  private: boolean;
}

interface JiraProject {
  id: string;
  key: string;
  name: string;
  url: string;
  avatar: string | null;
  projectType: string;
}

const GIT_PROVIDERS = [
  { key: "github", label: "GitHub", color: "bg-gray-900", textColor: "text-white" },
  { key: "gitlab", label: "GitLab", color: "bg-orange-500", textColor: "text-white" },
  { key: "bitbucket", label: "Bitbucket", color: "bg-blue-600", textColor: "text-white" },
];

export default function ProjectSettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params.id as string;
  const router = useRouter();
  const supabase = createClient();

  const [project, setProject] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [frontOfficeUrl, setFrontOfficeUrl] = useState("");
  const [backOfficeUrl, setBackOfficeUrl] = useState("");
  const [trainingStatus, setTrainingStatus] = useState("not_started");

  // Integration state
  const [integrations, setIntegrations] = useState<Record<string, IntegrationStatus>>({});
  const [integrationsLoading, setIntegrationsLoading] = useState(false);

  // Git repos selector
  const [repos, setRepos] = useState<RepoItem[]>([]);
  const [reposLoading, setReposLoading] = useState(false);
  const [showRepoSelector, setShowRepoSelector] = useState(false);
  const [repoSearch, setRepoSearch] = useState("");
  const [selectedGitProvider, setSelectedGitProvider] = useState<string | null>(null);
  const [selectedRepoUrl, setSelectedRepoUrl] = useState("");
  const [selectedRepoBranch, setSelectedRepoBranch] = useState("main");

  // Jira projects selector
  const [jiraProjects, setJiraProjects] = useState<JiraProject[]>([]);
  const [jiraProjectsLoading, setJiraProjectsLoading] = useState(false);
  const [showJiraSelector, setShowJiraSelector] = useState(false);
  const [jiraSearch, setJiraSearch] = useState("");
  const [selectedJiraKey, setSelectedJiraKey] = useState("");
  const [selectedJiraBaseUrl, setSelectedJiraBaseUrl] = useState("");

  // Disconnecting state
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  // Success notification from OAuth callback
  const [connectedProvider, setConnectedProvider] = useState<string | null>(null);

  // Load project
  useEffect(() => {
    if (!projectId || authLoading) return;

    const load = async () => {
      const { data } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (data) {
        setProject(data);
        setName(data.name);
        setDescription(data.description || "");
        setWebsiteUrl(data.website_url || "");
        setFrontOfficeUrl(data.front_office_url || "");
        setBackOfficeUrl(data.back_office_url || "");
        setTrainingStatus(data.training_status || "not_started");
        setSelectedGitProvider(data.git_provider || null);
        setSelectedRepoUrl(data.git_repo_url || "");
        setSelectedRepoBranch(data.git_default_branch || "main");
        setSelectedJiraKey(data.atlassian_project_key || "");
        setSelectedJiraBaseUrl(data.atlassian_base_url || "");
      }
      setLoading(false);
    };

    load();
  }, [projectId, supabase, authLoading]);

  // Load integration status
  const loadIntegrations = useCallback(async () => {
    if (!project?.organization_id) return;
    setIntegrationsLoading(true);
    try {
      const res = await fetch(`/api/integrations/status?org_id=${project.organization_id}`);
      const data = await res.json();
      if (data.integrations) {
        setIntegrations(data.integrations);
      }
    } catch {}
    setIntegrationsLoading(false);
  }, [project?.organization_id]);

  useEffect(() => {
    if (project?.organization_id) {
      loadIntegrations();
    }
  }, [project?.organization_id, loadIntegrations]);

  // Handle OAuth callback notification
  useEffect(() => {
    const connected = searchParams.get("connected");
    if (connected) {
      setConnectedProvider(connected);
      loadIntegrations();
      // Clean URL
      const url = new URL(window.location.href);
      url.searchParams.delete("connected");
      url.searchParams.delete("error");
      window.history.replaceState({}, "", url.toString());
      // Auto-dismiss notification
      setTimeout(() => setConnectedProvider(null), 4000);
    }
  }, [searchParams, loadIntegrations]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [authLoading, user, router]);

  // Load repos for a connected git provider
  const loadRepos = async (provider: string) => {
    if (!project?.organization_id) return;
    setReposLoading(true);
    setRepos([]);
    try {
      const res = await fetch(`/api/integrations/${provider}/repos?org_id=${project.organization_id}`);
      const data = await res.json();
      if (data.repos) {
        setRepos(data.repos);
      }
    } catch {}
    setReposLoading(false);
  };

  // Load Jira projects
  const loadJiraProjects = async () => {
    if (!project?.organization_id) return;
    setJiraProjectsLoading(true);
    setJiraProjects([]);
    try {
      const res = await fetch(`/api/integrations/jira/projects?org_id=${project.organization_id}`);
      const data = await res.json();
      if (data.projects) {
        setJiraProjects(data.projects);
      }
    } catch {}
    setJiraProjectsLoading(false);
  };

  // Connect to OAuth provider
  const handleConnect = (provider: string) => {
    if (!project?.organization_id) return;
    const url = `/api/integrations/${provider}?org_id=${project.organization_id}&project_id=${projectId}`;
    window.location.href = url;
  };

  // Disconnect provider
  const handleDisconnect = async (provider: string) => {
    if (!project?.organization_id) return;
    setDisconnecting(provider);
    try {
      await fetch(`/api/integrations/${provider}?org_id=${project.organization_id}`, {
        method: "DELETE",
      });
      // Clear provider-specific project data
      if (provider === "jira") {
        setSelectedJiraKey("");
        setSelectedJiraBaseUrl("");
      } else if (["github", "gitlab", "bitbucket"].includes(provider)) {
        if (selectedGitProvider === provider) {
          setSelectedGitProvider(null);
          setSelectedRepoUrl("");
          setSelectedRepoBranch("main");
        }
      }
      await loadIntegrations();
    } catch {}
    setDisconnecting(null);
  };

  // Select a repo
  const handleSelectRepo = (repo: RepoItem, provider: string) => {
    setSelectedGitProvider(provider);
    setSelectedRepoUrl(repo.url);
    setSelectedRepoBranch(repo.default_branch);
    setShowRepoSelector(false);
  };

  // Select a Jira project
  const handleSelectJiraProject = (proj: JiraProject) => {
    setSelectedJiraKey(proj.key);
    setSelectedJiraBaseUrl(proj.url.split("/browse/")[0] || "");
    setShowJiraSelector(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const res = await fetch("/api/projects", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: projectId,
          name,
          description: description || null,
          website_url: websiteUrl || null,
          git_provider: selectedGitProvider || null,
          git_repo_url: selectedRepoUrl || null,
          git_default_branch: selectedRepoBranch || "main",
          atlassian_project_key: selectedJiraKey || null,
          atlassian_base_url: selectedJiraBaseUrl || null,
          front_office_url: frontOfficeUrl || null,
          back_office_url: backOfficeUrl || null,
          training_status: trainingStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (err: any) {
      setError(err.message);
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm("Supprimer ce projet ? Cette action est irréversible.")) return;

    const res = await fetch(`/api/projects?id=${projectId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/dashboard");
    }
  };

  // Find which git providers are connected
  const connectedGitProviders = GIT_PROVIDERS.filter(
    (p) => integrations[p.key]?.connected
  );

  const filteredRepos = repos.filter(
    (r) =>
      r.name.toLowerCase().includes(repoSearch.toLowerCase()) ||
      r.full_name.toLowerCase().includes(repoSearch.toLowerCase())
  );

  const filteredJiraProjects = jiraProjects.filter(
    (p) =>
      p.name.toLowerCase().includes(jiraSearch.toLowerCase()) ||
      p.key.toLowerCase().includes(jiraSearch.toLowerCase())
  );

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Projet non trouvé</p>
          <Link href="/dashboard" className="btn-primary text-xs">
            Retour au dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Header */}
      <header className="h-14 flex items-center px-6 border-b border-border-light bg-white/80 backdrop-blur-sm">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <div className="w-7 h-7 bg-foreground rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-sm text-foreground">Dashboard</span>
        </Link>

        <div className="w-px h-5 bg-border mx-3" />
        <span className="text-sm text-muted-foreground flex items-center gap-1.5">
          <FolderKanban className="w-3.5 h-3.5" />
          {project.name}
        </span>
      </header>

      {/* Success notification */}
      <AnimatePresence>
        {connectedProvider && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 z-50 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl shadow-lg flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span className="text-sm font-medium">
              {connectedProvider.charAt(0).toUpperCase() + connectedProvider.slice(1)} connecté avec succès
            </span>
            <button onClick={() => setConnectedProvider(null)} className="ml-2 hover:text-green-900">
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Paramètres du projet</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configuration, intégrations et accès
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* General */}
          <section className="panel shadow-soft p-6 space-y-4">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <FolderKanban className="w-4 h-4" />
              Général
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                  Nom du projet
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-clean w-full"
                  required
                />
              </div>
              <div className="col-span-2">
                <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input-clean w-full resize-none"
                  rows={3}
                  placeholder="Décrivez le projet..."
                />
              </div>
              <div className="col-span-2">
                <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                  URL du site web
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="url"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="https://monsite.com"
                    className="input-clean w-full pl-10"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* ─── GIT INTEGRATION ─── */}
          <section className="panel shadow-soft p-6 space-y-4">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <GitBranch className="w-4 h-4" />
              Git Repository
            </h2>

            {/* Connect buttons */}
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Connectez votre compte Git pour sélectionner un repository.
              </p>

              <div className="flex flex-wrap gap-2">
                {GIT_PROVIDERS.map((provider) => {
                  const status = integrations[provider.key];
                  const isConnected = status?.connected;
                  const isDisconnecting = disconnecting === provider.key;

                  return (
                    <div key={provider.key} className="flex items-center gap-1.5">
                      {isConnected ? (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 border border-green-200 text-green-800 text-xs font-medium">
                          <Check className="w-3 h-3" />
                          {provider.label}
                          {status.account_name && (
                            <span className="text-green-600 font-normal">({status.account_name})</span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDisconnect(provider.key)}
                            disabled={isDisconnecting}
                            className="ml-1 p-0.5 rounded hover:bg-green-100 text-green-600 hover:text-red-500 transition-colors"
                            title="Déconnecter"
                          >
                            {isDisconnecting ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Unplug className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleConnect(provider.key)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${provider.color} ${provider.textColor} hover:opacity-90 transition-opacity`}
                        >
                          <Link2 className="w-3 h-3" />
                          Connecter {provider.label}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Repo selector - show if any git provider is connected */}
            {connectedGitProviders.length > 0 && (
              <div className="space-y-3 pt-3 border-t border-border-light">
                <label className="text-[11px] font-medium text-muted-foreground block">
                  Repository sélectionné
                </label>

                {selectedRepoUrl ? (
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <GitBranch className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{selectedRepoUrl}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Branche: {selectedRepoBranch} · Provider: {selectedGitProvider}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRepoUrl("");
                        setSelectedRepoBranch("main");
                        setSelectedGitProvider(null);
                      }}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Aucun repository sélectionné</p>
                )}

                {/* Repo picker per provider */}
                {connectedGitProviders.map((provider) => (
                  <div key={provider.key}>
                    <button
                      type="button"
                      onClick={() => {
                        if (showRepoSelector && reposLoading) return;
                        setShowRepoSelector(!showRepoSelector);
                        setRepoSearch("");
                        if (!showRepoSelector) {
                          loadRepos(provider.key);
                        }
                      }}
                      className="flex items-center gap-1.5 text-xs text-foreground font-medium hover:underline"
                    >
                      <Search className="w-3 h-3" />
                      Parcourir les repos {provider.label}
                      <ChevronDown className={`w-3 h-3 transition-transform ${showRepoSelector ? "rotate-180" : ""}`} />
                    </button>

                    <AnimatePresence>
                      {showRepoSelector && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-2 border border-border rounded-xl overflow-hidden bg-white">
                            {/* Search */}
                            <div className="p-2 border-b border-border-light">
                              <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                <input
                                  type="text"
                                  value={repoSearch}
                                  onChange={(e) => setRepoSearch(e.target.value)}
                                  placeholder="Rechercher un repository..."
                                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-muted rounded-lg outline-none focus:ring-1 focus:ring-foreground/20"
                                  autoFocus
                                />
                              </div>
                            </div>

                            {/* List */}
                            <div className="max-h-60 overflow-y-auto">
                              {reposLoading ? (
                                <div className="flex items-center justify-center py-6">
                                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                  <span className="ml-2 text-xs text-muted-foreground">Chargement...</span>
                                </div>
                              ) : filteredRepos.length === 0 ? (
                                <div className="py-6 text-center text-xs text-muted-foreground">
                                  Aucun repository trouvé
                                </div>
                              ) : (
                                filteredRepos.map((repo) => (
                                  <button
                                    key={repo.id}
                                    type="button"
                                    onClick={() => handleSelectRepo(repo, provider.key)}
                                    className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted transition-colors ${
                                      selectedRepoUrl === repo.url ? "bg-muted" : ""
                                    }`}
                                  >
                                    <GitBranch className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-medium truncate">{repo.full_name}</p>
                                      <p className="text-[10px] text-muted-foreground">
                                        {repo.default_branch} · {repo.private ? "Privé" : "Public"}
                                      </p>
                                    </div>
                                    {selectedRepoUrl === repo.url && (
                                      <Check className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                                    )}
                                  </button>
                                ))
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            )}

            {integrationsLoading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                Chargement des intégrations...
              </div>
            )}
          </section>

          {/* ─── JIRA INTEGRATION ─── */}
          <section className="panel shadow-soft p-6 space-y-4">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <LayoutGrid className="w-4 h-4" />
              Jira / Atlassian
            </h2>

            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Connectez Jira pour synchroniser les projets et tickets.
              </p>

              {integrations.jira?.connected ? (
                <div className="space-y-3">
                  {/* Connected badge */}
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 border border-green-200 text-green-800 text-xs font-medium w-fit">
                    <Check className="w-3 h-3" />
                    Jira connecté
                    {integrations.jira.account_name && (
                      <span className="text-green-600 font-normal">({integrations.jira.account_name})</span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDisconnect("jira")}
                      disabled={disconnecting === "jira"}
                      className="ml-1 p-0.5 rounded hover:bg-green-100 text-green-600 hover:text-red-500 transition-colors"
                      title="Déconnecter"
                    >
                      {disconnecting === "jira" ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Unplug className="w-3 h-3" />
                      )}
                    </button>
                  </div>

                  {/* Jira project selector */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-medium text-muted-foreground block">
                      Projet Jira sélectionné
                    </label>

                    {selectedJiraKey ? (
                      <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                        <LayoutGrid className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium">{selectedJiraKey}</p>
                          {selectedJiraBaseUrl && (
                            <p className="text-[10px] text-muted-foreground truncate">{selectedJiraBaseUrl}</p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedJiraKey("");
                            setSelectedJiraBaseUrl("");
                          }}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">Aucun projet sélectionné</p>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setShowJiraSelector(!showJiraSelector);
                        setJiraSearch("");
                        if (!showJiraSelector) {
                          loadJiraProjects();
                        }
                      }}
                      className="flex items-center gap-1.5 text-xs text-foreground font-medium hover:underline"
                    >
                      <Search className="w-3 h-3" />
                      Parcourir les projets Jira
                      <ChevronDown className={`w-3 h-3 transition-transform ${showJiraSelector ? "rotate-180" : ""}`} />
                    </button>

                    <AnimatePresence>
                      {showJiraSelector && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-1 border border-border rounded-xl overflow-hidden bg-white">
                            {/* Search */}
                            <div className="p-2 border-b border-border-light">
                              <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                <input
                                  type="text"
                                  value={jiraSearch}
                                  onChange={(e) => setJiraSearch(e.target.value)}
                                  placeholder="Rechercher un projet Jira..."
                                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-muted rounded-lg outline-none focus:ring-1 focus:ring-foreground/20"
                                  autoFocus
                                />
                              </div>
                            </div>

                            {/* List */}
                            <div className="max-h-60 overflow-y-auto">
                              {jiraProjectsLoading ? (
                                <div className="flex items-center justify-center py-6">
                                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                  <span className="ml-2 text-xs text-muted-foreground">Chargement...</span>
                                </div>
                              ) : filteredJiraProjects.length === 0 ? (
                                <div className="py-6 text-center text-xs text-muted-foreground">
                                  Aucun projet Jira trouvé
                                </div>
                              ) : (
                                filteredJiraProjects.map((proj) => (
                                  <button
                                    key={proj.id}
                                    type="button"
                                    onClick={() => handleSelectJiraProject(proj)}
                                    className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted transition-colors ${
                                      selectedJiraKey === proj.key ? "bg-muted" : ""
                                    }`}
                                  >
                                    {proj.avatar ? (
                                      <img src={proj.avatar} alt="" className="w-5 h-5 rounded flex-shrink-0" />
                                    ) : (
                                      <LayoutGrid className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-medium">{proj.name}</p>
                                      <p className="text-[10px] text-muted-foreground">
                                        {proj.key} · {proj.projectType}
                                      </p>
                                    </div>
                                    {selectedJiraKey === proj.key && (
                                      <Check className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                                    )}
                                  </button>
                                ))
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleConnect("jira")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:opacity-90 transition-opacity"
                >
                  <Link2 className="w-3 h-3" />
                  Connecter Jira
                </button>
              )}
            </div>
          </section>

          {/* ─── IA TRAINING ─── */}
          <section className="panel shadow-soft p-6 space-y-4">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Entraînement IA
            </h2>
            <p className="text-xs text-muted-foreground">
              Définissez le statut de l&apos;entraînement IA pour ce projet. Les fonctionnalités IA Preview et Architecture nécessitent un entraînement complet.
            </p>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                Statut
              </label>
              <select
                value={trainingStatus}
                onChange={(e) => setTrainingStatus(e.target.value)}
                className="input-clean w-full max-w-xs"
              >
                <option value="not_started">Non démarré</option>
                <option value="in_progress">En cours</option>
                <option value="complete">Terminé</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  trainingStatus === "complete"
                    ? "bg-green-500"
                    : trainingStatus === "in_progress"
                    ? "bg-amber-500 animate-pulse"
                    : "bg-gray-300"
                }`}
              />
              <span className="text-[11px] text-muted-foreground">
                {trainingStatus === "complete"
                  ? "IA prête — toutes les fonctionnalités sont activées"
                  : trainingStatus === "in_progress"
                  ? "Entraînement en cours — certaines fonctionnalités sont limitées"
                  : "Non démarré — IA Preview et Architecture désactivés"}
              </span>
            </div>
          </section>

          {/* URLs */}
          <section className="panel shadow-soft p-6 space-y-4">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <ExternalLink className="w-4 h-4" />
              Accès Front / Back Office
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                  URL Front Office
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
                  URL Back Office
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
          </section>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleDelete}
              className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 transition-colors px-3 py-2 rounded-lg hover:bg-red-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Supprimer le projet
            </button>

            <div className="flex items-center gap-3">
              {error && (
                <span className="text-xs text-error">{error}</span>
              )}
              {saved && (
                <motion.span
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-xs text-green-600 font-medium"
                >
                  ✓ Sauvegardé
                </motion.span>
              )}
              <button
                type="submit"
                disabled={saving || !name}
                className="btn-primary flex items-center gap-1.5 text-xs disabled:opacity-50"
              >
                {saving ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    Sauvegarder
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Meta info */}
        <div className="mt-8 pt-4 border-t border-border-light">
          <p className="text-[10px] text-muted-foreground">
            Créé le {new Date(project.created_at).toLocaleDateString("fr-FR")} · ID: <code className="text-[9px] bg-muted px-1 py-0.5 rounded">{project.id}</code>
          </p>
        </div>
      </div>
    </div>
  );
}
