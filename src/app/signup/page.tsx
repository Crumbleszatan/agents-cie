"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Zap, Mail, Lock, User, ArrowRight, Chrome, Building2 } from "lucide-react";
import Link from "next/link";

export default function SignupPage() {
  const [step, setStep] = useState<"account" | "organization">("account");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Step 1: Create account
    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (signupError) {
      setError(signupError.message);
      setLoading(false);
      return;
    }

    // If email confirmation is enabled, signUp returns user but no session.
    // In that case, auto-sign in to get a session and continue the flow.
    if (data.user && !data.session) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        // If auto sign-in fails (confirmation strictly enforced), still move to org step
        // The user will be asked to confirm later
        console.warn("Auto sign-in after signup failed:", signInError.message);
      }
    }

    // Move to organization step
    if (data.user) {
      setStep("organization");
      setLoading(false);
    }
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
        className="w-full max-w-[400px]"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-foreground rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Agen.cy</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {step === "account"
              ? "Créez votre compte"
              : "Créez votre organisation"}
          </p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
              step === "account"
                ? "bg-foreground text-white"
                : "bg-muted text-muted-foreground"
            }`}
          >
            <User className="w-3 h-3" />
            Compte
          </div>
          <div className="w-4 h-px bg-border" />
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
              step === "organization"
                ? "bg-foreground text-white"
                : "bg-muted text-muted-foreground"
            }`}
          >
            <Building2 className="w-3 h-3" />
            Organisation
          </div>
        </div>

        {/* Card */}
        <div className="panel shadow-soft p-6 space-y-5">
          {step === "account" ? (
            <>
              {/* Google OAuth */}
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
            </>
          ) : (
            <form onSubmit={handleCreateOrg} className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Chaque utilisateur fait partie d&apos;une organisation qui contient ses projets.
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
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Créer l&apos;organisation
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
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
