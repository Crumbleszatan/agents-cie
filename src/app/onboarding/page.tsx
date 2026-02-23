"use client";

import { createClient } from "@/lib/supabase/client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, Building2, ArrowRight, FolderKanban, Globe, Check,
} from "lucide-react";

type Step = "organization" | "project";

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>("organization");
  // Organization
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [orgId, setOrgId] = useState<string | null>(null);
  // Project
  const [projectName, setProjectName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  // UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  // Check if user already has an org
  useEffect(() => {
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

      router.push("/");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Erreur réseau");
      setLoading(false);
    }
  };

  const stepsConfig = [
    { key: "organization" as const, label: "Organisation", icon: Building2 },
    { key: "project" as const, label: "Projet", icon: FolderKanban },
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
            {step === "organization"
              ? "Créez votre organisation pour commencer"
              : "Configurez votre premier projet"}
          </p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {stepsConfig.map((s, i) => {
            const Icon = s.icon;
            const isActive = i === currentStepIndex;
            const isDone = i < currentStepIndex;
            return (
              <div key={s.key} className="flex items-center">
                <div
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
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
                  <div className={`w-4 h-px mx-1 ${isDone ? "bg-foreground" : "bg-border"}`} />
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
                    Créez votre premier projet. Vous pourrez configurer Git et Jira ensuite depuis les paramètres.
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
                        Lancer le projet
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
