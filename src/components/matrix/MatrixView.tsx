"use client";

import { useStore } from "@/store/useStore";
import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  RotateCcw,
  TrendingUp,
  TrendingDown,
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

  // ─── Native drag: track live Y in a ref to avoid React re-render lag ───
  const dragRef = useRef<{ id: string; x: number; y: number } | null>(null);
  const dotRefs = useRef<Map<string, HTMLDivElement>>(new Map());

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

  // ─── Native Drag & Drop ───
  // mouseDown: start drag, snapshot KPIs, register native listeners
  const handleMouseDown = useCallback(
    (e: React.MouseEvent, storyId: string) => {
      e.preventDefault();
      e.stopPropagation();

      const story = useStore.getState().stories.find((s) => s.id === storyId);
      if (!story) return;

      const pos = story.matrixPosition || { x: story.effort || 50, y: story.impact || 50 };
      dragRef.current = { id: storyId, x: pos.x, y: pos.y };
      setDraggingId(storyId);
      selectStoryForEditing(storyId);

      document.body.style.cursor = "ns-resize";
      document.body.style.userSelect = "none";

      // Snapshot KPIs
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
          const p = st.matrixPosition || { x: 50, y: 50 };
          quadrants[getQuadrant(p.x, p.y)]++;
        });
        setSnapshotKpis({ avgImpact: Math.round(sumImpact / total), quadrants });
      }

      // Native mousemove: update DOM directly (no React re-render)
      const onMouseMove = (ev: MouseEvent) => {
        if (!dragRef.current || !matrixRef.current) return;
        const rect = matrixRef.current.getBoundingClientRect();
        const newY = Math.max(0, Math.min(100, 100 - ((ev.clientY - rect.top) / rect.height) * 100));
        dragRef.current.y = newY;

        // Move the dot directly via DOM
        const dotEl = dotRefs.current.get(storyId);
        if (dotEl) {
          const topPx = ((100 - newY) / 100) * rect.height - DOT_SIZE / 2;
          dotEl.style.top = `${topPx}px`;
        }
      };

      // Native mouseup: commit to store + persist, cleanup
      const onMouseUp = () => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";

        if (dragRef.current) {
          // Commit final position to Zustand store (will persist to DB)
          updateStoryMatrixPosition(dragRef.current.id, dragRef.current.x, dragRef.current.y);
          dragRef.current = null;
        }
        setDraggingId(null);
        setSnapshotKpis(null);
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [selectStoryForEditing, filterEpic, filterStatus, updateStoryMatrixPosition]
  );

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
          >
            {filteredStories.map((story) => {
              const pos = story.matrixPosition || { x: 50, y: 50 };
              const left = (pos.x / 100) * matrixSize - DOT_SIZE / 2;
              const top = ((100 - pos.y) / 100) * matrixSize - DOT_SIZE / 2;
              const isFullAi = story.productionMode === "full-ai";
              const epicColor = getEpicColor(story.epicId);
              const isHighPriority = story.priority === "high" || story.priority === "critical";
              const accentColor = epicColor || (isFullAi ? "#7c3aed" : "#d97706");
              const isDragging = draggingId === story.id;

              return (
                <div
                  key={story.id}
                  ref={(el) => {
                    if (el) dotRefs.current.set(story.id, el);
                    else dotRefs.current.delete(story.id);
                  }}
                  className={`absolute select-none ${
                    isDragging ? "z-30 cursor-grabbing" : "z-20 cursor-ns-resize"
                  }`}
                  style={{
                    left,
                    top,
                    width: DOT_SIZE,
                    height: DOT_SIZE,
                    transform: isDragging ? "scale(1.2)" : selectedStoryId === story.id ? "scale(1.1)" : "scale(1)",
                    boxShadow: isDragging
                      ? "0 8px 24px rgba(0,0,0,0.15)"
                      : selectedStoryId === story.id
                      ? "0 4px 12px rgba(0,0,0,0.1)"
                      : isHighPriority
                      ? "0 2px 8px rgba(239,68,68,0.3)"
                      : "0 1px 4px rgba(0,0,0,0.06)",
                    transition: isDragging ? "transform 0.1s, box-shadow 0.1s" : "all 0.25s ease",
                  }}
                  onMouseDown={(e) => handleMouseDown(e, story.id)}
                  onMouseEnter={() => !draggingId && setHoveredStory(story.id)}
                  onMouseLeave={() => setHoveredStory(null)}
                >
                  {/* Pulse ring for high/critical priority */}
                  {isHighPriority && (
                    <div
                      className="absolute inset-0 rounded-xl animate-ping opacity-20"
                      style={{ backgroundColor: story.priority === "critical" ? "#ef4444" : "#f97316" }}
                    />
                  )}

                  <div
                    className={`w-full h-full rounded-xl flex items-center justify-center border-2 transition-colors relative ${
                      epicColor
                        ? ""
                        : isFullAi
                        ? "bg-violet-50 border-violet-300"
                        : "bg-amber-50 border-amber-300"
                    } ${selectedStoryId === story.id ? "ring-2 ring-foreground ring-offset-2" : ""}
                    ${isHighPriority ? "ring-2 ring-offset-1" : ""}`}
                    style={{
                      ...(epicColor
                        ? { backgroundColor: `${epicColor}18`, borderColor: epicColor }
                        : {}),
                      ...(isHighPriority
                        ? { ringColor: story.priority === "critical" ? "#ef4444" : "#f97316" }
                        : {}),
                    }}
                  >
                    {/* US ID inside the dot */}
                    <span
                      className="text-[10px] font-bold leading-none"
                      style={{ color: accentColor }}
                    >
                      {story.storyNumber ? `US-${story.storyNumber}` : "US"}
                    </span>

                    {/* Priority indicator dot */}
                    {isHighPriority && (
                      <div
                        className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white"
                        style={{ backgroundColor: story.priority === "critical" ? "#ef4444" : "#f97316" }}
                      />
                    )}
                  </div>

                  {/* Tooltip */}
                  <AnimatePresence>
                    {hoveredStory === story.id && !isDragging && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full bg-foreground text-white rounded-lg px-3 py-2 shadow-elevated z-50 whitespace-nowrap pointer-events-none"
                      >
                        <p className="text-xs font-medium">
                          {story.storyNumber ? `US-${story.storyNumber} \u00B7 ` : ""}{story.title || "Sans titre"}
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
                </div>
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
