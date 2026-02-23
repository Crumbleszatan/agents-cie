"use client";

import { useState } from "react";
import { useStore } from "@/store/useStore";
import { uuid } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  Globe,
  GitBranch,
  LayoutGrid,
  ArrowRight,
  ArrowLeft,
  Check,
  ExternalLink,
  Link2,
  Loader2,
} from "lucide-react";
import type { Project } from "@/types";

const steps = [
  {
    id: "welcome",
    title: "Bienvenue sur Agen.cy",
    subtitle: "Construisons vos besoins website intelligemment",
  },
  {
    id: "project",
    title: "Votre projet",
    subtitle: "Informations de base sur votre client",
  },
  {
    id: "website",
    title: "Website",
    subtitle: "Connectez le site de votre client",
  },
  {
    id: "integrations",
    title: "Intégrations",
    subtitle: "Connectez vos outils",
  },
];

export function OnboardingFlow() {
  const setProject = useStore((s) => s.setProject);
  const setOnboarded = useStore((s) => s.setOnboarded);
  const setSelectedPageUrl = useStore((s) => s.setSelectedPageUrl);

  const [currentStep, setCurrentStep] = useState(0);
  const [projectName, setProjectName] = useState("");
  const [industry, setIndustry] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [jiraConnected, setJiraConnected] = useState(false);
  const [gitConnected, setGitConnected] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [direction, setDirection] = useState(1);

  const goNext = () => {
    setDirection(1);
    setCurrentStep((s) => Math.min(s + 1, steps.length - 1));
  };
  const goPrev = () => {
    setDirection(-1);
    setCurrentStep((s) => Math.max(s - 1, 0));
  };

  const handleConnect = async (service: string) => {
    setConnecting(service);
    // Simulate connection
    await new Promise((r) => setTimeout(r, 1500));
    if (service === "jira") setJiraConnected(true);
    if (service === "git") setGitConnected(true);
    setConnecting(null);
  };

  const handleFinish = () => {
    const project: Project = {
      id: uuid(),
      name: projectName || "Mon Projet",
      websiteUrl: websiteUrl,
      brandContext: {
        name: projectName,
        industry: industry,
        tone: "professional",
        colors: [],
        description: "",
      },
      integrations: {
        jira: {
          connected: jiraConnected,
          projectKey: "PROJ",
          baseUrl: "",
          backlogItems: [],
        },
        git: {
          connected: gitConnected,
          provider: "github",
          repoUrl: "",
          defaultBranch: "main",
        },
        website: {
          connected: !!websiteUrl,
          url: websiteUrl,
          sitemapPages: [],
        },
      },
      architecture: { nodes: [], edges: [] },
    };

    setProject(project);
    if (websiteUrl) setSelectedPageUrl(websiteUrl);
    setOnboarded(true);
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return true;
      case 1:
        return projectName.trim().length > 0;
      case 2:
        return true; // Website is optional
      case 3:
        return true; // Integrations are optional
      default:
        return true;
    }
  };

  const isLastStep = currentStep === steps.length - 1;

  return (
    <div className="h-full flex items-center justify-center bg-[#fafafa]">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((step, i) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                  i === currentStep
                    ? "bg-foreground text-white"
                    : i < currentStep
                    ? "bg-foreground text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {i < currentStep ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`w-12 h-px mx-2 transition-colors ${
                    i < currentStep ? "bg-foreground" : "bg-border"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="panel shadow-elevated p-8 min-h-[380px] flex flex-col">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              initial={{ opacity: 0, x: direction * 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -30 }}
              transition={{ duration: 0.25 }}
              className="flex-1 flex flex-col"
            >
              {/* Step 0: Welcome */}
              {currentStep === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 bg-foreground rounded-2xl flex items-center justify-center mb-6">
                    <Zap className="w-8 h-8 text-white" />
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight mb-2">
                    {steps[0].title}
                  </h1>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    L&apos;IA vous accompagne dans la construction de vos User Stories
                    en tenant compte du contexte technique et métier de votre client.
                  </p>
                  <div className="flex items-center gap-4 mt-8 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5" />
                      Preview live
                    </div>
                    <div className="w-px h-3 bg-border" />
                    <div className="flex items-center gap-1.5">
                      <LayoutGrid className="w-3.5 h-3.5" />
                      Export Jira
                    </div>
                    <div className="w-px h-3 bg-border" />
                    <div className="flex items-center gap-1.5">
                      <GitBranch className="w-3.5 h-3.5" />
                      Intégration Git
                    </div>
                  </div>
                </div>
              )}

              {/* Step 1: Project Info */}
              {currentStep === 1 && (
                <div className="flex-1 flex flex-col">
                  <h2 className="text-lg font-bold mb-1">{steps[1].title}</h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    {steps[1].subtitle}
                  </p>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                        Nom du projet
                      </label>
                      <input
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        placeholder="ex: Refonte E-commerce Acme"
                        className="input-clean w-full"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                        Secteur d&apos;activité
                      </label>
                      <input
                        value={industry}
                        onChange={(e) => setIndustry(e.target.value)}
                        placeholder="ex: E-commerce, SaaS, Media..."
                        className="input-clean w-full"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Website */}
              {currentStep === 2 && (
                <div className="flex-1 flex flex-col">
                  <h2 className="text-lg font-bold mb-1">{steps[2].title}</h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    {steps[2].subtitle}
                  </p>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                      URL du website
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 flex items-center gap-2 input-clean">
                        <Link2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <input
                          value={websiteUrl}
                          onChange={(e) => setWebsiteUrl(e.target.value)}
                          placeholder="https://www.exemple.com"
                          className="flex-1 bg-transparent outline-none text-sm"
                        />
                      </div>
                      {websiteUrl && (
                        <a
                          href={websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2.5 rounded-xl hover:bg-muted transition-colors"
                        >
                          <ExternalLink className="w-4 h-4 text-muted-foreground" />
                        </a>
                      )}
                    </div>
                    {websiteUrl && (
                      <p className="text-[11px] text-muted-foreground mt-2">
                        Le site sera chargé dans un iframe pour la prévisualisation
                        et la sélection de zones d&apos;impact.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Step 3: Integrations */}
              {currentStep === 3 && (
                <div className="flex-1 flex flex-col">
                  <h2 className="text-lg font-bold mb-1">{steps[3].title}</h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    {steps[3].subtitle}
                  </p>
                  <div className="space-y-3">
                    <IntegrationCard
                      icon={LayoutGrid}
                      title="Jira / Atlassian"
                      description="Backlog, export de tickets, contexte projet"
                      connected={jiraConnected}
                      connecting={connecting === "jira"}
                      onConnect={() => handleConnect("jira")}
                    />
                    <IntegrationCard
                      icon={GitBranch}
                      title="GitHub / GitLab"
                      description="Code source, architecture, branches"
                      connected={gitConnected}
                      connecting={connecting === "git"}
                      onConnect={() => handleConnect("git")}
                    />
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-border-light">
            <button
              onClick={goPrev}
              disabled={currentStep === 0}
              className={`flex items-center gap-1.5 text-xs font-medium transition-all ${
                currentStep === 0
                  ? "text-muted-foreground/30 cursor-not-allowed"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Retour
            </button>

            <button
              onClick={isLastStep ? handleFinish : goNext}
              disabled={!canProceed()}
              className={`btn-primary flex items-center gap-1.5 ${
                !canProceed() ? "opacity-40 cursor-not-allowed" : ""
              }`}
            >
              {isLastStep ? "Commencer" : "Suivant"}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function IntegrationCard({
  icon: Icon,
  title,
  description,
  connected,
  connecting,
  onConnect,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  connected: boolean;
  connecting: boolean;
  onConnect: () => void;
}) {
  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
        connected ? "border-success/30 bg-success/5" : "border-border-light hover:border-foreground/10"
      }`}
    >
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
          connected ? "bg-success/10" : "bg-muted"
        }`}
      >
        <Icon
          className={`w-5 h-5 ${
            connected ? "text-success" : "text-muted-foreground"
          }`}
        />
      </div>
      <div className="flex-1">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-[11px] text-muted-foreground">{description}</div>
      </div>
      {connected ? (
        <div className="flex items-center gap-1 tag tag-success">
          <Check className="w-3 h-3" />
          Connecté
        </div>
      ) : (
        <button
          onClick={onConnect}
          disabled={connecting}
          className="btn-secondary flex items-center gap-1.5"
        >
          {connecting ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Link2 className="w-3 h-3" />
          )}
          {connecting ? "Connexion..." : "Connecter"}
        </button>
      )}
    </div>
  );
}
