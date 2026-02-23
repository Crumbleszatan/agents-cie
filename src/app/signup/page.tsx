"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, Mail, Lock, User, ArrowRight, Chrome,
  Building2, FolderKanban, Globe, GitBranch, LayoutGrid,
  Check,
} from "lucide-react";
import Link from "next/link";

type Step = "account" | "organization" | "project";

export default function SignupPage() {
  const [step, setStep] = useState<Step>("account");
  // Account
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Organization
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [orgId, setOrgId] = useState<string | null>(null);
  // Project
  const [projectName, setProjectName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [gitProvider, setGitProvider] = useState("");
  const [gitRepoUrl, setGitRepoUrl] = useState("");
  const [jiraKey, setJiraKey] = useState("");
  const [jiraBaseUrl, setJiraBaseUrl] = useState("");
  const [frontOfficeUrl, setFrontOfficeUrl] = useState("");
  const [backOfficeUrl, setBackOfficeUrl] = useState("");
  // UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const steps: { key: Step; label: string; icon: typeof User }[] = [
    { key: "account", label: "Compte", icon: User },
    { key: "organization", label: "Organisation", icon: Building2 },
    { key: "project", label: "Projet", icon: FolderKanban },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === step);

  // ─── Step 1: Create Account ───
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    if (signupError) {
      setError(signupError.message);
      setLoading(false);
      return;
    }

    // Auto sign-in if email confirmation returns user without session
    if (data.user && !data.session) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        console.warn("Auto sign-in after signup failed:", signInError.message);
      }
    }

    if (data.user) {
      setStep("organization");
      setLoading(false);
    }
  };

  // ─── Step 2: Create Organization ───
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

  // ─── Step 3: Create First Project ───
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

  const handleGoogleSignup = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 40);
  };

  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[440px]"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-foreground rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Agen.cy</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {step === "account" && "Créez votre compte"}
            {step === "organization" && "Créez votre organisation"}
            {step === "project" && "Créez votre premier projet"}
          </p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {steps.map((s, i) => {
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
                  {isDone ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Icon className="w-3 h-3" />
                  )}
                  {s.label}
                </div>
                {i < steps.length - 1 && (
                  <div
                    className={`w-4 h-px mx-1 ${
                      isDone ? "bg-foreground" : "bg-border"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Card */}
        <div className="panel shadow-soft p-6">
          <AnimatePresence mode="wait">
            {/* ─── STEP 1: ACCOUNT ─── */}
            {step === "account" && (
              <motion.div
                key="account"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                <button
                  onClick={handleGoogleSignup}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-border hover:bg-muted transition-all text-sm font-medium disabled:opacity-50"
                >
                  <Chrome className="w-4 h-4" />
                  S&apos;inscrire avec Google
                </button>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-border-light" />
                  <span className="text-[11px] text-muted-foreground">ou</span>
                  <div className="flex-1 h-px bg-border-light" />
                </div>

                <form onSubmit={handleSignup} className="space-y-3">
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                      Nom complet
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Jean Dupont"
                        className="input-clean w-full pl-10"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="vous@exemple.com"
                        className="input-clean w-full pl-10"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                      Mot de passe
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Min. 6 caractères"
                        className="input-clean w-full pl-10"
                        required
                        minLength={6}
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
                    disabled={loading}
                    className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        Créer le compte
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            )}

            {/* ─── STEP 2: ORGANIZATION ─── */}
            {step === "organization" && (
              <motion.div
                key="organization"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <form onSubmit={handleCreateOrg} className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Votre organisation regroupe votre équipe et vos projets.
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
                      <span className="text-xs text-muted-foreground">agency.app/</span>
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

            {/* ─── STEP 3: FIRST PROJECT ─── */}
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
                    Configurez votre premier projet. Les intégrations sont optionnelles.
                  </p>

                  {/* Project name */}
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

                  {/* Website URL */}
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

                  {/* Git section */}
                  <div className="pt-2 border-t border-border-light">
                    <p className="text-[11px] font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                      <GitBranch className="w-3 h-3" />
                      Git Repository
                    </p>
                    <div className="space-y-2">
                      <select
                        value={gitProvider}
                        onChange={(e) => setGitProvider(e.target.value)}
                        className="input-clean w-full text-sm"
                      >
                        <option value="">Aucun</option>
                        <option value="github">GitHub</option>
                        <option value="gitlab">GitLab</option>
                        <option value="bitbucket">Bitbucket</option>
                      </select>
                      {gitProvider && (
                        <input
                          type="url"
                          value={gitRepoUrl}
                          onChange={(e) => setGitRepoUrl(e.target.value)}
                          placeholder="https://github.com/org/repo"
                          className="input-clean w-full text-sm"
                        />
                      )}
                    </div>
                  </div>

                  {/* Jira section */}
                  <div className="pt-2 border-t border-border-light">
                    <p className="text-[11px] font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                      <LayoutGrid className="w-3 h-3" />
                      Jira / Atlassian
                    </p>
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={jiraBaseUrl}
                        onChange={(e) => setJiraBaseUrl(e.target.value)}
                        placeholder="https://monequipe.atlassian.net"
                        className="input-clean w-full text-sm"
                      />
                      {jiraBaseUrl && (
                        <input
                          type="text"
                          value={jiraKey}
                          onChange={(e) => setJiraKey(e.target.value)}
                          placeholder="Clé du projet (ex: PROJ)"
                          className="input-clean w-full text-sm"
                        />
                      )}
                    </div>
                  </div>

                  {/* URLs section */}
                  <div className="pt-2 border-t border-border-light">
                    <p className="text-[11px] font-semibold text-muted-foreground mb-2">
                      URLs Front / Back office
                    </p>
                    <div className="space-y-2">
                      <input
                        type="url"
                        value={frontOfficeUrl}
                        onChange={(e) => setFrontOfficeUrl(e.target.value)}
                        placeholder="URL front office (prod)"
                        className="input-clean w-full text-sm"
                      />
                      <input
                        type="url"
                        value={backOfficeUrl}
                        onChange={(e) => setBackOfficeUrl(e.target.value)}
                        placeholder="URL back office (admin)"
                        className="input-clean w-full text-sm"
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

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-4">
          Déjà un compte ?{" "}
          <Link href="/login" className="text-foreground font-medium hover:underline">
            Se connecter
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
