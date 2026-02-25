"use client";

import { useStore } from "@/store/useStore";
import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  Bot,
  Wrench,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Gauge,
} from "lucide-react";

const DOT_SIZE = 48;

export function MatrixView() {
  const stories = useStore((s) => s.stories);
  const epics = useStore((s) => s.epics);
  const updateStoryMatrixPosition = useStore((s) => s.updateStoryMatrixPosition);

  const selectedStoryId = useStore((s) => s.selectedStoryId);
  const selectStoryForEditing = useStore((s) => s.selectStoryForEditing);
  const filterEpic = useStore((s) => s.filterEpic);
  const filterStatus = useStore((s) => s.filterStatus);

  const matrixRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hoveredStory, setHoveredStory] = useState<string | null>(null);
  const [matrixSize, setMatrixSize] = useState(500);

  // Snapshot KPIs before drag to compute delta
  const [snapshotKpis, setSnapshotKpis] = useState<{ avgImpact: number; quadrants: Record<string, number> } | null>(null);

  // Responsive matrix size
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const size = Math.min(rect.width - 60, rect.height - 120, 800);
        setMatrixSize(Math.max(300, size));
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Initialize matrix positions if not set
  useEffect(() => {
    stories.forEach((story) => {
      if (!story.matrixPosition) {
        const x = Math.max(5, Math.min(95, story.effort + (Math.random() * 10 - 5)));
        const y = Math.max(5, Math.min(95, story.impact || (50 + Math.random() * 30 - 15)));
        updateStoryMatrixPosition(story.id, x, y);
      }
    });
  }, [stories, updateStoryMatrixPosition]);

  // Filter stories
  const filteredStories = stories.filter((story) => {
    if (filterEpic !== "all" && story.epicId !== filterEpic) return false;
    if (filterStatus !== "all" && story.productionStatus !== filterStatus) return false;
    return true;
  });

  // ─── KPIs ───
  const getQuadrant = (x: number, y: number) => {
    if (x <= 50 && y > 50) return "quick-wins";
    if (x > 50 && y > 50) return "strategic";
    if (x <= 50 && y <= 50) return "fill-in";
    return "avoid";
  };

  const kpis = useMemo(() => {
    const total = filteredStories.length;
    if (total === 0) return { avgEffort: 0, avgImpact: 0, quadrants: { "quick-wins": 0, strategic: 0, "fill-in": 0, avoid: 0 } };
    const sumEffort = filteredStories.reduce((s, st) => s + (st.matrixPosition?.x ?? st.effort ?? 50), 0);
    const sumImpact = filteredStories.reduce((s, st) => s + (st.matrixPosition?.y ?? st.impact ?? 50), 0);
    const quadrants: Record<string, number> = { "quick-wins": 0, strategic: 0, "fill-in": 0, avoid: 0 };
    filteredStories.forEach((st) => {
      const pos = st.matrixPosition || { x: 50, y: 50 };
      quadrants[getQuadrant(pos.x, pos.y)]++;
    });
    return { avgEffort: Math.round(sumEffort / total), avgImpact: Math.round(sumImpact / total), quadrants };
  }, [filteredStories]);

  // ─── Drag & Drop (fixed: use getState to avoid stale closure) ───
  const handleMouseDown = useCallback(
    (e: React.MouseEvent, storyId: string) => {
      e.preventDefault();
      e.stopPropagation();
      setDraggingId(storyId);
      selectStoryForEditing(storyId);
      // Snapshot KPIs before drag starts
      const currentStories = useStore.getState().stories;
      const filtered = currentStories.filter((st) => {
        if (filterEpic !== "all" && st.epicId !== filterEpic) return false;
        if (filterStatus !== "all" && st.productionStatus !== filterStatus) return false;
        return true;
      });
      const total = filtered.length;
      if (total > 0) {
        const sumImpact = filtered.reduce((s, st) => s + (st.matrixPosition?.y ?? st.impact ?? 50), 0);
        const quadrants: Record<string, number> = { "quick-wins": 0, strategic: 0, "fill-in": 0, avoid: 0 };
        filtered.forEach((st) => {
          const pos = st.matrixPosition || { x: 50, y: 50 };
          quadrants[getQuadrant(pos.x, pos.y)]++;
        });
        setSnapshotKpis({ avgImpact: Math.round(sumImpact / total), quadrants });
      }
    },
    [selectStoryForEditing, filterEpic, filterStatus]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!draggingId || !matrixRef.current) return;
      const rect = matrixRef.current.getBoundingClientRect();
      const y = Math.max(0, Math.min(100, 100 - ((e.clientY - rect.top) / rect.height) * 100));
      // Read fresh state to get current X position
      const currentStories = useStore.getState().stories;
      const story = currentStories.find((s) => s.id === draggingId);
      if (story) {
        updateStoryMatrixPosition(draggingId, story.matrixPosition?.x ?? story.effort ?? 50, y);
      }
    },
    [draggingId, updateStoryMatrixPosition]
  );

  const handleMouseUp = useCallback(() => {
    setDraggingId(null);
    setSnapshotKpis(null);
  }, []);

  const getQuadrantInfo = (quadrant: string) => {
    switch (quadrant) {
      case "quick-wins":
        return { label: "Quick Wins", emoji: "\u26A1" };
      case "strategic":
        return { label: "Strat\u00E9gique", emoji: "\uD83C\uDFAF" };
      case "fill-in":
        return { label: "Fill-in", emoji: "\u23F3" };
      case "avoid":
        return { label: "\u00C0 \u00E9viter", emoji: "\u26A0\uFE0F" };
      default:
        return { label: "", emoji: "" };
    }
  };

  const handleAutoPlace = () => {
    stories.forEach((story) => {
      const x = Math.max(5, Math.min(95, story.effort));
      const y = Math.max(5, Math.min(95, story.impact || 50));
      updateStoryMatrixPosition(story.id, x, y);
    });
  };

  // ─── Epic edges: connect stories sharing same epic ───
  const epicEdges = useMemo(() => {
    const edges: { from: { x: number; y: number }; to: { x: number; y: number }; color: string }[] = [];
    // Group filtered stories by epicId
    const epicGroups: Record<string, typeof filteredStories> = {};
    filteredStories.forEach((story) => {
      if (story.epicId) {
        if (!epicGroups[story.epicId]) epicGroups[story.epicId] = [];
        epicGroups[story.epicId].push(story);
      }
    });
    Object.entries(epicGroups).forEach(([epicId, group]) => {
      if (group.length < 2) return;
      const epic = epics.find((e) => e.id === epicId);
      const color = epic?.color || "#a0a0a0";
      // Chain stories in the group
      for (let i = 0; i < group.length - 1; i++) {
        const a = group[i].matrixPosition || { x: 50, y: 50 };
        const b = group[i + 1].matrixPosition || { x: 50, y: 50 };
        edges.push({
          from: { x: (a.x / 100) * matrixSize, y: ((100 - a.y) / 100) * matrixSize },
          to: { x: (b.x / 100) * matrixSize, y: ((100 - b.y) / 100) * matrixSize },
          color,
        });
      }
    });
    return edges;
  }, [filteredStories, epics, matrixSize]);

  // Helper: get epic color for a story
  const getEpicColor = useCallback(
    (epicId?: string) => {
      if (!epicId) return null;
      return epics.find((e) => e.id === epicId)?.color || null;
    },
    [epics]
  );

  // Delta indicator component
  const DeltaBadge = ({ current, previous }: { current: number; previous: number }) => {
    const delta = current - previous;
    if (delta === 0) return null;
    const isUp = delta > 0;
    return (
      <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ${isUp ? "text-green-600" : "text-red-500"}`}>
        {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {isUp ? "+" : ""}{delta}
      </span>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border-light flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Zap className="w-3.5 h-3.5" />
            Matrice Effort / Impact
          </h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {filteredStories.length} / {stories.length} US &middot; Glissez verticalement pour ajuster l&apos;impact
          </p>
        </div>
        <button
          onClick={handleAutoPlace}
          className="btn-secondary flex items-center gap-1.5 text-xs"
        >
          <RotateCcw className="w-3 h-3" />
          Auto-placer
        </button>
      </div>

      {/* KPI Bar */}
      {filteredStories.length > 0 && (
        <div className="px-4 py-2 border-b border-border-light flex items-center gap-4 text-[11px]">
          <div className="flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Effort moy.</span>
            <span className="font-semibold">{kpis.avgEffort}</span>
          </div>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Impact moy.</span>
            <span className="font-semibold">{kpis.avgImpact}</span>
            {snapshotKpis && <DeltaBadge current={kpis.avgImpact} previous={snapshotKpis.avgImpact} />}
          </div>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-muted-foreground">QW</span>
              <span className="font-semibold">{kpis.quadrants["quick-wins"]}</span>
              {snapshotKpis && <DeltaBadge current={kpis.quadrants["quick-wins"]} previous={snapshotKpis.quadrants["quick-wins"]} />}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              <span className="text-muted-foreground">Strat.</span>
              <span className="font-semibold">{kpis.quadrants.strategic}</span>
              {snapshotKpis && <DeltaBadge current={kpis.quadrants.strategic} previous={snapshotKpis.quadrants.strategic} />}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-gray-300" />
              <span className="text-muted-foreground">Fill</span>
              <span className="font-semibold">{kpis.quadrants["fill-in"]}</span>
              {snapshotKpis && <DeltaBadge current={kpis.quadrants["fill-in"]} previous={snapshotKpis.quadrants["fill-in"]} />}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-400" />
              <span className="text-muted-foreground">Avoid</span>
              <span className="font-semibold">{kpis.quadrants.avoid}</span>
              {snapshotKpis && <DeltaBadge current={kpis.quadrants.avoid} previous={snapshotKpis.quadrants.avoid} />}
            </span>
          </div>
        </div>
      )}

      {/* Matrix Area */}
      <div ref={containerRef} className="flex-1 flex items-center justify-center p-4 overflow-hidden">
        <div className="relative" style={{ width: matrixSize, height: matrixSize }}>
          {/* Quadrant backgrounds */}
          <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 rounded-2xl overflow-hidden border border-border-light">
            <div className="bg-gray-50/30 border-r border-b border-border-light/50 flex items-start justify-start p-3">
              <span className="text-[10px] font-medium text-gray-400">Fill-in</span>
            </div>
            <div className="bg-red-50/20 border-b border-border-light/50 flex items-start justify-end p-3">
              <span className="text-[10px] font-medium text-red-300">&Agrave; &eacute;viter</span>
            </div>
            <div className="bg-green-50/30 border-r border-border-light/50 flex items-end justify-start p-3">
              <span className="text-[10px] font-medium text-green-400">Quick Wins</span>
            </div>
            <div className="bg-blue-50/20 flex items-end justify-end p-3">
              <span className="text-[10px] font-medium text-blue-400">Strat&eacute;gique</span>
            </div>
          </div>

          {/* Axis labels */}
          <div className="absolute -bottom-5 left-0 right-0 flex justify-between">
            <span className="text-[9px] text-muted-foreground">Faible effort</span>
            <span className="text-[9px] text-muted-foreground font-medium">EFFORT &rarr;</span>
            <span className="text-[9px] text-muted-foreground">Fort effort</span>
          </div>
          <div className="absolute -left-5 top-0 bottom-0 flex flex-col justify-between items-center">
            <span className="text-[9px] text-muted-foreground writing-vertical">Fort impact</span>
            <span className="text-[9px] text-muted-foreground font-medium writing-vertical">IMPACT &uarr;</span>
            <span className="text-[9px] text-muted-foreground writing-vertical">Faible impact</span>
          </div>

          {/* Epic edges (SVG) */}
          <svg
            className="absolute inset-0 z-[5] pointer-events-none"
            width={matrixSize}
            height={matrixSize}
          >
            {epicEdges.map((edge, i) => (
              <line
                key={i}
                x1={edge.from.x}
                y1={edge.from.y}
                x2={edge.to.x}
                y2={edge.to.y}
                stroke={edge.color}
                strokeWidth={2}
                strokeOpacity={0.4}
                strokeDasharray="6 4"
              />
            ))}
          </svg>

          {/* Draggable area */}
          <div
            ref={matrixRef}
            className="absolute inset-0 z-10"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {filteredStories.map((story) => {
              const pos = story.matrixPosition || { x: 50, y: 50 };
              const left = (pos.x / 100) * matrixSize - DOT_SIZE / 2;
              const top = ((100 - pos.y) / 100) * matrixSize - DOT_SIZE / 2;
              const isFullAi = story.productionMode === "full-ai";
              const epicColor = getEpicColor(story.epicId);

              // Epic color styling or fallback to production mode colors
              const dotBg = epicColor ? `${epicColor}18` : isFullAi ? undefined : undefined;
              const dotBorder = epicColor || (isFullAi ? undefined : undefined);

              return (
                <motion.div
                  key={story.id}
                  className={`absolute select-none ${
                    draggingId === story.id ? "z-30 cursor-grabbing" : "z-20 cursor-ns-resize"
                  }`}
                  style={{ left, top, width: DOT_SIZE, height: DOT_SIZE }}
                  onMouseDown={(e) => handleMouseDown(e, story.id)}
                  onMouseEnter={() => setHoveredStory(story.id)}
                  onMouseLeave={() => setHoveredStory(null)}
                  whileHover={{ scale: 1.15 }}
                  animate={{
                    scale: draggingId === story.id ? 1.2 : selectedStoryId === story.id ? 1.1 : 1,
                    boxShadow:
                      draggingId === story.id
                        ? "0 8px 24px rgba(0,0,0,0.15)"
                        : selectedStoryId === story.id
                        ? "0 4px 12px rgba(0,0,0,0.1)"
                        : "0 1px 4px rgba(0,0,0,0.06)",
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                >
                  <div
                    className={`w-full h-full rounded-xl flex items-center justify-center border-2 transition-colors ${
                      epicColor
                        ? ""
                        : isFullAi
                        ? "bg-violet-50 border-violet-300"
                        : "bg-amber-50 border-amber-300"
                    } ${selectedStoryId === story.id ? "ring-2 ring-foreground ring-offset-2" : ""}`}
                    style={
                      epicColor
                        ? { backgroundColor: `${epicColor}18`, borderColor: epicColor }
                        : undefined
                    }
                  >
                    {isFullAi ? (
                      <Bot className="w-5 h-5" style={epicColor ? { color: epicColor } : { color: "#7c3aed" }} />
                    ) : (
                      <Wrench className="w-5 h-5" style={epicColor ? { color: epicColor } : { color: "#d97706" }} />
                    )}
                  </div>

                  {/* US number badge */}
                  {story.storyNumber && (
                    <div
                      className="absolute -bottom-1 -right-1 text-[8px] font-bold px-1 py-0.5 rounded-md text-white leading-none"
                      style={{ backgroundColor: epicColor || (isFullAi ? "#7c3aed" : "#d97706") }}
                    >
                      {story.storyNumber}
                    </div>
                  )}

                  {/* Tooltip */}
                  <AnimatePresence>
                    {hoveredStory === story.id && draggingId !== story.id && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full bg-foreground text-white rounded-lg px-3 py-2 shadow-elevated z-50 whitespace-nowrap pointer-events-none"
                      >
                        <p className="text-xs font-medium">
                          {story.storyNumber ? `US-${story.storyNumber} · ` : ""}{story.title || "Sans titre"}
                        </p>
                        <p className="text-[10px] text-white/60 mt-0.5">
                          {story.storyPoints || "?"} pts &middot; {getQuadrantInfo(getQuadrant(pos.x, pos.y)).label}
                          {story.epicId && epics.find((e) => e.id === story.epicId) && (
                            <> &middot; {epics.find((e) => e.id === story.epicId)!.title}</>
                          )}
                        </p>
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-full">
                          <div className="w-2 h-2 bg-foreground rotate-45 -translate-y-1" />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Empty state */}
      {stories.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
              <Zap className="w-7 h-7 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-semibold mb-1">Aucune User Story</h3>
            <p className="text-xs text-muted-foreground max-w-[240px]">
              Construisez des User Stories dans la phase Build pour les voir ici.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
