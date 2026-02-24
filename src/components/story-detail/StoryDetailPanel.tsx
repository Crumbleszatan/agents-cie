"use client";

import { useStore } from "@/store/useStore";
import { motion } from "framer-motion";
import {
  FileText,
  X,
  Save,
  MousePointerClick,
} from "lucide-react";
import { StoryEditForm } from "@/components/us-panel/StoryEditForm";

export function StoryDetailPanel() {
  const selectedStoryId = useStore((s) => s.selectedStoryId);
  const currentStory = useStore((s) => s.currentStory);
  const setSelectedStoryId = useStore((s) => s.setSelectedStoryId);
  const saveCurrentStory = useStore((s) => s.saveCurrentStory);

  // Empty state — no story selected
  if (!selectedStoryId) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-muted-foreground">
        <MousePointerClick className="w-10 h-10 mb-3 opacity-20" />
        <p className="text-sm font-medium">Sélectionnez une US</p>
        <p className="text-xs mt-1 text-muted-foreground/60">
          Cliquez dans la liste ou la matrice
        </p>
      </div>
    );
  }

  return (
    <motion.div
      key={selectedStoryId}
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.15 }}
      className="flex flex-col h-full"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-border-light flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <h2 className="text-sm font-semibold truncate">
            {currentStory.title || "Sans titre"}
          </h2>
          <span
            className={`tag flex-shrink-0 ${
              currentStory.status === "draft"
                ? ""
                : currentStory.status === "refining"
                ? "tag-warning"
                : "tag-success"
            }`}
          >
            {currentStory.status === "draft"
              ? "Brouillon"
              : currentStory.status === "refining"
              ? "En cours"
              : "Prête"}
          </span>
        </div>
        <button
          onClick={() => {
            saveCurrentStory();
            setSelectedStoryId(null);
          }}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          title="Fermer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Content — shared form (no epics section in detail view) */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-3">
        <StoryEditForm showEpicsSection={false} />
      </div>

      {/* Footer — Save only */}
      <div className="px-4 py-3 border-t border-border-light">
        <button
          onClick={() => saveCurrentStory()}
          disabled={!currentStory.title}
          className="btn-primary w-full flex items-center justify-center gap-2 text-xs disabled:opacity-40"
        >
          <Save className="w-3.5 h-3.5" />
          Sauvegarder
        </button>
      </div>
    </motion.div>
  );
}
