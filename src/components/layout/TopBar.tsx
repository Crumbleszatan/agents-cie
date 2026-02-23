"use client";

import { useStore } from "@/store/useStore";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useProjects } from "@/hooks/useProjects";
import { useEffect, useState, useRef } from "react";
import {
  GitBranch,
  LayoutGrid,
  Zap,
  ChevronDown,
  ExternalLink,
  Hammer,
  Grid3X3,
  Rocket,
  Settings,
  LogOut,
  FolderKanban,
  Plus,
  Check,
  Building2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import type { AppPhase } from "@/types";

export function TopBar() {
  const project = useStore((s) => s.project);
  const context = useStore((s) => s.context);
  const currentStory = useStore((s) => s.currentStory);
  const appPhase = useStore((s) => s.appPhase);
  const setAppPhase = useStore((s) => s.setAppPhase);
  const stories = useStore((s) => s.stories);
  const saveCurrentStory = useStore((s) => s.saveCurrentStory);
  const currentProjectId = useStore((s) => s.currentProjectId);
  const setCurrentProjectId = useStore((s) => s.setCurrentProjectId);
  const setCurrentOrgId = useStore((s) => s.setCurrentOrgId);
  const setSelectedPageUrl = useStore((s) => s.setSelectedPageUrl);
  const setProject = useStore((s) => s.setProject);
  const resetForProjectSwitch = useStore((s) => s.resetForProjectSwitch);

  const { user, signOut } = useAuth();
  const { currentOrg } = useOrganization();
  const { projects, currentProject, setCurrentProject } = useProjects(currentOrg?.id ?? null);

  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const projectDropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Sync org ID to store
  useEffect(() => {
    if (currentOrg) {
      setCurrentOrgId(currentOrg.id);
    }
  }, [currentOrg, setCurrentOrgId]);

  // Sync project from DB to store — update website URL + project info
  useEffect(() => {
    if (currentProject) {
      setCurrentProjectId(currentProject.id);
      // Sync website URL for the preview iframe
      if (currentProject.website_url) {
        setSelectedPageUrl(currentProject.website_url);
      }
      // Sync Project object for chat context
      setProject({
        id: currentProject.id,
        name: currentProject.name,
        websiteUrl: currentProject.website_url || "",
        brandContext: {
          name: currentProject.name,
          industry: "",
          tone: "professional",
          colors: [],
          description: currentProject.description || "",
        },
        integrations: {
          jira: {
            connected: !!currentProject.atlassian_project_key,
            projectKey: currentProject.atlassian_project_key || "",
            baseUrl: currentProject.atlassian_base_url || "",
            backlogItems: [],
          },
          git: {
            connected: !!currentProject.git_provider,
            provider: (currentProject.git_provider as "github" | "gitlab" | "bitbucket") || "github",
            repoUrl: currentProject.git_repo_url || "",
            defaultBranch: currentProject.git_default_branch || "main",
          },
          website: {
            connected: !!currentProject.website_url,
            url: currentProject.website_url || "",
            sitemapPages: [],
          },
        },
        architecture: { nodes: [], edges: [] },
      });
    }
  }, [currentProject, setCurrentProjectId, setSelectedPageUrl, setProject]);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(e.target as Node)) {
        setShowProjectDropdown(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const phases: { key: AppPhase; label: string; icon: typeof Hammer; num: string }[] = [
    { key: "build", label: "Build", icon: Hammer, num: "01" },
    { key: "prioritize", label: "Prioritize", icon: Grid3X3, num: "02" },
    { key: "ship", label: "Ship", icon: Rocket, num: "03" },
  ];

  const currentPhaseIndex = phases.findIndex((p) => p.key === appPhase);

  const handlePhaseChange = (phase: AppPhase) => {
    if (appPhase === "build" && phase !== "build") {
      saveCurrentStory();
    }
    setAppPhase(phase);
  };

  const buildSubPhases = [
    { key: "discovery", label: "Discovery" },
    { key: "specification", label: "Specification" },
    { key: "refinement", label: "Refinement" },
    { key: "review", label: "Review" },
  ];
  const currentSubPhaseIndex = buildSubPhases.findIndex(
    (p) => p.key === context.phase
  );

  const displayProjectName = currentProject?.name || project?.name || "Aucun projet";

  return (
    <div className="h-14 flex items-center px-4 border-b border-border-light bg-white/80 backdrop-blur-sm">
      {/* Logo & Org & Project Switcher */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="w-7 h-7 bg-foreground rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-sm tracking-tight">Agen.cy</span>
        </Link>

        {currentOrg && (
          <>
            <div className="w-px h-5 bg-border" />
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              {currentOrg.name}
            </span>
          </>
        )}

        <div className="w-px h-5 bg-border" />
        <div className="relative" ref={projectDropdownRef}>
          <button
            onClick={() => setShowProjectDropdown(!showProjectDropdown)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-muted"
          >
            <FolderKanban className="w-3.5 h-3.5" />
            <span className="max-w-[140px] truncate">{displayProjectName}</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${showProjectDropdown ? "rotate-180" : ""}`} />
          </button>

          <AnimatePresence>
            {showProjectDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                transition={{ duration: 0.12 }}
                className="absolute top-full left-0 mt-1 w-64 bg-white rounded-xl border border-border shadow-lg z-50 py-1 overflow-hidden"
              >
                <div className="px-3 py-2 border-b border-border-light">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                    Projets
                  </p>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {projects.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        if (currentProject?.id !== p.id) {
                          resetForProjectSwitch();
                          setCurrentProject(p);
                        }
                        setShowProjectDropdown(false);
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-muted transition-colors ${
                        currentProject?.id === p.id ? "bg-muted" : ""
                      }`}
                    >
                      <FolderKanban className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="truncate flex-1">{p.name}</span>
                      {currentProject?.id === p.id && (
                        <Check className="w-3 h-3 text-foreground flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
                <div className="border-t border-border-light">
                  <Link
                    href="/dashboard"
                    onClick={() => setShowProjectDropdown(false)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Gérer les projets
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
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
        {currentProject?.git_provider && (
          <div className="tag">
            <GitBranch className="w-3 h-3" />
            {currentProject.git_provider}
          </div>
        )}
        {currentProject?.atlassian_project_key && (
          <div className="tag">
            <LayoutGrid className="w-3 h-3" />
            {currentProject.atlassian_project_key}
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

        {/* User menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="w-8 h-8 bg-muted rounded-full flex items-center justify-center text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            {user?.email?.charAt(0).toUpperCase() || "?"}
          </button>

          <AnimatePresence>
            {showUserMenu && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                transition={{ duration: 0.12 }}
                className="absolute top-full right-0 mt-1 w-48 bg-white rounded-xl border border-border shadow-lg z-50 py-1 overflow-hidden"
              >
                <div className="px-3 py-2 border-b border-border-light">
                  <p className="text-xs font-medium truncate">{user?.email}</p>
                </div>
                <Link
                  href="/dashboard"
                  onClick={() => setShowUserMenu(false)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <Settings className="w-3.5 h-3.5" />
                  Administration
                </Link>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    signOut();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Se déconnecter
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
