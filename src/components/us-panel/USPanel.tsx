"use client";

import { useStore } from "@/store/useStore";
import {
  FileText,
  Plus,
  Copy,
  ExternalLink,
} from "lucide-react";
import { StoryEditForm } from "./StoryEditForm";

export function USPanel() {
  const currentStory = useStore((s) => s.currentStory);
  const saveCurrentStory = useStore((s) => s.saveCurrentStory);
  const startNewStory = useStore((s) => s.startNewStory);
  const storiesCount = useStore((s) => s.stories.length);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border-light flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">User Story</h2>
          <span
            className={`tag ${
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
        <div className="flex items-center gap-1">
          <button className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Content — shared form */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-3">
        <StoryEditForm />
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border-light space-y-2">
        <button
          onClick={() => {
            saveCurrentStory();
            startNewStory();
          }}
          disabled={!currentStory.title}
          className="btn-secondary w-full flex items-center justify-center gap-2 text-xs disabled:opacity-40"
        >
          <Plus className="w-3.5 h-3.5" />
          Sauvegarder &amp; Nouvelle US
          {storiesCount > 0 && (
            <span className="tag text-[9px] ml-1">{storiesCount} sauvée{storiesCount > 1 ? "s" : ""}</span>
          )}
        </button>
      </div>
    </div>
  );
}
