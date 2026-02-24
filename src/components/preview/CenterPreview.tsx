"use client";

import { useStore } from "@/store/useStore";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe,
  Box,
  Sparkles,
  RefreshCw,
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Tag,
} from "lucide-react";
import { WebsitePreview } from "@/components/preview/WebsitePreview";
import { IAPreviewView } from "@/components/preview/IAPreviewView";
import { ArchitectureView } from "@/components/architecture/ArchitectureView";
import type { ViewMode } from "@/types";

export function CenterPreview() {
  const viewMode = useStore((s) => s.viewMode);
  const setViewMode = useStore((s) => s.setViewMode);
  const selectedPageUrl = useStore((s) => s.selectedPageUrl);
  const project = useStore((s) => s.project);
  const trainingStatus = useStore((s) => s.trainingStatus);

  // retryCount forces iframe reload
  const [retryCount, setRetryCount] = useState(0);

  const tabs: { key: ViewMode; label: string; icon: typeof Tag }[] = [
    { key: "live-tagging", label: "Live Tagging", icon: Tag },
    { key: "ia-preview", label: "IA Preview", icon: Sparkles },
    { key: "architecture", label: "Architecture", icon: Box },
  ];

  // Browser controls — communicate with iframe via postMessage
  const postToIframe = (type: string) => {
    const iframe = document.querySelector<HTMLIFrameElement>(
      'iframe[title="Website Preview"], iframe[title="IA Preview"]'
    );
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage({ type }, "*");
    }
  };

  const handleBack = () => postToIframe("agency-history-back");
  const handleForward = () => postToIframe("agency-history-forward");
  const handleRefresh = () => setRetryCount((c) => c + 1);
  const handleExternalLink = () => {
    const url = selectedPageUrl || project?.websiteUrl;
    if (url) window.open(url, "_blank");
  };

  const showBrowserControls = viewMode === "live-tagging" || viewMode === "ia-preview";
  const displayUrl = selectedPageUrl || project?.websiteUrl || "https://";

  return (
    <div className="flex flex-col h-full">
      {/* Preview Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-light">
        {/* Tabs */}
        <div className="flex items-center gap-1 bg-muted rounded-xl p-0.5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = viewMode === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setViewMode(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? "bg-white text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Browser controls — shown for Live Tagging & IA Preview */}
        {showBrowserControls && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <button
                onClick={handleBack}
                className="p-1 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                title="Retour"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleForward}
                className="p-1 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                title="Avancer"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleRefresh}
                className="p-1 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                title="Recharger"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* URL Bar */}
            <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-1.5 min-w-[200px]">
              <Globe className="w-3 h-3 text-muted-foreground flex-shrink-0" />
              <span className="text-xs text-muted-foreground truncate">
                {displayUrl}
              </span>
            </div>

            <button
              onClick={handleExternalLink}
              className="p-1 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              title="Ouvrir dans un nouvel onglet"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          {viewMode === "live-tagging" && (
            <motion.div
              key="live-tagging"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0"
            >
              <WebsitePreview retryCount={retryCount} onRetry={handleRefresh} />
            </motion.div>
          )}

          {viewMode === "ia-preview" && (
            <motion.div
              key="ia-preview"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0"
            >
              {trainingStatus === "complete" ? (
                <IAPreviewView retryCount={retryCount} />
              ) : (
                <TrainingPlaceholder status={trainingStatus} label="IA Preview" />
              )}
            </motion.div>
          )}

          {viewMode === "architecture" && (
            <motion.div
              key="architecture"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0"
            >
              {trainingStatus === "complete" ? (
                <ArchitectureView />
              ) : (
                <TrainingPlaceholder status={trainingStatus} label="Architecture" />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function TrainingPlaceholder({
  status,
  label,
}: {
  status: "not_started" | "in_progress" | "complete";
  label: string;
}) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-8">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <Sparkles className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-sm font-semibold mb-1">{label}</h3>
      <p className="text-xs text-muted-foreground max-w-[280px]">
        {status === "not_started"
          ? "L'entraînement IA n'a pas encore été lancé. Configurez-le dans les paramètres du projet."
          : "L'entraînement IA est en cours... Cette vue sera disponible une fois l'entraînement terminé."}
      </p>
      {status === "in_progress" && (
        <div className="mt-4 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-info animate-pulse" />
          <span className="text-[10px] text-muted-foreground font-medium">
            Entraînement en cours
          </span>
        </div>
      )}
    </div>
  );
}
