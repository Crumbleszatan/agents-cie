"use client";

import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Zap, ArrowLeft, Save, Globe, GitBranch, LayoutGrid,
  FolderKanban, ExternalLink, Trash2,
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
  created_at: string;
  updated_at: string;
}

export default function ProjectSettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const params = useParams();
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
  const [gitProvider, setGitProvider] = useState("");
  const [gitRepoUrl, setGitRepoUrl] = useState("");
  const [gitDefaultBranch, setGitDefaultBranch] = useState("main");
  const [jiraKey, setJiraKey] = useState("");
  const [jiraBaseUrl, setJiraBaseUrl] = useState("");
  const [frontOfficeUrl, setFrontOfficeUrl] = useState("");
  const [backOfficeUrl, setBackOfficeUrl] = useState("");

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
        setGitProvider(data.git_provider || "");
        setGitRepoUrl(data.git_repo_url || "");
        setGitDefaultBranch(data.git_default_branch || "main");
        setJiraKey(data.atlassian_project_key || "");
        setJiraBaseUrl(data.atlassian_base_url || "");
        setFrontOfficeUrl(data.front_office_url || "");
        setBackOfficeUrl(data.back_office_url || "");
      }
      setLoading(false);
    };

    load();
  }, [projectId, supabase, authLoading]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [authLoading, user, router]);

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
          git_provider: gitProvider || null,
          git_repo_url: gitRepoUrl || null,
          git_default_branch: gitDefaultBranch || "main",
          atlassian_project_key: jiraKey || null,
          atlassian_base_url: jiraBaseUrl || null,
          front_office_url: frontOfficeUrl || null,
          back_office_url: backOfficeUrl || null,
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

          {/* Git */}
          <section className="panel shadow-soft p-6 space-y-4">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <GitBranch className="w-4 h-4" />
              Git Repository
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                  Provider
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
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                  Branche par défaut
                </label>
                <input
                  type="text"
                  value={gitDefaultBranch}
                  onChange={(e) => setGitDefaultBranch(e.target.value)}
                  placeholder="main"
                  className="input-clean w-full"
                />
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
            </div>
          </section>

          {/* Jira */}
          <section className="panel shadow-soft p-6 space-y-4">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <LayoutGrid className="w-4 h-4" />
              Jira / Atlassian
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                  Base URL
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
                  Project Key
                </label>
                <input
                  type="text"
                  value={jiraKey}
                  onChange={(e) => setJiraKey(e.target.value)}
                  placeholder="PROJ"
                  className="input-clean w-full"
                />
              </div>
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
