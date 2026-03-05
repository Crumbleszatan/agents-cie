"use client";

import { useMemo, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  Wrench,
  ChevronDown,
  GripHorizontal,
  Hash,
  TrendingUp,
  AlertCircle,
  Circle,
  FolderKanban,
} from "lucide-react";
import type { ReleaseTimeline, UserStory } from "@/types";
import { useStore } from "@/store/useStore";
import {
  daysBetween,
  formatDate,
  formatDateFull,
  addWorkingDays,
} from "./releaseUtils";

/* ── Priority config ── */
const priorityConfig: Record<string, { label: string; color: string; icon: typeof AlertCircle }> = {
  critical: { label: "Critique", color: "text-red-500", icon: AlertCircle },
  high: { label: "Haute", color: "text-orange-500", icon: TrendingUp },
  medium: { label: "Moyenne", color: "text-amber-500", icon: Circle },
  low: { label: "Basse", color: "text-slate-400", icon: Circle },
};

/* ════════════════════════════════════════════════════════════ */

interface ReleaseGanttProps {
  timelines: ReleaseTimeline[];
  stories: UserStory[];
}

export function ReleaseGantt({ timelines, stories }: ReleaseGanttProps) {
  const expandedReleaseId = useStore((s) => s.expandedReleaseId);
  const setExpandedReleaseId = useStore((s) => s.setExpandedReleaseId);
  const updateReleaseTimeline = useStore((s) => s.updateReleaseTimeline);
  const epics = useStore((s) => s.epics);
  const holidayCountry = useStore((s) => s.projectConfig.holidayCountry);

  const ganttRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<{
    releaseId: string;
    startX: number;
    originalStart: string;
  } | null>(null);

  /* ── Compute global timeline range ── */
  const { timelineStart, timelineEnd, totalDays, weekMarkers } = useMemo(() => {
    if (timelines.length === 0) {
      const now = new Date();
      const end = new Date(now);
      end.setDate(end.getDate() + 30);
      return { timelineStart: now, timelineEnd: end, totalDays: 30, weekMarkers: [] };
    }

    const allStarts = timelines.map((t) => new Date(t.startDate).getTime());
    const allEnds = timelines.map((t) => new Date(t.endDate).getTime());
    const minStart = new Date(Math.min(...allStarts));
    const maxEnd = new Date(Math.max(...allEnds));

    // Add padding: 7 days before, 14 days after
    const paddedStart = new Date(minStart);
    paddedStart.setDate(paddedStart.getDate() - 7);
    const paddedEnd = new Date(maxEnd);
    paddedEnd.setDate(paddedEnd.getDate() + 14);

    const total = daysBetween(paddedStart, paddedEnd);

    // Week markers (every Monday)
    const markers: Date[] = [];
    const cursor = new Date(paddedStart);
    // Advance to first Monday
    while (cursor.getDay() !== 1) {
      cursor.setDate(cursor.getDate() + 1);
    }
    while (cursor <= paddedEnd) {
      markers.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 7);
    }

    return {
      timelineStart: paddedStart,
      timelineEnd: paddedEnd,
      totalDays: total,
      weekMarkers: markers,
    };
  }, [timelines]);

  /* ── Today line position ── */
  const todayPercent = useMemo(() => {
    const now = new Date();
    const days = daysBetween(timelineStart, now);
    return Math.max(0, Math.min(100, (days / totalDays) * 100));
  }, [timelineStart, totalDays]);

  /* ── Split timelines by type ── */
  const instantReleases = useMemo(
    () => timelines.filter((t) => t.releaseType === "instant"),
    [timelines]
  );
  const humanReleases = useMemo(
    () => timelines.filter((t) => t.releaseType === "human"),
    [timelines]
  );

  /* ── Position helpers ── */
  const getLeftPercent = (dateStr: string) => {
    const d = new Date(dateStr);
    const days = daysBetween(timelineStart, d);
    return (days / totalDays) * 100;
  };

  const getWidthPercent = (startStr: string, endStr: string) => {
    const days = daysBetween(new Date(startStr), new Date(endStr));
    return Math.max(0.5, (days / totalDays) * 100);
  };

  /* ── Drag handlers ── */
  const handleDragStart = useCallback(
    (e: React.MouseEvent, releaseId: string, originalStart: string) => {
      e.preventDefault();
      setDragState({ releaseId, startX: e.clientX, originalStart });
    },
    []
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragState || !ganttRef.current) return;
      const rect = ganttRef.current.getBoundingClientRect();
      const dx = e.clientX - dragState.startX;
      const daysDelta = Math.round((dx / rect.width) * totalDays);
      if (daysDelta === 0) return;

      const timeline = timelines.find((t) => t.id === dragState.releaseId);
      if (!timeline) return;

      const originalStart = new Date(dragState.originalStart);
      const newStart = new Date(originalStart);
      newStart.setDate(newStart.getDate() + daysDelta);

      // Recompute all phase dates based on new start
      const newPhases = timeline.phases.map((phase, i) => {
        if (i === 0) {
          const phaseEnd = addWorkingDays(newStart, phase.durationDays, holidayCountry);
          return {
            ...phase,
            startDate: newStart.toISOString(),
            endDate: phaseEnd.toISOString(),
          };
        }
        // Chain from previous phase
        const prevEnd = new Date(
          timeline.phases
            .slice(0, i)
            .reduce((_, p, idx) => {
              if (idx === 0) {
                return addWorkingDays(newStart, p.durationDays, holidayCountry).toISOString();
              }
              // Iteratively compute
              return addWorkingDays(
                new Date(_),
                timeline.phases[idx].durationDays,
                holidayCountry
              ).toISOString();
            }, newStart.toISOString())
        );
        const phaseEnd = addWorkingDays(prevEnd, phase.durationDays, holidayCountry);
        return {
          ...phase,
          startDate: prevEnd.toISOString(),
          endDate: phaseEnd.toISOString(),
        };
      });

      const newEndDate = newPhases[newPhases.length - 1].endDate;

      updateReleaseTimeline(dragState.releaseId, {
        startDate: newStart.toISOString(),
        endDate: newEndDate,
        phases: newPhases,
      });
    },
    [dragState, totalDays, timelines, updateReleaseTimeline, holidayCountry]
  );

  const handleMouseUp = useCallback(() => {
    setDragState(null);
  }, []);

  /* ── Get story by ID ── */
  const getStory = (id: string) => stories.find((s) => s.id === id);
  const getEpic = (epicId?: string) => (epicId ? epics.find((e) => e.id === epicId) : null);

  /* ── Render a release bar ── */
  const renderReleaseBar = (timeline: ReleaseTimeline, idx: number) => {
    const isExpanded = expandedReleaseId === timeline.id;
    const leftPct = getLeftPercent(timeline.startDate);
    const widthPct = getWidthPercent(timeline.startDate, timeline.endDate);
    const isInstant = timeline.releaseType === "instant";
    const now = new Date();
    const isPast = new Date(timeline.endDate) < now;

    return (
      <div key={timeline.id} className="mb-2">
        {/* Bar row */}
        <div className="relative h-10 group/bar">
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{
              duration: 0.5,
              delay: idx * 0.1,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
            style={{
              left: `${leftPct}%`,
              width: `${widthPct}%`,
              originX: 0,
            }}
            className={`absolute top-1 h-8 rounded-lg overflow-hidden flex cursor-pointer shadow-sm hover:shadow-md transition-shadow ${
              isPast ? "opacity-60" : "opacity-100"
            } ${dragState?.releaseId === timeline.id ? "ring-2 ring-foreground/30" : ""}`}
            onClick={() =>
              setExpandedReleaseId(isExpanded ? null : timeline.id)
            }
            onMouseDown={(e) => handleDragStart(e, timeline.id, timeline.startDate)}
          >
            {/* Drag handle */}
            <div className="absolute left-0 top-0 bottom-0 w-5 flex items-center justify-center opacity-0 group-hover/bar:opacity-60 z-10 cursor-grab">
              <GripHorizontal className="w-3 h-3 text-white" />
            </div>

            {/* Phase segments */}
            {timeline.phases.map((phase) => {
              const phaseWidthPct =
                (daysBetween(new Date(phase.startDate), new Date(phase.endDate)) /
                  daysBetween(new Date(timeline.startDate), new Date(timeline.endDate))) *
                100;

              return (
                <div
                  key={phase.id}
                  className="h-full flex items-center justify-center relative overflow-hidden"
                  style={{
                    width: `${Math.max(phaseWidthPct, 5)}%`,
                    backgroundColor: phase.color,
                  }}
                  title={`${phase.name}: ${formatDate(new Date(phase.startDate))} → ${formatDate(new Date(phase.endDate))} (${phase.durationDays}j)`}
                >
                  <span className="text-[9px] font-bold text-white/90 truncate px-1 drop-shadow-sm">
                    {phase.name}
                  </span>
                </div>
              );
            })}
          </motion.div>

          {/* Release name label */}
          <div
            className="absolute top-1.5 text-[10px] font-semibold text-muted-foreground pointer-events-none whitespace-nowrap flex items-center gap-1"
            style={{
              left: `${leftPct + widthPct + 0.5}%`,
            }}
          >
            {timeline.alertDatePast && (
              <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-red-100 text-red-600 text-[8px] font-bold">
                <AlertCircle className="w-2.5 h-2.5" />
                Retard
              </span>
            )}
            {timeline.name}
            <span className="text-muted-foreground/50 ml-1.5">
              {timeline.totalStoryPoints} SP
            </span>
          </div>
        </div>

        {/* Expanded detail panel */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div
                className={`ml-4 mr-4 mb-3 rounded-xl border p-3 ${
                  isInstant
                    ? "bg-violet-50/50 border-violet-200"
                    : "bg-amber-50/50 border-amber-200"
                }`}
              >
                {/* Phase dates */}
                <div className="flex items-center gap-3 mb-3 pb-2 border-b border-border-light">
                  {timeline.phases.map((phase) => (
                    <div key={phase.id} className="flex items-center gap-1.5">
                      <div
                        className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: phase.color }}
                      />
                      <span className="text-[10px] font-semibold">{phase.name}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDate(new Date(phase.startDate))} → {formatDate(new Date(phase.endDate))}
                      </span>
                      <span className="text-[9px] text-muted-foreground/60">
                        ({phase.durationDays}j)
                      </span>
                    </div>
                  ))}
                </div>

                {/* Story list */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                    User Stories ({timeline.storyIds.length})
                  </p>
                  {timeline.storyIds.map((storyId) => {
                    const story = getStory(storyId);
                    if (!story) return null;
                    const epic = getEpic(story.epicId);
                    const prio = priorityConfig[story.priority] || priorityConfig.medium;
                    const PrioIcon = prio.icon;

                    return (
                      <div
                        key={storyId}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/70 border border-border-light/50"
                      >
                        <span
                          className={`text-[10px] font-bold flex-shrink-0 ${
                            isInstant ? "text-violet-500" : "text-amber-500"
                          }`}
                        >
                          {story.storyNumber ? `US-${story.storyNumber}` : "US"}
                        </span>
                        <span className="text-[11px] font-medium truncate flex-1">
                          {story.title || "Sans titre"}
                        </span>

                        {/* Epic badge */}
                        {epic && (
                          <span
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium flex-shrink-0"
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

                        {/* SP */}
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${
                            isInstant
                              ? "bg-violet-100/60 text-violet-600"
                              : "bg-amber-100/60 text-amber-600"
                          }`}
                        >
                          {story.storyPoints || "?"} pts
                        </span>

                        {/* Priority */}
                        <span
                          className={`inline-flex items-center gap-0.5 text-[9px] font-medium ${prio.color} flex-shrink-0`}
                        >
                          <PrioIcon className="w-2.5 h-2.5" />
                          {prio.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div
      ref={ganttRef}
      className="h-full bg-white rounded-xl border border-border-light shadow-sm flex flex-col overflow-hidden"
      onMouseMove={dragState ? handleMouseMove : undefined}
      onMouseUp={dragState ? handleMouseUp : undefined}
      onMouseLeave={dragState ? handleMouseUp : undefined}
    >
      {/* ── Week Header ── */}
      <div className="h-8 border-b border-border-light flex items-end relative flex-shrink-0 bg-muted/30">
        {weekMarkers.map((date, i) => {
          const leftPct = (daysBetween(timelineStart, date) / totalDays) * 100;
          return (
            <div
              key={i}
              className="absolute bottom-0 text-[9px] text-muted-foreground/60 font-medium"
              style={{ left: `${leftPct}%` }}
            >
              <div className="w-px h-2 bg-border-light mb-0.5" />
              <span className="pl-1">{formatDate(date)}</span>
            </div>
          );
        })}

        {/* Today marker header */}
        <div
          className="absolute bottom-0 z-10"
          style={{ left: `${todayPercent}%` }}
        >
          <div className="relative">
            <span className="absolute -top-0.5 -translate-x-1/2 text-[8px] font-bold text-red-500 bg-red-50 px-1 rounded">
              Auj
            </span>
          </div>
        </div>
      </div>

      {/* ── Gantt Body ── */}
      <div className="flex-1 overflow-y-auto relative">
        {/* Vertical week grid lines */}
        {weekMarkers.map((date, i) => {
          const leftPct = (daysBetween(timelineStart, date) / totalDays) * 100;
          return (
            <div
              key={`grid-${i}`}
              className="absolute top-0 bottom-0 w-px bg-border-light/50"
              style={{ left: `${leftPct}%` }}
            />
          );
        })}

        {/* Today line */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-400 z-20 pointer-events-none"
          style={{ left: `${todayPercent}%` }}
        >
          <div className="w-2 h-2 rounded-full bg-red-400 -ml-[3px]" />
        </div>

        {/* ── Instant Release Lane ── */}
        <div className="border-b border-border-light">
          <div className="flex items-center gap-2 px-3 py-2 bg-violet-50/30 border-b border-border-light/50">
            <div className="w-5 h-5 rounded-md bg-violet-100 flex items-center justify-center">
              <Bot className="w-3 h-3 text-violet-600" />
            </div>
            <span className="text-[11px] font-semibold text-violet-700">
              Instant Releases
            </span>
            <span className="text-[10px] text-violet-400 ml-1">
              ({instantReleases.length})
            </span>
          </div>

          <div className="relative px-2 py-1 min-h-[60px]">
            {instantReleases.length === 0 ? (
              <div className="flex items-center justify-center h-[52px]">
                <p className="text-[10px] text-muted-foreground/40">
                  Aucune release instant
                </p>
              </div>
            ) : (
              instantReleases.map((r, i) => renderReleaseBar(r, i))
            )}
          </div>
        </div>

        {/* ── Human Release Lane ── */}
        <div>
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-50/30 border-b border-border-light/50">
            <div className="w-5 h-5 rounded-md bg-amber-100 flex items-center justify-center">
              <Wrench className="w-3 h-3 text-amber-600" />
            </div>
            <span className="text-[11px] font-semibold text-amber-700">
              Human Releases
            </span>
            <span className="text-[10px] text-amber-400 ml-1">
              ({humanReleases.length})
            </span>
          </div>

          <div className="relative px-2 py-1 min-h-[60px]">
            {humanReleases.length === 0 ? (
              <div className="flex items-center justify-center h-[52px]">
                <p className="text-[10px] text-muted-foreground/40">
                  Aucune release human
                </p>
              </div>
            ) : (
              humanReleases.map((r, i) => renderReleaseBar(r, i))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
