"use client";

import { useStore } from "@/store/useStore";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { CenterPreview } from "@/components/preview/CenterPreview";
import { USPanel } from "@/components/us-panel/USPanel";
import { MatrixView } from "@/components/matrix/MatrixView";
import { ProductionView } from "@/components/production/ProductionView";
import { StoryListPanel } from "@/components/story-list/StoryListPanel";
import { StoryDetailPanel } from "@/components/story-detail/StoryDetailPanel";
import { StorySyncProvider } from "@/components/providers/StorySyncProvider";
import { TopBar } from "@/components/layout/TopBar";
import { useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function MainLayout() {
  const appPhase = useStore((s) => s.appPhase);
  const leftPanelWidth = useStore((s) => s.leftPanelWidth);
  const rightPanelWidth = useStore((s) => s.rightPanelWidth);
  const setLeftPanelWidth = useStore((s) => s.setLeftPanelWidth);
  const setRightPanelWidth = useStore((s) => s.setRightPanelWidth);
  const centerPanelFullscreen = useStore((s) => s.centerPanelFullscreen);
  const setCenterPanelFullscreen = useStore((s) => s.setCenterPanelFullscreen);
  const rightPanelFullscreen = useStore((s) => s.rightPanelFullscreen);
  const setRightPanelFullscreen = useStore((s) => s.setRightPanelFullscreen);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<"left" | "right" | null>(null);

  const onMouseDown = useCallback((side: "left" | "right") => {
    dragging.current = side;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMouseMove = (e: MouseEvent) => {
      if (!containerRef.current || !dragging.current) return;
      const rect = containerRef.current.getBoundingClientRect();

      if (dragging.current === "left") {
        const newWidth = Math.max(320, Math.min(600, e.clientX - rect.left));
        setLeftPanelWidth(newWidth);
      } else {
        const newWidth = Math.max(320, Math.min(500, rect.right - e.clientX));
        setRightPanelWidth(newWidth);
      }
    };

    const onMouseUp = () => {
      dragging.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, [setLeftPanelWidth, setRightPanelWidth]);

  // Determine what the center panel renders based on appPhase
  const renderCenterContent = () => {
    switch (appPhase) {
      case "build":
        return <CenterPreview />;
      case "prioritize":
        return <MatrixView />;
      case "ship":
        return <ProductionView />;
      default:
        return <CenterPreview />;
    }
  };

  // Show right panel (US Panel) unless center is in fullscreen
  const showRightPanel = !centerPanelFullscreen;
  // Show center panel unless right panel is in fullscreen
  const showCenterPanel = !rightPanelFullscreen;

  return (
    <div className="h-full flex flex-col bg-[#fafafa]">
      <TopBar />
      <StorySyncProvider />

      <div
        ref={containerRef}
        className="flex-1 flex overflow-hidden p-2 gap-2"
      >
        {/* Left Panel: Chat (Build) or StoryList (Prioritize/Ship) */}
        <div
          className="panel shadow-soft overflow-hidden flex flex-col"
          style={{ width: leftPanelWidth, minWidth: leftPanelWidth }}
        >
          {appPhase === "build" ? <ChatPanel /> : <StoryListPanel />}
        </div>

        {/* Left Resize Handle */}
        <div
          className="w-1 cursor-col-resize hover:bg-foreground/10 rounded-full transition-colors flex-shrink-0"
          onMouseDown={() => onMouseDown("left")}
        />

        {/* Center Panel */}
        {showCenterPanel && (
          <div className="flex-1 panel shadow-soft overflow-hidden flex flex-col min-w-0 relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={appPhase}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="flex-1 flex flex-col overflow-hidden"
              >
                {renderCenterContent()}
              </motion.div>
            </AnimatePresence>

            {/* Collapse right panel button (expand center to fullscreen) */}
            {showRightPanel && (
              <button
                onClick={() => setCenterPanelFullscreen(true)}
                className="absolute top-2 right-2 z-10 w-6 h-6 bg-white/80 backdrop-blur-sm rounded-md border border-border-light flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white transition-all shadow-sm"
                title="Maximiser le preview"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Restore center panel button (when right panel is fullscreen) */}
        {!showCenterPanel && (
          <button
            onClick={() => setRightPanelFullscreen(false)}
            className="w-6 flex-shrink-0 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-all"
            title="Restaurer le preview"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Right Resize Handle */}
        {showRightPanel && showCenterPanel && (
          <div
            className="w-1 cursor-col-resize hover:bg-foreground/10 rounded-full transition-colors flex-shrink-0"
            onMouseDown={() => onMouseDown("right")}
          />
        )}

        {/* Restore right panel button (when center is fullscreen) */}
        {!showRightPanel && (
          <button
            onClick={() => setCenterPanelFullscreen(false)}
            className="w-6 flex-shrink-0 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-all"
            title="Restaurer le panneau US"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Right: US Panel */}
        {showRightPanel && (
          <div
            className={`panel shadow-soft overflow-hidden flex flex-col ${
              rightPanelFullscreen ? "flex-1" : ""
            }`}
            style={
              rightPanelFullscreen
                ? {}
                : { width: rightPanelWidth, minWidth: rightPanelWidth }
            }
          >
            {/* Expand right panel button */}
            {showCenterPanel && (
              <button
                onClick={() => setRightPanelFullscreen(true)}
                className="absolute top-2 left-2 z-10 w-6 h-6 bg-white/80 backdrop-blur-sm rounded-md border border-border-light flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white transition-all shadow-sm"
                title="Maximiser le panneau US"
                style={{ position: "relative", top: 0, left: 0, marginBottom: -24 }}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            )}
            {appPhase === "build" ? <USPanel /> : <StoryDetailPanel />}
          </div>
        )}
      </div>
    </div>
  );
}
