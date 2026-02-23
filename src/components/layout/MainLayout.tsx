"use client";

import { useStore } from "@/store/useStore";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { CenterPreview } from "@/components/preview/CenterPreview";
import { USPanel } from "@/components/us-panel/USPanel";
import { MatrixView } from "@/components/matrix/MatrixView";
import { ProductionView } from "@/components/production/ProductionView";
import { TopBar } from "@/components/layout/TopBar";
import { useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function MainLayout() {
  const appPhase = useStore((s) => s.appPhase);
  const leftPanelWidth = useStore((s) => s.leftPanelWidth);
  const rightPanelWidth = useStore((s) => s.rightPanelWidth);
  const setLeftPanelWidth = useStore((s) => s.setLeftPanelWidth);
  const setRightPanelWidth = useStore((s) => s.setRightPanelWidth);

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

  return (
    <div className="h-full flex flex-col bg-[#fafafa]">
      <TopBar />

      <AnimatePresence mode="wait">
        {appPhase === "build" && (
          <motion.div
            key="build"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            ref={containerRef}
            className="flex-1 flex overflow-hidden p-2 gap-2"
          >
            {/* Left: Chat Panel */}
            <div
              className="panel shadow-soft overflow-hidden flex flex-col"
              style={{ width: leftPanelWidth, minWidth: leftPanelWidth }}
            >
              <ChatPanel />
            </div>

            {/* Left Resize Handle */}
            <div
              className="w-1 cursor-col-resize hover:bg-foreground/10 rounded-full transition-colors flex-shrink-0"
              onMouseDown={() => onMouseDown("left")}
            />

            {/* Center: Website/Architecture Preview */}
            <div className="flex-1 panel shadow-soft overflow-hidden flex flex-col min-w-0">
              <CenterPreview />
            </div>

            {/* Right Resize Handle */}
            <div
              className="w-1 cursor-col-resize hover:bg-foreground/10 rounded-full transition-colors flex-shrink-0"
              onMouseDown={() => onMouseDown("right")}
            />

            {/* Right: US Panel */}
            <div
              className="panel shadow-soft overflow-hidden flex flex-col"
              style={{ width: rightPanelWidth, minWidth: rightPanelWidth }}
            >
              <USPanel />
            </div>
          </motion.div>
        )}

        {appPhase === "prioritize" && (
          <motion.div
            key="prioritize"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="flex-1 overflow-hidden p-2"
          >
            <div className="panel shadow-soft overflow-hidden h-full">
              <MatrixView />
            </div>
          </motion.div>
        )}

        {appPhase === "ship" && (
          <motion.div
            key="ship"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="flex-1 overflow-hidden p-2"
          >
            <div className="panel shadow-soft overflow-hidden h-full">
              <ProductionView />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
