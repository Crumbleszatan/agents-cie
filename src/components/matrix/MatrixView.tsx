"use client";

import { useStore } from "@/store/useStore";
import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  Users,
  ArrowRight,
  Bot,
  Wrench,
  Star,
  Plus,
  Trash2,
  RotateCcw,
  Play,
} from "lucide-react";
import type { UserStory } from "@/types";

const MATRIX_SIZE = 500;
const DOT_SIZE = 48;

export function MatrixView() {
  const stories = useStore((s) => s.stories);
  const updateStoryMatrixPosition = useStore((s) => s.updateStoryMatrixPosition);
  const setStoryProductionMode = useStore((s) => s.setStoryProductionMode);
  const updateStoryInList = useStore((s) => s.updateStoryInList);
  const setAppPhase = useStore((s) => s.setAppPhase);
  const createCapsule = useStore((s) => s.createCapsule);
  const project = useStore((s) => s.project);

  const matrixRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [selectedStory, setSelectedStory] = useState<string | null>(null);
  const [hoveredStory, setHoveredStory] = useState<string | null>(null);

  // Initialize matrix positions if not set
  useEffect(() => {
    stories.forEach((story) => {
      if (!story.matrixPosition) {
        // Place based on effort/impact with some randomness
        const x = Math.max(5, Math.min(95, story.effort + (Math.random() * 10 - 5)));
        const y = Math.max(5, Math.min(95, story.impact || (50 + Math.random() * 30 - 15)));
        updateStoryMatrixPosition(story.id, x, y);
      }
    });
  }, [stories, updateStoryMatrixPosition]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, storyId: string) => {
      e.preventDefault();
      setDraggingId(storyId);
      setSelectedStory(storyId);
    },
    []
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!draggingId || !matrixRef.current) return;
      const rect = matrixRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, 100 - ((e.clientY - rect.top) / rect.height) * 100));
      updateStoryMatrixPosition(draggingId, x, y);
    },
    [draggingId, updateStoryMatrixPosition]
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
        return { label: "Quick Wins", color: "text-green-600", bg: "bg-green-50/50", desc: "Faible effort, fort impact" };
      case "strategic":
        return { label: "Projets Stratégiques", color: "text-blue-600", bg: "bg-blue-50/50", desc: "Fort effort, fort impact" };
      case "fill-in":
        return { label: "Fill-in", color: "text-gray-500", bg: "bg-gray-50/50", desc: "Faible effort, faible impact" };
      case "avoid":
        return { label: "À éviter", color: "text-red-500", bg: "bg-red-50/50", desc: "Fort effort, faible impact" };
      default:
        return { label: "", color: "", bg: "", desc: "" };
    }
  };

  const fullAiCount = stories.filter((s) => s.productionMode === "full-ai").length;
  const engineerAiCount = stories.filter((s) => s.productionMode === "engineer-ai").length;

  const handleBuildMatrix = () => {
    // Save current matrix state and move to ship phase
    createCapsule(project?.name ? `Capsule ${project.name}` : "Capsule 1");
    setAppPhase("ship");
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
      <div className="px-5 py-4 border-b border-border-light flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-foreground flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            Matrice Effort / Impact
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {stories.length} User Stories &middot; Glissez-déposez pour prioriser
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleAutoPlace}
            className="btn-secondary flex items-center gap-1.5 text-xs"
          >
            <RotateCcw className="w-3 h-3" />
            Auto-placer
          </button>
          <button
            onClick={handleBuildMatrix}
            disabled={stories.length === 0}
            className="btn-primary flex items-center gap-1.5 text-xs disabled:opacity-50"
          >
            <Play className="w-3 h-3" />
            Build la capsule
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Matrix Area */}
        <div className="flex-1 p-5 flex items-center justify-center">
          <div className="relative" style={{ width: MATRIX_SIZE, height: MATRIX_SIZE }}>
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
            <div className="absolute -bottom-6 left-0 right-0 flex justify-between">
              <span className="text-[10px] text-muted-foreground">Faible effort</span>
              <span className="text-[10px] text-muted-foreground font-medium">EFFORT →</span>
              <span className="text-[10px] text-muted-foreground">Fort effort</span>
            </div>
            <div className="absolute -left-6 top-0 bottom-0 flex flex-col justify-between items-center">
              <span className="text-[10px] text-muted-foreground writing-vertical">Fort impact</span>
              <span className="text-[10px] text-muted-foreground font-medium writing-vertical">IMPACT →</span>
              <span className="text-[10px] text-muted-foreground writing-vertical">Faible impact</span>
            </div>

            {/* Draggable area */}
            <div
              ref={matrixRef}
              className="absolute inset-0 z-10"
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {stories.map((story) => {
                const pos = story.matrixPosition || { x: 50, y: 50 };
                const left = (pos.x / 100) * MATRIX_SIZE - DOT_SIZE / 2;
                const top = ((100 - pos.y) / 100) * MATRIX_SIZE - DOT_SIZE / 2;
                const isFullAi = story.productionMode === "full-ai";

                return (
                  <motion.div
                    key={story.id}
                    className={`absolute cursor-grab active:cursor-grabbing select-none ${
                      draggingId === story.id ? "z-30" : "z-20"
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
                            {story.storyPoints || "?"} pts &middot;{" "}
                            {isFullAi ? "Full IA" : "Engineer + IA"}
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

        {/* Right sidebar — Story detail / Legend */}
        <div className="w-72 border-l border-border-light overflow-y-auto scrollbar-thin">
          {/* Legend */}
          <div className="px-4 py-3 border-b border-border-light">
            <h3 className="text-xs font-semibold text-muted-foreground mb-2">Légende</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-violet-50 border-2 border-violet-300 flex items-center justify-center">
                  <Bot className="w-3.5 h-3.5 text-violet-600" />
                </div>
                <div>
                  <p className="text-xs font-medium">Full IA</p>
                  <p className="text-[10px] text-muted-foreground">{fullAiCount} stories</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-50 border-2 border-amber-300 flex items-center justify-center">
                  <Wrench className="w-3.5 h-3.5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs font-medium">Engineer + IA</p>
                  <p className="text-[10px] text-muted-foreground">{engineerAiCount} stories</p>
                </div>
              </div>
            </div>
          </div>

          {/* KPIs */}
          <div className="px-4 py-3 border-b border-border-light">
            <h3 className="text-xs font-semibold text-muted-foreground mb-2">Résumé</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="panel-inset p-2.5 rounded-xl">
                <p className="text-lg font-bold">{stories.length}</p>
                <p className="text-[10px] text-muted-foreground">User Stories</p>
              </div>
              <div className="panel-inset p-2.5 rounded-xl">
                <p className="text-lg font-bold">
                  {stories.reduce((sum, s) => sum + (s.storyPoints || 0), 0)}
                </p>
                <p className="text-[10px] text-muted-foreground">Story Points</p>
              </div>
            </div>
          </div>

          {/* Stories list */}
          <div className="px-4 py-3">
            <h3 className="text-xs font-semibold text-muted-foreground mb-2">Stories</h3>
            <div className="space-y-1.5">
              {stories.map((story) => {
                const isFullAi = story.productionMode === "full-ai";
                return (
                  <button
                    key={story.id}
                    onClick={() => setSelectedStory(story.id === selectedStory ? null : story.id)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all ${
                      selectedStory === story.id
                        ? "bg-foreground text-white"
                        : "hover:bg-muted"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {isFullAi ? (
                        <Bot className="w-3 h-3 flex-shrink-0" />
                      ) : (
                        <Wrench className="w-3 h-3 flex-shrink-0" />
                      )}
                      <span className="font-medium truncate">{story.title || "Sans titre"}</span>
                    </div>
                    <div className={`flex items-center gap-2 mt-1 ${
                      selectedStory === story.id ? "text-white/60" : "text-muted-foreground"
                    }`}>
                      <span>{story.storyPoints || "?"} pts</span>
                      <span>&middot;</span>
                      <span className="capitalize">{story.priority}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected story detail */}
          <AnimatePresence>
            {selectedStoryData && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="border-t border-border-light overflow-hidden"
              >
                <div className="px-4 py-3 space-y-3">
                  <h3 className="text-xs font-semibold">
                    {selectedStoryData.title || "Sans titre"}
                  </h3>

                  {/* Production Mode Toggle */}
                  <div>
                    <p className="text-[10px] text-muted-foreground font-medium mb-1.5">
                      Mode de production
                    </p>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => setStoryProductionMode(selectedStoryData.id, "full-ai")}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-medium transition-all ${
                          selectedStoryData.productionMode === "full-ai"
                            ? "bg-violet-100 text-violet-700 border border-violet-300"
                            : "bg-muted text-muted-foreground hover:bg-violet-50"
                        }`}
                      >
                        <Bot className="w-3 h-3" />
                        Full IA
                      </button>
                      <button
                        onClick={() =>
                          setStoryProductionMode(selectedStoryData.id, "engineer-ai")
                        }
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-medium transition-all ${
                          selectedStoryData.productionMode === "engineer-ai"
                            ? "bg-amber-100 text-amber-700 border border-amber-300"
                            : "bg-muted text-muted-foreground hover:bg-amber-50"
                        }`}
                      >
                        <Wrench className="w-3 h-3" />
                        Engineer + IA
                      </button>
                    </div>
                  </div>

                  {/* Position info */}
                  <div className="panel-inset p-2.5 rounded-xl space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">Effort</span>
                      <span className="font-medium">
                        {Math.round(selectedStoryData.matrixPosition?.x || 0)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">Impact</span>
                      <span className="font-medium">
                        {Math.round(selectedStoryData.matrixPosition?.y || 0)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">Quadrant</span>
                      <span className="font-medium capitalize">
                        {getQuadrantInfo(
                          getQuadrant(
                            selectedStoryData.matrixPosition?.x || 50,
                            selectedStoryData.matrixPosition?.y || 50
                          )
                        ).label}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
