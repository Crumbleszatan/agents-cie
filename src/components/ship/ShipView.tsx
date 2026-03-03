"use client";

import { useStore } from "@/store/useStore";
import { useMemo } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { Rocket, Send } from "lucide-react";
import { MatrixView } from "@/components/matrix/MatrixView";
import { ShipContainer } from "@/components/ship/ShipContainer";
import { StoryDetailPanel } from "@/components/story-detail/StoryDetailPanel";

export function ShipView() {
  const stories = useStore((s) => s.stories);
  const selectedForShip = useStore((s) => s.selectedForShip);
  const shippedStoryIds = useStore((s) => s.shippedStoryIds);
  const shipSelectedStories = useStore((s) => s.shipSelectedStories);
  const moveStoryBetweenModes = useStore((s) => s.moveStoryBetweenModes);
  const unshipStory = useStore((s) => s.unshipStory);
  const shipDetailStoryId = useStore((s) => s.shipDetailStoryId);
  const setShipDetailStoryId = useStore((s) => s.setShipDetailStoryId);
  const selectStoryForEditing = useStore((s) => s.selectStoryForEditing);

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

  const handleShip = () => {
    shipSelectedStories();
  };

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

  return (
    <LayoutGroup>
      <div className="h-full flex gap-2 p-2">
        {/* Left: Matrix in selection mode */}
        <div className="flex-1 panel shadow-soft overflow-hidden flex flex-col relative min-w-0">
          <MatrixView selectionMode />

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

        {/* Right: Containers + detail panel */}
        <div className="w-[45%] flex flex-col gap-2">
          {/* Top: containers */}
          <div className={`flex flex-col gap-2 ${hasShipped && shipDetailStoryId ? "h-[55%]" : "flex-1"}`}>
            <ShipContainer
              title="Instant Shipped"
              mode="full-ai"
              stories={fullAiShipped}
              onStoryClick={handleStoryClick}
              onDrop={handleDrop}
              onUnship={handleUnship}
              onAction={() => {/* TODO: trigger instant build */}}
              selectedDetailId={shipDetailStoryId}
            />
            <ShipContainer
              title="Human Powered"
              mode="engineer-ai"
              stories={engineerShipped}
              onStoryClick={handleStoryClick}
              onDrop={handleDrop}
              onUnship={handleUnship}
              onAction={() => {/* TODO: send to team */}}
              selectedDetailId={shipDetailStoryId}
            />
          </div>

          {/* Bottom: detail panel (always visible) */}
          {hasShipped && shipDetailStoryId && (
            <div className="h-[45%] panel shadow-soft overflow-hidden flex flex-col">
              <StoryDetailPanel />
            </div>
          )}

          {/* Empty state overlay */}
          {!hasShipped && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-2">
                  <Rocket className="w-6 h-6 text-muted-foreground/40" />
                </div>
                <p className="text-xs text-muted-foreground/50">
                  Sélectionnez des US dans la matrice puis cliquez Ship
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </LayoutGroup>
  );
}
