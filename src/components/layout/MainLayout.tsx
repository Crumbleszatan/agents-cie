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
import { ChatSyncProvider } from "@/components/providers/ChatSyncProvider";
import { EpicSyncProvider } from "@/components/providers/EpicSyncProvider";
import { TopBar } from "@/components/layout/TopBar";
import { useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from "lucide-react";

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
      <ChatSyncProvider />
      <EpicSyncProvider />

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
          <div className="flex-1 panel shadow-soft overflow-hidden flex flex-col min-w-0 relative group/center">
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

            {/* Collapse right panel — discreet, vertically centered */}
            {showRightPanel && (
              <button
                onClick={() => setCenterPanelFullscreen(true)}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-5 h-10 rounded-l-md bg-foreground/[0.04] opacity-0 group-hover/center:opacity-100 hover:!bg-foreground/10 transition-all flex items-center justify-center text-muted-foreground/50 hover:!text-foreground"
                title="Masquer le panneau droit"
              >
                <PanelRightClose className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Closed center panel — vertical tab to reopen */}
        {!showCenterPanel && (
          <button
            onClick={() => setRightPanelFullscreen(false)}
            className="w-7 flex-shrink-0 flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border-light hover:border-foreground/20 hover:bg-muted/50 transition-all group/restore cursor-pointer"
            title="Restaurer le preview"
          >
            <PanelLeftOpen className="w-3.5 h-3.5 text-muted-foreground/40 group-hover/restore:text-foreground transition-colors" />
            <span className="text-[9px] text-muted-foreground/40 group-hover/restore:text-muted-foreground font-medium [writing-mode:vertical-lr] tracking-wider transition-colors">
              PREVIEW
            </span>
          </button>
        )}

        {/* Right Resize Handle */}
        {showRightPanel && showCenterPanel && (
          <div
            className="w-1 cursor-col-resize hover:bg-foreground/10 rounded-full transition-colors flex-shrink-0"
            onMouseDown={() => onMouseDown("right")}
          />
        )}

        {/* Closed right panel — vertical tab to reopen */}
        {!showRightPanel && (
          <button
            onClick={() => setCenterPanelFullscreen(false)}
            className="w-7 flex-shrink-0 flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border-light hover:border-foreground/20 hover:bg-muted/50 transition-all group/restore cursor-pointer"
            title="Restaurer le panneau US"
          >
            <PanelRightOpen className="w-3.5 h-3.5 text-muted-foreground/40 group-hover/restore:text-foreground transition-colors" />
            <span className="text-[9px] text-muted-foreground/40 group-hover/restore:text-muted-foreground font-medium [writing-mode:vertical-lr] tracking-wider transition-colors">
              {appPhase === "build" ? "US" : "DÉTAIL"}
            </span>
          </button>
        )}

        {/* Right: US Panel */}
        {showRightPanel && (
          <div
            className={`panel shadow-soft overflow-hidden flex flex-col relative group/right ${
              rightPanelFullscreen ? "flex-1" : ""
            }`}
            style={
              rightPanelFullscreen
                ? {}
                : { width: rightPanelWidth, minWidth: rightPanelWidth }
            }
          >
            {/* Expand right panel — discreet, vertically centered */}
            {showCenterPanel && (
              <button
                onClick={() => setRightPanelFullscreen(true)}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-5 h-10 rounded-r-md bg-foreground/[0.04] opacity-0 group-hover/right:opacity-100 hover:!bg-foreground/10 transition-all flex items-center justify-center text-muted-foreground/50 hover:!text-foreground"
                title="Maximiser le panneau US"
              >
                <PanelLeftClose className="w-3.5 h-3.5" />
              </button>
            )}
            {appPhase === "build" ? <USPanel /> : <StoryDetailPanel />}
          </div>
        )}
      </div>
    </div>
  );
}
