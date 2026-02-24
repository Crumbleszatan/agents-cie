"use client";

import { useStore } from "@/store/useStore";
import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  Bot,
  Wrench,
  RotateCcw,
  Filter,
} from "lucide-react";

const DOT_SIZE = 48;

export function MatrixView() {
  const stories = useStore((s) => s.stories);
  const epics = useStore((s) => s.epics);
  const updateStoryMatrixPosition = useStore((s) => s.updateStoryMatrixPosition);
  const project = useStore((s) => s.project);

  const matrixRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [selectedStory, setSelectedStory] = useState<string | null>(null);
  const [hoveredStory, setHoveredStory] = useState<string | null>(null);
  const [matrixSize, setMatrixSize] = useState(500);

  // Filters
  const [filterEpic, setFilterEpic] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Responsive matrix size
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const size = Math.min(rect.width - 60, rect.height - 60, 800);
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

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, storyId: string) => {
      e.preventDefault();
      setDraggingId(storyId);
      setSelectedStory(storyId);
    },
    []
  );

  // Only allow vertical (impact) dragging — effort (X) stays fixed
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!draggingId || !matrixRef.current) return;
      const rect = matrixRef.current.getBoundingClientRect();
      const y = Math.max(0, Math.min(100, 100 - ((e.clientY - rect.top) / rect.height) * 100));
      const story = stories.find((s) => s.id === draggingId);
      if (story) {
        updateStoryMatrixPosition(draggingId, story.matrixPosition?.x || 50, y);
      }
    },
    [draggingId, stories, updateStoryMatrixPosition]
  );

  const handleMouseUp = useCallback(() => {
    setDraggingId(null);
  }, []);

  const getQuadrant = (x: number, y: number) => {
    if (x <= 50 && y > 50) return "quick-wins";
    if (x > 50 && y > 50) return "strategic";
    if (x <= 50 && y <= 50) return "fill-in";
    return "avoid";
  };

  const getQuadrantInfo = (quadrant: string) => {
    switch (quadrant) {
      case "quick-wins":
        return { label: "Quick Wins" };
      case "strategic":
        return { label: "Stratégique" };
      case "fill-in":
        return { label: "Fill-in" };
      case "avoid":
        return { label: "À éviter" };
      default:
        return { label: "" };
    }
  };

  const handleAutoPlace = () => {
    stories.forEach((story) => {
      const x = Math.max(5, Math.min(95, story.effort));
      const y = Math.max(5, Math.min(95, story.impact || 50));
      updateStoryMatrixPosition(story.id, x, y);
    });
  };

  const selectedStoryData = stories.find((s) => s.id === selectedStory);

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
            {filteredStories.length} / {stories.length} US · Glissez verticalement pour ajuster l&apos;impact
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Epic filter */}
          <div className="flex items-center gap-1">
            <Filter className="w-3 h-3 text-muted-foreground" />
            <select
              value={filterEpic}
              onChange={(e) => setFilterEpic(e.target.value)}
              className="text-[11px] bg-muted rounded-lg px-2 py-1 border-0 outline-none cursor-pointer"
            >
              <option value="all">Tous les Epics</option>
              {epics.map((epic) => (
                <option key={epic.id} value={epic.id}>{epic.title}</option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-[11px] bg-muted rounded-lg px-2 py-1 border-0 outline-none cursor-pointer"
          >
            <option value="all">Tous les statuts</option>
            <option value="backlog">Backlog</option>
            <option value="planned">Planned</option>
            <option value="in-progress">In Progress</option>
            <option value="review">Review</option>
            <option value="done">Done</option>
          </select>

          <button
            onClick={handleAutoPlace}
            className="btn-secondary flex items-center gap-1.5 text-xs"
          >
            <RotateCcw className="w-3 h-3" />
            Auto-placer
          </button>
        </div>
      </div>

      {/* Matrix Area */}
      <div ref={containerRef} className="flex-1 flex items-center justify-center p-4 overflow-hidden">
        <div className="relative" style={{ width: matrixSize, height: matrixSize }}>
          {/* Quadrant backgrounds */}
          <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 rounded-2xl overflow-hidden border border-border-light">
            <div className="bg-gray-50/30 border-r border-b border-border-light/50 flex items-start justify-start p-3">
              <span className="text-[10px] font-medium text-gray-400">Fill-in</span>
            </div>
            <div className="bg-red-50/20 border-b border-border-light/50 flex items-start justify-end p-3">
              <span className="text-[10px] font-medium text-red-300">À éviter</span>
            </div>
            <div className="bg-green-50/30 border-r border-border-light/50 flex items-end justify-start p-3">
              <span className="text-[10px] font-medium text-green-400">Quick Wins</span>
            </div>
            <div className="bg-blue-50/20 flex items-end justify-end p-3">
              <span className="text-[10px] font-medium text-blue-400">Stratégique</span>
            </div>
          </div>

          {/* Axis labels */}
          <div className="absolute -bottom-5 left-0 right-0 flex justify-between">
            <span className="text-[9px] text-muted-foreground">Faible effort</span>
            <span className="text-[9px] text-muted-foreground font-medium">EFFORT →</span>
            <span className="text-[9px] text-muted-foreground">Fort effort</span>
          </div>
          <div className="absolute -left-5 top-0 bottom-0 flex flex-col justify-between items-center">
            <span className="text-[9px] text-muted-foreground writing-vertical">Fort impact</span>
            <span className="text-[9px] text-muted-foreground font-medium writing-vertical">IMPACT ↑</span>
            <span className="text-[9px] text-muted-foreground writing-vertical">Faible impact</span>
          </div>

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
                    scale: draggingId === story.id ? 1.2 : selectedStory === story.id ? 1.1 : 1,
                    boxShadow:
                      draggingId === story.id
                        ? "0 8px 24px rgba(0,0,0,0.15)"
                        : selectedStory === story.id
                        ? "0 4px 12px rgba(0,0,0,0.1)"
                        : "0 1px 4px rgba(0,0,0,0.06)",
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                >
                  <div
                    className={`w-full h-full rounded-xl flex items-center justify-center border-2 transition-colors ${
                      isFullAi
                        ? "bg-violet-50 border-violet-300"
                        : "bg-amber-50 border-amber-300"
                    } ${selectedStory === story.id ? "ring-2 ring-foreground ring-offset-2" : ""}`}
                  >
                    {isFullAi ? (
                      <Bot className="w-5 h-5 text-violet-600" />
                    ) : (
                      <Wrench className="w-5 h-5 text-amber-600" />
                    )}
                  </div>

                  {/* Tooltip */}
                  <AnimatePresence>
                    {hoveredStory === story.id && draggingId !== story.id && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full bg-foreground text-white rounded-lg px-3 py-2 shadow-elevated z-50 whitespace-nowrap pointer-events-none"
                      >
                        <p className="text-xs font-medium">{story.title || "Sans titre"}</p>
                        <p className="text-[10px] text-white/60 mt-0.5">
                          {story.storyPoints || "?"} pts · {getQuadrantInfo(getQuadrant(pos.x, pos.y)).label}
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
