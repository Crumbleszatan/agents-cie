"use client";

import { useStore } from "@/store/useStore";
import {
  Globe,
  GitBranch,
  LayoutGrid,
  Zap,
  ChevronDown,
  ExternalLink,
  Hammer,
  Grid3X3,
  Rocket,
} from "lucide-react";
import { motion } from "framer-motion";
import type { AppPhase } from "@/types";

export function TopBar() {
  const project = useStore((s) => s.project);
  const context = useStore((s) => s.context);
  const currentStory = useStore((s) => s.currentStory);
  const appPhase = useStore((s) => s.appPhase);
  const setAppPhase = useStore((s) => s.setAppPhase);
  const stories = useStore((s) => s.stories);
  const saveCurrentStory = useStore((s) => s.saveCurrentStory);

  const phases: { key: AppPhase; label: string; icon: typeof Hammer; num: string }[] = [
    { key: "build", label: "Build", icon: Hammer, num: "01" },
    { key: "prioritize", label: "Prioritize", icon: Grid3X3, num: "02" },
    { key: "ship", label: "Ship", icon: Rocket, num: "03" },
  ];

  const currentPhaseIndex = phases.findIndex((p) => p.key === appPhase);

  const handlePhaseChange = (phase: AppPhase) => {
    // Save current story when leaving build
    if (appPhase === "build" && phase !== "build") {
      saveCurrentStory();
    }
    setAppPhase(phase);
  };

  // Sub-phases for Build
  const buildSubPhases = [
    { key: "discovery", label: "Discovery" },
    { key: "specification", label: "Specification" },
    { key: "refinement", label: "Refinement" },
    { key: "review", label: "Review" },
  ];
  const currentSubPhaseIndex = buildSubPhases.findIndex(
    (p) => p.key === context.phase
  );

  return (
    <div className="h-14 flex items-center px-4 border-b border-border-light bg-white/80 backdrop-blur-sm">
      {/* Logo & Project */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-foreground rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-sm tracking-tight">Agen.cy</span>
        </div>
        {project && (
          <>
            <div className="w-px h-5 bg-border" />
            <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <Globe className="w-3.5 h-3.5" />
              {project.name}
              <ChevronDown className="w-3 h-3" />
            </button>
          </>
        )}
      </div>

      {/* Main Phase Navigation */}
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
          {phases.map((phase, i) => {
            const Icon = phase.icon;
            const isActive = i === currentPhaseIndex;
            const isPast = i < currentPhaseIndex;

            return (
              <div key={phase.key} className="flex items-center">
                <motion.button
                  onClick={() => handlePhaseChange(phase.key)}
                  className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? "bg-foreground text-white shadow-sm"
                      : isPast
                      ? "bg-white text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {phase.label}
                  {phase.key === "build" && stories.length > 0 && (
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded-md ${
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {stories.length}
                    </span>
                  )}
                </motion.button>
                {i < phases.length - 1 && (
                  <div
                    className={`w-4 h-px mx-0.5 ${
                      i < currentPhaseIndex ? "bg-foreground" : "bg-border"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Build sub-phases — only visible in Build */}
        {appPhase === "build" && (
          <div className="flex items-center ml-4 gap-0.5">
            {buildSubPhases.map((phase, i) => (
              <div key={phase.key} className="flex items-center">
                <span
                  className={`text-[10px] px-2 py-1 rounded-md font-medium ${
                    i === currentSubPhaseIndex
                      ? "bg-muted text-foreground"
                      : i < currentSubPhaseIndex
                      ? "text-foreground"
                      : "text-muted-foreground/50"
                  }`}
                >
                  {phase.label}
                </span>
                {i < buildSubPhases.length - 1 && (
                  <div
                    className={`w-3 h-px ${
                      i < currentSubPhaseIndex
                        ? "bg-foreground"
                        : "bg-border-light"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2">
        {project?.integrations.git?.connected && (
          <div className="tag">
            <GitBranch className="w-3 h-3" />
            Git
          </div>
        )}
        {project?.integrations.jira?.connected && (
          <div className="tag">
            <LayoutGrid className="w-3 h-3" />
            Jira
          </div>
        )}
        {appPhase === "build" && currentStory.title && (
          <div className="tag tag-info">
            {currentStory.status === "draft"
              ? "Draft"
              : currentStory.status === "refining"
              ? "Refining"
              : "Ready"}
          </div>
        )}
        {appPhase === "build" && (
          <button
            onClick={() => {
              saveCurrentStory();
              setAppPhase("prioritize");
            }}
            className="btn-primary flex items-center gap-1.5 text-xs"
          >
            Sauvegarder &amp; Prioriser
            <ExternalLink className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}
