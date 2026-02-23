"use client";

import { createClient } from "@/lib/supabase/client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, Building2, ArrowRight, FolderKanban, Globe, Check,
  GitBranch, LayoutGrid, Link2, Loader2,
} from "lucide-react";

type Step = "organization" | "project" | "integrations";

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  );
}

function OnboardingContent() {
  const [step, setStep] = useState<Step>("organization");
  // Organization
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [orgId, setOrgId] = useState<string | null>(null);
  // Project
  const [projectName, setProjectName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [projectId, setProjectId] = useState<string | null>(null);
  // Integrations
  const [integrations, setIntegrations] = useState<Record<string, { connected: boolean; account_name: string }>>({});
  const [integrationsLoading, setIntegrationsLoading] = useState(false);
  // UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // Restore state when returning from OAuth callback
  useEffect(() => {
    const stepParam = searchParams.get("step");
    const orgIdParam = searchParams.get("org_id");
    const projectIdParam = searchParams.get("project_id");

    if (stepParam === "integrations" && orgIdParam && projectIdParam) {
      setStep("integrations");
      setOrgId(orgIdParam);
      setProjectId(projectIdParam);
      const loadStatus = async () => {
        setIntegrationsLoading(true);
        try {
          const res = await fetch(`/api/integrations/status?org_id=${orgIdParam}`);
          const data = await res.json();
          if (data.integrations) {
            setIntegrations(data.integrations);
          }
        } catch {}
        setIntegrationsLoading(false);
      };
      loadStatus();
    }
  }, [searchParams]);

  // Check if user already has an org (only if not returning from OAuth)
  useEffect(() => {
    if (searchParams.get("step")) return; // Skip check if returning from OAuth

    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const { data: memberships } = await supabase
        .from("organization_members")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);

      if (memberships && memberships.length > 0) {
        router.push("/");
      }
    };
    check();
  }, [supabase, router]);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 40);
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: orgName, slug: orgSlug }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erreur lors de la création de l'organisation");
        setLoading(false);
        return;
      }

      setOrgId(data.organization.id);
      setStep("project");
      setLoading(false);
    } catch (err: any) {
      setError(err.message || "Erreur réseau");
      setLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organization_id: orgId,
          name: projectName,
          website_url: websiteUrl || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erreur lors de la création du projet");
        setLoading(false);
        return;
      }

      setProjectId(data.project.id);
      setStep("integrations");
      loadIntegrations();
      setLoading(false);
    } catch (err: any) {
      setError(err.message || "Erreur réseau");
      setLoading(false);
    }
  };

  const loadIntegrations = async () => {
    if (!orgId) return;
    setIntegrationsLoading(true);
    try {
      const res = await fetch(`/api/integrations/status?org_id=${orgId}`);
      const data = await res.json();
      if (data.integrations) {
        setIntegrations(data.integrations);
      }
    } catch {}
    setIntegrationsLoading(false);
  };

  const handleConnect = (provider: string) => {
    if (!orgId || !projectId) return;
    const returnUrl = `/onboarding?step=integrations&org_id=${orgId}&project_id=${projectId}`;
    window.location.href = `/api/integrations/${provider}?org_id=${orgId}&project_id=${projectId}&return_url=${encodeURIComponent(returnUrl)}`;
  };

  const providers = [
    { key: "github", label: "GitHub", icon: GitBranch, color: "bg-gray-900 text-white" },
    { key: "gitlab", label: "GitLab", icon: GitBranch, color: "bg-orange-500 text-white" },
    { key: "bitbucket", label: "Bitbucket", icon: GitBranch, color: "bg-blue-600 text-white" },
    { key: "jira", label: "Jira", icon: LayoutGrid, color: "bg-blue-500 text-white" },
  ];

  const stepsConfig = [
    { key: "organization" as const, label: "Organisation", icon: Building2 },
    { key: "project" as const, label: "Projet", icon: FolderKanban },
    { key: "integrations" as const, label: "Intégrations", icon: Link2 },
  ];
  const currentStepIndex = stepsConfig.findIndex((s) => s.key === step);

  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[440px]"
      >
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-foreground rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Bienvenue sur Agen.cy</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {step === "organization" && "Créez votre organisation pour commencer"}
            {step === "project" && "Créez votre premier projet"}
            {step === "integrations" && "Connectez vos outils"}
          </p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-1.5 mb-6">
          {stepsConfig.map((s, i) => {
            const Icon = s.icon;
            const isActive = i === currentStepIndex;
            const isDone = i < currentStepIndex;
            return (
              <div key={s.key} className="flex items-center">
                <div
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                    isActive
                      ? "bg-foreground text-white"
                      : isDone
                      ? "bg-foreground/10 text-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isDone ? <Check className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
                  {s.label}
                </div>
                {i < stepsConfig.length - 1 && (
                  <div className={`w-3 h-px mx-0.5 ${isDone ? "bg-foreground" : "bg-border"}`} />
                )}
              </div>
            );
          })}
        </div>

        <div className="panel shadow-soft p-6">
          <AnimatePresence mode="wait">
            {/* ─── STEP 1: ORGANIZATION ─── */}
            {step === "organization" && (
              <motion.div
                key="organization"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <form onSubmit={handleCreateOrg} className="space-y-4">
                  <p className="text-xs text-muted-foreground">
                    Une organisation regroupe votre équipe et vos projets.
                    Vous en serez l&apos;administrateur.
                  </p>
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                      Nom de l&apos;organisation
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        value={orgName}
                        onChange={(e) => {
                          setOrgName(e.target.value);
                          setOrgSlug(generateSlug(e.target.value));
                        }}
                        placeholder="Mon Agence"
                        className="input-clean w-full pl-10"
                        required
                        autoFocus
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                      Slug (URL)
                    </label>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        agency.app/
                      </span>
                      <input
                        type="text"
                        value={orgSlug}
                        onChange={(e) => setOrgSlug(generateSlug(e.target.value))}
                        placeholder="mon-agence"
                        className="input-clean flex-1"
                        required
                      />
                    </div>
                  </div>

                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs text-error bg-red-50 px-3 py-2 rounded-lg"
                    >
                      {error}
                    </motion.p>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !orgName}
                    className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        Continuer
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            )}

            {/* ─── STEP 2: FIRST PROJECT ─── */}
            {step === "project" && (
              <motion.div
                key="project"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <form onSubmit={handleCreateProject} className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Créez votre premier projet.
                  </p>

                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                      Nom du projet *
                    </label>
                    <div className="relative">
                      <FolderKanban className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        placeholder="Refonte site e-commerce"
                        className="input-clean w-full pl-10"
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  <div>
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

                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs text-error bg-red-50 px-3 py-2 rounded-lg"
                    >
                      {error}
                    </motion.p>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !projectName}
                    className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        Continuer
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            )}

            {/* ─── STEP 3: INTEGRATIONS ─── */}
            {step === "integrations" && (
              <motion.div
                key="integrations"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <p className="text-xs text-muted-foreground">
                  Connectez vos outils pour synchroniser vos repos et projets Jira.
                  Vous pouvez aussi le faire plus tard depuis les paramètres.
                </p>

                {integrationsLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {providers.map((provider) => {
                      const Icon = provider.icon;
                      const status = integrations[provider.key];
                      const isConnected = status?.connected;

                      return (
                        <div key={provider.key} className="flex items-center justify-between p-3 rounded-xl border border-border-light hover:border-border transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${provider.color}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{provider.label}</p>
                              {isConnected && status.account_name && (
                                <p className="text-[10px] text-green-600">{status.account_name}</p>
                              )}
                            </div>
                          </div>

                          {isConnected ? (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-50 text-green-700 text-xs font-medium">
                              <Check className="w-3 h-3" />
                              Connecté
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleConnect(provider.key)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-foreground text-white hover:opacity-90 transition-opacity"
                            >
                              <Link2 className="w-3 h-3" />
                              Connecter
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    router.push("/");
                    router.refresh();
                  }}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {Object.values(integrations).some((i) => i.connected)
                    ? "Continuer"
                    : "Passer et continuer"}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
