"use client";

import { useStore } from "@/store/useStore";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, Box, RefreshCw, Maximize2, ArrowLeft, ArrowRight, ExternalLink } from "lucide-react";
import { WebsitePreview } from "@/components/preview/WebsitePreview";
import { ArchitectureView } from "@/components/architecture/ArchitectureView";

export function CenterPreview() {
  const viewMode = useStore((s) => s.viewMode);
  const setViewMode = useStore((s) => s.setViewMode);
  const selectedPageUrl = useStore((s) => s.selectedPageUrl);
  const project = useStore((s) => s.project);

  return (
    <div className="flex flex-col h-full">
      {/* Preview Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-light">
        <div className="flex items-center gap-1 bg-muted rounded-xl p-0.5">
          <button
            onClick={() => setViewMode("website")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              viewMode === "website"
                ? "bg-white text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            Website
          </button>
          <button
            onClick={() => setViewMode("architecture")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              viewMode === "architecture"
                ? "bg-white text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            Architecture
          </button>
        </div>

        {viewMode === "website" && (
          <div className="flex items-center gap-2">
            {/* Browser-like controls */}
            <div className="flex items-center gap-1">
              <button className="p-1 rounded-md hover:bg-muted transition-colors text-muted-foreground">
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
              <button className="p-1 rounded-md hover:bg-muted transition-colors text-muted-foreground">
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button className="p-1 rounded-md hover:bg-muted transition-colors text-muted-foreground">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* URL Bar */}
            <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-1.5 min-w-[200px]">
              <Globe className="w-3 h-3 text-muted-foreground flex-shrink-0" />
              <span className="text-xs text-muted-foreground truncate">
                {selectedPageUrl || project?.websiteUrl || "https://"}
              </span>
            </div>

            <button className="p-1 rounded-md hover:bg-muted transition-colors text-muted-foreground">
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
            <button className="p-1 rounded-md hover:bg-muted transition-colors text-muted-foreground">
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          {viewMode === "website" ? (
            <motion.div
              key="website"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0"
            >
              <WebsitePreview />
            </motion.div>
          ) : (
            <motion.div
              key="architecture"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0"
            >
              <ArchitectureView />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
