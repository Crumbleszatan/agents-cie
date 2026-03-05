"use client";

import { useState, useMemo } from "react";
import { useStore } from "@/store/useStore";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  Wrench,
  GripVertical,
  X,
  Zap,
  Users,
  Clock,
  Hash,
  CalendarCheck,
  TrendingUp,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Circle,
} from "lucide-react";
import type { UserStory, Epic } from "@/types";
import { computePhaseCapacity, addWorkingDays, formatDateFull } from "@/components/release/releaseUtils";

interface ShipContainerProps {
  title: string;
  mode: "full-ai" | "engineer-ai";
  stories: UserStory[];
  epics: Epic[];
  onStoryClick: (id: string) => void;
  onDrop: (storyId: string) => void;
  onUnship: (storyId: string) => void;
  onAction?: () => void;
  selectedDetailId: string | null;
}

/* ── Priority config ── */
const priorityConfig: Record<string, { label: string; color: string; icon: typeof AlertCircle }> = {
  critical: { label: "Critique", color: "text-red-500", icon: AlertCircle },
  high: { label: "Haute", color: "text-orange-500", icon: TrendingUp },
  medium: { label: "Moyenne", color: "text-amber-500", icon: Circle },
  low: { label: "Basse", color: "text-slate-400", icon: Circle },
};

