"use client";

import { useStore } from "@/store/useStore";
import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Target,
  Gauge,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Check,
} from "lucide-react";

const DOT_SIZE = 48;

interface MatrixViewProps {
  selectionMode?: boolean;
}

export function MatrixView({ selectionMode = false }: MatrixViewProps) {
  const stories = useStore((s) => s.stories);
  const epics = useStore((s) => s.epics);
  const updateStoryMatrixPosition = useStore((s) => s.updateStoryMatrixPosition);

  const selectedStoryId = useStore((s) => s.selectedStoryId);
  const selectStoryForEditing = useStore((s) => s.selectStoryForEditing);
  const filterEpic = useStore((s) => s.filterEpic);
  const filterStatus = useStore((s) => s.filterStatus);

  // Ship selection state
  const selectedForShip = useStore((s) => s.selectedForShip);
  const toggleShipSelection = useStore((s) => s.toggleShipSelection);
  const shippedStoryIds = useStore((s) => s.shippedStoryIds);

  const matrixRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hoveredStory, setHoveredStory] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [matrixSize, setMatrixSize] = useState(500);

  // ─── Zoom state ───
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const panOffsetRef = useRef({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });

  // ─── Native drag refs ───
  const dragRef = useRef<{ id: string; x: number; y: number; cursorOffsetY: number } | null>(null);
  const dotRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Snapshot KPIs before drag
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

  // ─── Zoom: scroll wheel — zoom towards cursor ───
  const zoomTargetRef = useRef(1);
  const panTargetRef = useRef({ x: 0, y: 0 });
  const zoomRafRef = useRef<number | null>(null);

  // Smooth lerp animation shared by wheel & buttons
  const startZoomAnimation = useCallback(() => {
    if (zoomRafRef.current) return;
    const animate = () => {
      const zDiff = zoomTargetRef.current - zoomRef.current;
      const pxDiff = panTargetRef.current.x - panOffsetRef.current.x;
      const pyDiff = panTargetRef.current.y - panOffsetRef.current.y;

      if (Math.abs(zDiff) < 0.005 && Math.abs(pxDiff) < 0.5 && Math.abs(pyDiff) < 0.5) {
        // Snap to final values
        zoomRef.current = zoomTargetRef.current;
        panOffsetRef.current = { ...panTargetRef.current };
        setZoom(zoomTargetRef.current);
        setPanOffset({ ...panTargetRef.current });
        zoomRafRef.current = null;
        return;
      }

      const factor = 0.18;
      zoomRef.current += zDiff * factor;
      panOffsetRef.current.x += pxDiff * factor;
      panOffsetRef.current.y += pyDiff * factor;
      setZoom(zoomRef.current);
      setPanOffset({ x: panOffsetRef.current.x, y: panOffsetRef.current.y });
      zoomRafRef.current = requestAnimationFrame(animate);
    };
    zoomRafRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();

      // Pinch zoom (ctrlKey or metaKey) always zooms
      const isPinchZoom = e.ctrlKey || e.metaKey;

      if (isPinchZoom || zoomRef.current <= 1) {
        // Zoom towards cursor
        const rect = el.getBoundingClientRect();
        const mx = e.clientX - rect.left - rect.width / 2;
        const my = e.clientY - rect.top - rect.height / 2;

        const oldZoom = zoomTargetRef.current;
        const delta = e.deltaY > 0 ? -0.06 : 0.06;
        const newZoom = Math.max(0.5, Math.min(10, oldZoom + delta));
        zoomTargetRef.current = newZoom;

        const oldPan = panTargetRef.current;
        panTargetRef.current = {
          x: mx - (newZoom / oldZoom) * (mx - oldPan.x),
          y: my - (newZoom / oldZoom) * (my - oldPan.y),
        };
        startZoomAnimation();
      } else {
        // When zoomed in: scroll to pan (vertical + horizontal)
        const panSpeed = 1.5;
        const newPan = {
          x: panOffsetRef.current.x - e.deltaX * panSpeed,
          y: panOffsetRef.current.y - e.deltaY * panSpeed,
        };
        panOffsetRef.current = newPan;
        panTargetRef.current = newPan;
        setPanOffset(newPan);
      }
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => {
      el.removeEventListener("wheel", handler);
      if (zoomRafRef.current) cancelAnimationFrame(zoomRafRef.current);
    };
  }, [startZoomAnimation]);

  // Sync zoomTargetRef when buttons change zoom (zoom towards center)
  const adjustZoom = useCallback((delta: number) => {
    zoomTargetRef.current = Math.max(0.5, Math.min(10, zoomTargetRef.current + delta));
    startZoomAnimation();
  }, [startZoomAnimation]);

  // ─── Pan: left-click drag on background (not on a dot or cluster) ───
  const handlePanStart = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("[data-story-dot]")) return;

    e.preventDefault();
    isPanning.current = true;
    const ox = panOffsetRef.current.x;
    const oy = panOffsetRef.current.y;
    panStart.current = { x: e.clientX, y: e.clientY, ox, oy };
    document.body.style.cursor = "grab";

    const onMove = (ev: MouseEvent) => {
      if (!isPanning.current) return;
      document.body.style.cursor = "grabbing";
      const dx = ev.clientX - panStart.current.x;
      const dy = ev.clientY - panStart.current.y;
      const newPan = { x: panStart.current.ox + dx, y: panStart.current.oy + dy };
      panOffsetRef.current = newPan;
      panTargetRef.current = newPan;
      setPanOffset(newPan);
    };
    const onUp = () => {
      isPanning.current = false;
      document.body.style.cursor = "";
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, []);

  // ─── Native Drag & Drop ───
  const handleMouseDown = useCallback(
    (e: React.MouseEvent, storyId: string) => {
      e.preventDefault();
      e.stopPropagation();

      // In selection mode, toggle selection instead of dragging
      if (selectionMode) {
        if (!shippedStoryIds.has(storyId)) {
          toggleShipSelection(storyId);
        }
        // Always bring to foreground + show in detail panel
        selectStoryForEditing(storyId);
        return;
      }

      const story = useStore.getState().stories.find((s) => s.id === storyId);
      if (!story) return;

      const pos = story.matrixPosition || { x: story.effort || 50, y: story.impact || 50 };

      // Capture exact offset between cursor and dot center (screen space)
      // so the dot stays glued under the cursor with zero jump
      let cursorOffsetY = 0;
      const dotEl = dotRefs.current.get(storyId);
      if (dotEl) {
        const dotRect = dotEl.getBoundingClientRect();
        const dotCenterY = dotRect.top + dotRect.height / 2;
        cursorOffsetY = e.clientY - dotCenterY;
      }

      dragRef.current = { id: storyId, x: pos.x, y: pos.y, cursorOffsetY };
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

      const onMouseMove = (ev: MouseEvent) => {
        if (!dragRef.current || !matrixRef.current) return;
        const rect = matrixRef.current.getBoundingClientRect();
        // Subtract the initial cursor offset so the dot center
        // stays exactly where the user grabbed it — no jump at all
        const adjustedY = ev.clientY - dragRef.current.cursorOffsetY;
        const newY = Math.max(0, Math.min(100, 100 - ((adjustedY - rect.top) / rect.height) * 100));
        dragRef.current.y = newY;
        const el = dotRefs.current.get(storyId);
        if (el) {
          // Set as percentage — matches the React render approach
          // translate(-50%,-50%) in CSS handles centering
          el.style.top = `${100 - newY}%`;
        }
      };

      const onMouseUp = () => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        if (dragRef.current) {
          updateStoryMatrixPosition(dragRef.current.id, dragRef.current.x, dragRef.current.y);
          dragRef.current = null;
        }
        setDraggingId(null);
        setSnapshotKpis(null);
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [selectStoryForEditing, filterEpic, filterStatus, updateStoryMatrixPosition, selectionMode, shippedStoryIds, toggleShipSelection]
  );

  const getQuadrantInfo = (quadrant: string) => {
    switch (quadrant) {
      case "quick-wins": return { label: "Quick Wins" };
      case "strategic": return { label: "Strat\u00E9gique" };
      case "fill-in": return { label: "Fill-in" };
      case "avoid": return { label: "\u00C0 \u00E9viter" };
      default: return { label: "" };
    }
  };

  const handleAutoPlace = () => {
    stories.forEach((story) => {
      const x = Math.max(5, Math.min(95, story.effort));
      const y = Math.max(5, Math.min(95, story.impact || 50));
      updateStoryMatrixPosition(story.id, x, y);
    });
  };

  const handleResetZoom = () => {
    zoomTargetRef.current = 1;
    panTargetRef.current = { x: 0, y: 0 };
    startZoomAnimation();
  };

  const getEpicColor = useCallback(
    (epicId?: string) => {
      if (!epicId) return null;
      return epics.find((e) => e.id === epicId)?.color || null;
    },
    [epics]
  );

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

  // ─── Render a single story dot ───
  const renderDot = (story: typeof filteredStories[0]) => {
    const pos = story.matrixPosition || { x: 50, y: 50 };
    const epicColor = getEpicColor(story.epicId);
    const isHighPriority = story.priority === "high" || story.priority === "critical";
    const accentColor = epicColor || "#64748b"; // neutral slate when no epic
    const isDragging = draggingId === story.id;
    const isShipped = selectionMode && shippedStoryIds.has(story.id);
    const isSelectedForShip = selectionMode && selectedForShip.has(story.id);

    // Scale transform for drag feedback only — no scale for selection (prevents position shift)
    const dotScale = isDragging ? 1.2 : selectedStoryId === story.id && !selectionMode ? 1.1 : 1;

    return (
      <motion.div
        key={story.id}
        layoutId={selectionMode ? `ship-dot-${story.id}` : undefined}
        data-story-dot
        ref={(el: HTMLDivElement | null) => {
          if (el) dotRefs.current.set(story.id, el);
          else dotRefs.current.delete(story.id);
        }}
        className={`absolute select-none rounded-xl overflow-hidden ${
          isDragging ? "z-40 cursor-grabbing" : selectedStoryId === story.id ? "z-[35]" : isSelectedForShip ? "z-30" : "z-20"
        } ${selectionMode ? (isShipped ? "cursor-default" : "cursor-pointer") : "cursor-ns-resize"}`}
        style={{
          left: `${pos.x}%`,
          top: `${100 - pos.y}%`,
          width: DOT_SIZE,
          height: DOT_SIZE,
          transform: `translate(-50%, -50%) scale(${dotScale})`,
          opacity: isShipped ? 0.25 : 1,
          boxShadow: isDragging
            ? "0 8px 24px rgba(0,0,0,0.15)"
            : isSelectedForShip
            ? "0 2px 8px rgba(0,0,0,0.12)"
            : selectedStoryId === story.id
            ? "0 4px 12px rgba(0,0,0,0.1)"
            : isHighPriority
            ? "0 2px 8px rgba(239,68,68,0.3)"
            : "0 1px 4px rgba(0,0,0,0.06)",
          borderRadius: 12,
          transition: isDragging ? "box-shadow 0.1s" : "box-shadow 0.25s ease, opacity 0.25s ease",
          pointerEvents: isShipped ? "none" : "auto",
        }}
        onMouseDown={(e: React.MouseEvent) => handleMouseDown(e, story.id)}
        onMouseEnter={() => {
          if (!draggingId) {
            setHoveredStory(story.id);
            const dotEl = dotRefs.current.get(story.id);
            if (dotEl) {
              const rect = dotEl.getBoundingClientRect();
              setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top });
            }
          }
        }}
        onMouseLeave={() => { setHoveredStory(null); setTooltipPos(null); }}
      >
        {isHighPriority && !selectionMode && (
          <div
            className="absolute inset-0 rounded-xl animate-ping opacity-20"
            style={{ backgroundColor: story.priority === "critical" ? "#ef4444" : "#f97316" }}
          />
        )}

        <div
          className={`w-full h-full rounded-xl flex items-center justify-center border-2 transition-colors relative ${
            epicColor ? "" : "bg-slate-50 border-slate-300"
          } ${isSelectedForShip ? "ring-2 ring-foreground/40 ring-offset-1" : selectedStoryId === story.id && !selectionMode ? "ring-2 ring-foreground ring-offset-2" : ""}
          ${isHighPriority && !selectionMode ? "ring-2 ring-offset-1" : ""}`}
          style={{
            ...(epicColor ? { backgroundColor: `${epicColor}18`, borderColor: epicColor } : {}),
            ...(isHighPriority && !selectionMode ? { ringColor: story.priority === "critical" ? "#ef4444" : "#f97316" } : {}),
            ...(isSelectedForShip && !epicColor ? { backgroundColor: "#f8fafc", borderColor: "#1e293b" } : {}),
            ...(isSelectedForShip && epicColor ? { borderColor: epicColor } : {}),
          }}
        >
          <span className="text-[10px] font-bold leading-none" style={{ color: accentColor }}>
            {story.storyNumber ? `US-${story.storyNumber}` : "US"}
          </span>
          {isSelectedForShip && (
            <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-foreground flex items-center justify-center">
              <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
            </div>
          )}
          {isHighPriority && !selectionMode && (
            <div
              className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white"
              style={{ backgroundColor: story.priority === "critical" ? "#ef4444" : "#f97316" }}
            />
          )}
        </div>

      </motion.div>
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
            {selectionMode
              ? `${selectedForShip.size} sélectionnée${selectedForShip.size > 1 ? "s" : ""} · Cliquez pour sélectionner les US à shipper`
              : `${filteredStories.length} / ${stories.length} US · Glissez verticalement pour ajuster l'impact`
            }
          </p>
        </div>
        <div className="flex items-center gap-1">
          {/* Zoom controls */}
          <button
            onClick={() => adjustZoom(0.2)}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            title="Zoom +"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] text-muted-foreground font-mono w-8 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => adjustZoom(-0.2)}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            title="Zoom -"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          {(zoom !== 1 || panOffset.x !== 0 || panOffset.y !== 0) && (
            <button
              onClick={handleResetZoom}
              className="ml-1 px-2 py-1 rounded-lg bg-foreground/[0.06] hover:bg-foreground/[0.12] transition-colors text-muted-foreground hover:text-foreground text-[10px] font-medium flex items-center gap-1"
              title="Revenir à la vue initiale"
            >
              <Maximize2 className="w-3 h-3" />
              100%
            </button>
          )}
          {!selectionMode && (
            <>
              <div className="w-px h-4 bg-border mx-1" />
              <button
                onClick={handleAutoPlace}
                className="btn-secondary flex items-center gap-1.5 text-xs"
              >
                <RotateCcw className="w-3 h-3" />
                Auto-placer
              </button>
            </>
          )}
        </div>
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
      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center p-4 overflow-hidden"
        onMouseDown={handlePanStart}
      >
        <div
          className="relative"
          style={{
            width: matrixSize * zoom,
            height: matrixSize * zoom,
            transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
          }}
        >
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

          {/* Draggable area */}
          <div
            ref={matrixRef}
            className="absolute inset-0 z-10"
          >
            {/* Story dots */}
            {filteredStories.map((story) => renderDot(story))}
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

      {/* Portal tooltip — rendered to body to avoid overflow-hidden clipping */}
      {typeof document !== "undefined" &&
        hoveredStory &&
        tooltipPos &&
        !draggingId &&
        (() => {
          const hStory = filteredStories.find((s) => s.id === hoveredStory);
          if (!hStory) return null;
          const pos = hStory.matrixPosition || { x: 50, y: 50 };
          return createPortal(
            <div
              className="fixed z-[9999] pointer-events-none"
              style={{
                left: tooltipPos.x,
                top: tooltipPos.y - 8,
                transform: "translate(-50%, -100%)",
              }}
            >
              <div className="bg-foreground text-white rounded-lg px-3 py-2 shadow-elevated whitespace-nowrap">
                <p className="text-xs font-medium">
                  {hStory.storyNumber ? `US-${hStory.storyNumber} · ` : ""}
                  {hStory.title || "Sans titre"}
                </p>
                <p className="text-[10px] text-white/60 mt-0.5">
                  {hStory.storyPoints || "?"} pts · {getQuadrantInfo(getQuadrant(pos.x, pos.y)).label}
                  {hStory.epicId &&
                    epics.find((e) => e.id === hStory.epicId) && (
                      <> · {epics.find((e) => e.id === hStory.epicId)!.title}</>
                    )}
                </p>
                <div className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-full">
                  <div className="w-2 h-2 bg-foreground rotate-45 -translate-y-1" />
                </div>
              </div>
            </div>,
            document.body
          );
        })()}
    </div>
  );
}
