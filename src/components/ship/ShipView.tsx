"use client";

import { useStore } from "@/store/useStore";
import { useMemo, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Send } from "lucide-react";
import { MatrixView } from "@/components/matrix/MatrixView";
import { ShipContainer } from "@/components/ship/ShipContainer";
import { StoryDetailPanel } from "@/components/story-detail/StoryDetailPanel";

interface FlyingStory {
  id: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  epicColor: string | null;
  storyNumber?: number;
}

export function ShipView() {
  const stories = useStore((s) => s.stories);
  const epics = useStore((s) => s.epics);
  const selectedForShip = useStore((s) => s.selectedForShip);
  const shippedStoryIds = useStore((s) => s.shippedStoryIds);
  const clearShipSelection = useStore((s) => s.clearShipSelection);
  const shipStory = useStore((s) => s.shipStory);
  const moveStoryBetweenModes = useStore((s) => s.moveStoryBetweenModes);
  const unshipStory = useStore((s) => s.unshipStory);
  const shipDetailStoryId = useStore((s) => s.shipDetailStoryId);
  const setShipDetailStoryId = useStore((s) => s.setShipDetailStoryId);
  const selectStoryForEditing = useStore((s) => s.selectStoryForEditing);

  // Refs to containers for target position
  const fullAiContainerRef = useRef<HTMLDivElement>(null);
  const engineerContainerRef = useRef<HTMLDivElement>(null);

  // Animation state
  const [flyingStories, setFlyingStories] = useState<FlyingStory[]>([]);
  const [departingIds, setDepartingIds] = useState<Set<string>>(new Set());
  const completedCountRef = useRef(0);

  // Shipped stories split by mode
  const { fullAiShipped, engineerShipped } = useMemo(() => {
    const shipped = stories.filter((s) => shippedStoryIds.has(s.id));
    return {
      fullAiShipped: shipped.filter((s) => s.productionMode === "full-ai"),
      engineerShipped: shipped.filter((s) => s.productionMode === "engineer-ai"),
    };
  }, [stories, shippedStoryIds]);

  const selectionCount = selectedForShip.size;
  const hasShipped = shippedStoryIds.size > 0;

  // ─── Arc balistique ship animation ───
  const handleShip = useCallback(() => {
    const state = useStore.getState();
    const selectedIds = [...state.selectedForShip];
    if (selectedIds.length === 0) return;

    const storiesToShip = state.stories.filter((s) => state.selectedForShip.has(s.id));
    const allEpics = state.epics;

    const entries: FlyingStory[] = [];
    const newDeparting = new Set<string>();

    for (const story of storiesToShip) {
      const dotEl = document.querySelector(`[data-story-id="${story.id}"]`) as HTMLElement | null;
      if (!dotEl) continue;

      const dotRect = dotEl.getBoundingClientRect();
      const mode = story.productionMode;
      const containerRef = mode === "full-ai" ? fullAiContainerRef : engineerContainerRef;
      const containerRect = containerRef.current?.getBoundingClientRect();
      if (!containerRect) continue;

      const epic = story.epicId ? allEpics.find((e) => e.id === story.epicId) : null;

      entries.push({
        id: story.id,
        sourceX: dotRect.left + dotRect.width / 2,
        sourceY: dotRect.top + dotRect.height / 2,
        targetX: containerRect.left + containerRect.width / 2,
        targetY: containerRect.top + 50,
        epicColor: epic?.color || null,
        storyNumber: story.storyNumber,
      });

      newDeparting.add(story.id);
    }

    if (entries.length === 0) return;

    // Clear selection checkmarks
    clearShipSelection();

    // Start departure glow + flying overlay
    completedCountRef.current = 0;
    setDepartingIds(newDeparting);
    setFlyingStories(entries);
  }, [clearShipSelection]);

  const handleFlyComplete = useCallback(
    (storyId: string, totalCount: number) => {
      // Ship this story → pill appears in container
      shipStory(storyId);

      // Remove from departing set
      setDepartingIds((prev) => {
        const next = new Set(prev);
        next.delete(storyId);
        return next;
      });

      // Clear overlay when all done
      completedCountRef.current += 1;
      if (completedCountRef.current >= totalCount) {
        setTimeout(() => setFlyingStories([]), 150);
      }
    },
    [shipStory]
  );

  const handleStoryClick = (id: string) => {
    setShipDetailStoryId(id);
    selectStoryForEditing(id);
  };

  const handleDrop = (storyId: string) => {
    moveStoryBetweenModes(storyId);
  };

  const handleUnship = (storyId: string) => {
    unshipStory(storyId);
  };

  const showDetail = hasShipped && shipDetailStoryId;

  return (
    <>
      <div className="h-full flex gap-2 p-2">
        {/* Left: Detail panel (~25%) — only when a shipped US is selected */}
        <AnimatePresence mode="wait">
          {showDetail && (
            <motion.div
              key="detail"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "25%", opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="panel shadow-soft overflow-hidden flex flex-col flex-shrink-0"
            >
              <StoryDetailPanel />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Center: Matrix in selection mode (~50%) */}
        <div className="flex-1 panel shadow-soft overflow-hidden flex flex-col relative min-w-0">
          <MatrixView selectionMode departingIds={departingIds} />

          {/* Floating Ship button */}
          <AnimatePresence>
            {selectionCount > 0 && (
              <motion.button
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 300, damping: 22 }}
                onClick={handleShip}
                className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 bg-foreground text-white rounded-full px-6 py-3 shadow-lg hover:shadow-xl transition-shadow flex items-center gap-2 text-sm font-semibold"
              >
                <Send className="w-4 h-4" />
                Ship {selectionCount} US
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Right: Containers (~25%) — each 50% height, scrollable */}
        <div className="w-[25%] flex flex-col gap-2 flex-shrink-0 min-h-0 overflow-hidden">
          <div ref={fullAiContainerRef} className="flex-1 flex flex-col min-h-0">
            <ShipContainer
              title="Instant Shipped"
              mode="full-ai"
              stories={fullAiShipped}
              epics={epics}
              onStoryClick={handleStoryClick}
              onDrop={handleDrop}
              onUnship={handleUnship}
              onAction={() => {/* TODO: trigger instant build */}}
              selectedDetailId={shipDetailStoryId}
            />
          </div>
          <div ref={engineerContainerRef} className="flex-1 flex flex-col min-h-0">
            <ShipContainer
              title="Human Powered"
              mode="engineer-ai"
              stories={engineerShipped}
              epics={epics}
              onStoryClick={handleStoryClick}
              onDrop={handleDrop}
              onUnship={handleUnship}
              onAction={() => {/* TODO: send to team */}}
              selectedDetailId={shipDetailStoryId}
            />
          </div>
        </div>
      </div>

      {/* ─── Flying overlay: arc balistique animation ─── */}
      {typeof document !== "undefined" &&
        flyingStories.length > 0 &&
        createPortal(
          <div className="fixed inset-0 z-[9998] pointer-events-none overflow-hidden">
            {flyingStories.map((fs, i) => {
              const midX = (fs.sourceX + fs.targetX) / 2;
              const arcHeight = Math.abs(fs.targetY - fs.sourceY) * 0.4 + 80;
              const midY = Math.min(fs.sourceY, fs.targetY) - arcHeight;
              const totalCount = flyingStories.length;

              return (
                <motion.div
                  key={fs.id}
                  className="absolute rounded-xl flex items-center justify-center"
                  style={{
                    left: 0,
                    top: 0,
                    width: 40,
                    height: 40,
                    backgroundColor: fs.epicColor ? `${fs.epicColor}25` : "#f1f5f9",
                    border: `2px solid ${fs.epicColor || "#94a3b8"}`,
                  }}
                  initial={{
                    x: fs.sourceX - 20,
                    y: fs.sourceY - 20,
                    scale: 1,
                    opacity: 1,
                    boxShadow: `0 0 0px 0px ${fs.epicColor || "#64748b"}00`,
                  }}
                  animate={{
                    x: [fs.sourceX - 20, midX - 20, fs.targetX - 20],
                    y: [fs.sourceY - 20, midY - 20, fs.targetY - 20],
                    scale: [1, 0.7, 0.45],
                    opacity: [1, 0.95, 0],
                    rotate: [0, -12, 0],
                    boxShadow: [
                      `0 0 8px 4px ${fs.epicColor || "#64748b"}30`,
                      `0 0 20px 10px ${fs.epicColor || "#64748b"}50`,
                      `0 0 4px 2px ${fs.epicColor || "#64748b"}00`,
                    ],
                  }}
                  transition={{
                    duration: 1,
                    delay: i * 0.12,
                    ease: [0.25, 0.1, 0.25, 1],
                    times: [0, 0.45, 1],
                  }}
                  onAnimationComplete={() => handleFlyComplete(fs.id, totalCount)}
                >
                  <span
                    className="text-[9px] font-bold"
                    style={{ color: fs.epicColor || "#64748b" }}
                  >
                    {fs.storyNumber ? `US-${fs.storyNumber}` : "US"}
                  </span>
                </motion.div>
              );
            })}
          </div>,
          document.body
        )}
    </>
  );
}