export function ShipContainer({
  title,
  mode,
  stories,
  epics,
  onStoryClick,
  onDrop,
  onUnship,
  onAction,
  selectedDetailId,
}: ShipContainerProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const isViolet = mode === "full-ai";

  const teamMembers = useStore((s) => s.teamMembers);
  const projectConfig = useStore((s) => s.projectConfig);

  /* ── KPIs computation (capacity-driven) ── */
  const kpis = useMemo(() => {
    const totalPoints = stories.reduce((sum, s) => sum + (s.storyPoints || 0), 0);
    const totalHours = stories.reduce((sum, s) => sum + (s.estimatedHours || 0), 0);
    const count = stories.length;
    const { devCapacity } = computePhaseCapacity(teamMembers);

    // Duration in working days based on team capacity
    const durationDays = totalPoints > 0 && devCapacity > 0
      ? Math.ceil(totalPoints / devCapacity)
      : 0;

    // Estimated delivery date (holiday-aware)
    const now = new Date();
    const deliveryDate = durationDays > 0
      ? addWorkingDays(now, durationDays, projectConfig.holidayCountry)
      : now;

    // Count stories without estimates (warning)
    const missingEstimates = stories.filter((s) => {
      if (projectConfig.estimationUnit === "sp") return !s.storyPoints || s.storyPoints <= 0;
      return !s.estimatedHours || s.estimatedHours <= 0;
    }).length;

    return {
      totalPoints,
      totalHours,
      count,
      durationDays,
      deliveryDate,
      devCapacity,
      missingEstimates,
    };
  }, [stories, teamMembers, projectConfig]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const storyId = e.dataTransfer.getData("text/plain");
    if (storyId) {
      onDrop(storyId);
    }
  };

  const handleDragStart = (e: React.DragEvent, storyId: string) => {
    e.dataTransfer.setData("text/plain", storyId);
    e.dataTransfer.effectAllowed = "move";
  };

  const getEpic = (epicId?: string) => epicId ? epics.find((e) => e.id === epicId) : null;

  return (
    <div
      className={`flex-1 min-h-0 rounded-xl border-2 transition-all flex flex-col overflow-hidden ${
        isDragOver
          ? isViolet
            ? "border-violet-400 bg-violet-50/50"
            : "border-amber-400 bg-amber-50/50"
          : "border-border-light bg-white"
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* ── Header ── */}
      <div className={`px-4 py-2.5 border-b border-border-light flex items-center gap-2 ${
        isViolet ? "bg-violet-50/50" : "bg-amber-50/50"
      }`}>
        <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
          isViolet ? "bg-violet-100" : "bg-amber-100"
        }`}>
          {isViolet ? (
            <Bot className="w-3.5 h-3.5 text-violet-600" />
          ) : (
            <Wrench className="w-3.5 h-3.5 text-amber-600" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-xs font-semibold">{title}</h3>
        </div>
        {/* Action button */}
        {stories.length > 0 && onAction && (
          <button
            onClick={onAction}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
              isViolet
                ? "bg-violet-600 text-white hover:bg-violet-700"
                : "bg-amber-600 text-white hover:bg-amber-700"
            }`}
          >
            {isViolet ? (
              <>
                <Zap className="w-3 h-3" />
                Instant Build
              </>
            ) : (
              <>
                <Users className="w-3 h-3" />
                Sent to Team
              </>
            )}
          </button>
        )}
      </div>

      {/* ── KPI Bar ── */}
      {stories.length > 0 && (
        <div className={`px-3 py-2 border-b border-border-light flex items-center gap-3 flex-wrap ${
          isViolet ? "bg-violet-50/30" : "bg-amber-50/30"
        }`}>
          <div className="flex items-center gap-1" title="Nombre de US">
            <Hash className="w-3 h-3 text-muted-foreground" />
            <span className="text-[11px] font-bold">{kpis.count}</span>
            <span className="text-[10px] text-muted-foreground">US</span>
          </div>
          <div className="w-px h-3.5 bg-border-light" />
          <div className="flex items-center gap-1" title="Story Points total">
            <TrendingUp className={`w-3 h-3 ${isViolet ? "text-violet-400" : "text-amber-400"}`} />
            <span className="text-[11px] font-bold">{kpis.totalPoints}</span>
            <span className="text-[10px] text-muted-foreground">SP</span>
          </div>
          <div className="w-px h-3.5 bg-border-light" />
          <div className="flex items-center gap-1" title="Durée estimée en jours ouvrés">
            <Clock className="w-3 h-3 text-muted-foreground" />
            <span className="text-[11px] font-bold">
              {kpis.durationDays > 0 ? `${kpis.durationDays}j` : "—"}
            </span>
            <span className="text-[10px] text-muted-foreground">ouvrés</span>
          </div>
          <div className="w-px h-3.5 bg-border-light" />
          <div className="flex items-center gap-1" title="Date de livraison estimée">
            <CalendarCheck className={`w-3 h-3 ${isViolet ? "text-violet-400" : "text-amber-400"}`} />
            <span className="text-[11px] font-semibold">
              {kpis.durationDays > 0 ? formatDateFull(kpis.deliveryDate) : "—"}
            </span>
          </div>
          {kpis.missingEstimates > 0 && (
            <>
              <div className="w-px h-3.5 bg-border-light" />
              <div className="flex items-center gap-1" title="US sans estimation">
                <AlertCircle className="w-3 h-3 text-amber-500" />
                <span className="text-[10px] font-medium text-amber-600">
                  {kpis.missingEstimates} sans estim.
                </span>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Story cards ── */}
      <div className="flex-1 overflow-y-auto p-2">
        {stories.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-xs text-muted-foreground/50">
              {isDragOver ? "Déposer ici" : "Aucune US shippée"}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <AnimatePresence mode="popLayout">
              {stories.map((story, i) => {
                const epic = getEpic(story.epicId);
                const prio = priorityConfig[story.priority] || priorityConfig.medium;
                const PrioIcon = prio.icon;
                const isSelected = selectedDetailId === story.id;

                return (
                  <motion.div
                    key={story.id}
                    initial={{ opacity: 0, scale: 0.3, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.6, y: -8 }}
                    transition={{
                      type: "spring",
                      stiffness: 100,
                      damping: 14,
                      delay: i * 0.06,
                    }}
                  >
                    <div
                      draggable
                      onDragStart={(e) => handleDragStart(e, story.id)}
                      onClick={() => onStoryClick(story.id)}
                      className={`group rounded-lg border cursor-pointer transition-all hover:shadow-sm ${
                        isSelected
                          ? isViolet
                            ? "border-violet-400 bg-violet-50/80 ring-1 ring-violet-300"
                            : "border-amber-400 bg-amber-50/80 ring-1 ring-amber-300"
                          : "border-border-light hover:border-foreground/20 bg-white"
                      }`}
                    >
                      {/* Card top row */}
                      <div className="flex items-start gap-2 px-2.5 pt-2 pb-1">
                        <GripVertical className="w-3 h-3 mt-0.5 text-muted-foreground/20 group-hover:text-muted-foreground/50 flex-shrink-0 cursor-grab" />

                        <div className="flex-1 min-w-0">
                          {/* US number + title */}
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[10px] font-bold flex-shrink-0 ${
                              isViolet ? "text-violet-500" : "text-amber-500"
                            }`}>
                              {story.storyNumber ? `US-${story.storyNumber}` : "US"}
                            </span>
                            <span className="text-[12px] font-semibold truncate leading-tight">
                              {story.title || "Sans titre"}
                            </span>
                          </div>

                          {/* Description (iWant) */}
                          {story.iWant && (
                            <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1 leading-snug">
                              {story.iWant}
                            </p>
                          )}
                        </div>

                        {/* Remove button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onUnship(story.id);
                          }}
                          className="w-4 h-4 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-100 transition-all flex-shrink-0"
                          title="Retirer du container"
                        >
                          <X className="w-2.5 h-2.5 text-red-400 hover:text-red-600" />
                        </button>
                      </div>

                      {/* Card bottom row — metadata chips */}
                      <div className="flex items-center gap-1.5 px-2.5 pb-2 pl-[30px] flex-wrap">
                        {/* Epic badge */}
                        {epic && (
                          <span
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium"
                            style={{
                              backgroundColor: `${epic.color}15`,
                              color: epic.color,
                              border: `1px solid ${epic.color}30`,
                            }}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: epic.color }}
                            />
                            {epic.title}
                          </span>
                        )}

                        {/* Story points */}
                        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          isViolet ? "bg-violet-100/60 text-violet-600" : "bg-amber-100/60 text-amber-600"
                        }`}>
                          {story.storyPoints || "?"} pts
                        </span>

                        {/* Priority */}
                        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-50 ${prio.color}`}>
                          <PrioIcon className="w-2.5 h-2.5" />
                          {prio.label}
                        </span>

                        {/* Subtasks count */}
                        {story.subtasks.length > 0 && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] text-muted-foreground bg-slate-50">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            {story.subtasks.length} tâche{story.subtasks.length > 1 ? "s" : ""}
                          </span>
                        )}

                        {/* Status */}
                        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium ${
                          story.status === "ready"
                            ? "bg-green-50 text-green-600"
                            : story.status === "refining"
                            ? "bg-blue-50 text-blue-600"
                            : "bg-slate-50 text-slate-500"
                        }`}>
                          {story.status === "ready" ? "Ready" : story.status === "refining" ? "Refining" : "Draft"}
                        </span>

                        {/* Arrow for detail */}
                        <ChevronRight className="w-3 h-3 text-muted-foreground/30 ml-auto flex-shrink-0 group-hover:text-muted-foreground/60 transition-colors" />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
