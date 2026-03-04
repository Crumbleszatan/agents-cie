"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Wrench, GripVertical, X, Zap, Users } from "lucide-react";
import type { UserStory } from "@/types";

interface ShipContainerProps {
  title: string;
  mode: "full-ai" | "engineer-ai";
  stories: UserStory[];
  onStoryClick: (id: string) => void;
  onDrop: (storyId: string) => void;
  onUnship: (storyId: string) => void;
  onAction?: () => void;
  selectedDetailId: string | null;
}

export function ShipContainer({
  title,
  mode,
  stories,
  onStoryClick,
  onDrop,
  onUnship,
  onAction,
  selectedDetailId,
}: ShipContainerProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const isViolet = mode === "full-ai";

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const storyId = e.dataTransfer.getData("text/plain");
    if (storyId) {
      onDrop(storyId);
    }
  };

  const handleDragStart = (e: React.DragEvent, storyId: string) => {
    e.dataTransfer.setData("text/plain", storyId);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div
      className={`flex-1 rounded-xl border-2 transition-all flex flex-col overflow-hidden ${
        isDragOver
          ? isViolet
            ? "border-violet-400 bg-violet-50/50"
            : "border-amber-400 bg-amber-50/50"
          : "border-border-light bg-white"
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className={`px-4 py-2.5 border-b border-border-light flex items-center gap-2 ${
        isViolet ? "bg-violet-50/50" : "bg-amber-50/50"
      }`}>
        <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
          isViolet ? "bg-violet-100" : "bg-amber-100"
        }`}>
          {isViolet ? (
            <Bot className="w-3.5 h-3.5 text-violet-600" />
          ) : (
            <Wrench className="w-3.5 h-3.5 text-amber-600" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-xs font-semibold">{title}</h3>
          <p className="text-[10px] text-muted-foreground">
            {stories.length} US
          </p>
        </div>
        {/* Action button */}
        {stories.length > 0 && onAction && (
          <button
            onClick={onAction}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
              isViolet
                ? "bg-violet-600 text-white hover:bg-violet-700"
                : "bg-amber-600 text-white hover:bg-amber-700"
            }`}
          >
            {isViolet ? (
              <>
                <Zap className="w-3 h-3" />
                Instant Build
              </>
            ) : (
              <>
                <Users className="w-3 h-3" />
                Sent to Team
              </>
            )}
          </button>
        )}
      </div>

      {/* Pills grid */}
      <div className="flex-1 overflow-y-auto p-3">
        {stories.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-xs text-muted-foreground/50">
              {isDragOver ? "Déposer ici" : "Aucune US shippée"}
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <AnimatePresence mode="popLayout">
              {stories.map((story, i) => (
                <motion.div
                  key={story.id}
                  initial={{ opacity: 0, scale: 0.3, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.6, y: -8 }}
                  transition={{
                    type: "spring",
                    stiffness: 100,
                    damping: 14,
                    delay: i * 0.1,
                  }}
                >
                  <div
                    draggable
                    onDragStart={(e) => handleDragStart(e, story.id)}
                    onClick={() => onStoryClick(story.id)}
                    className={`group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${
                      selectedDetailId === story.id
                        ? isViolet
                          ? "border-violet-400 bg-violet-50 ring-1 ring-violet-300"
                          : "border-amber-400 bg-amber-50 ring-1 ring-amber-300"
                        : "border-border-light hover:border-foreground/20 bg-white"
                    }`}
                  >
                    <GripVertical className="w-3 h-3 text-muted-foreground/30 group-hover:text-muted-foreground/60 flex-shrink-0 cursor-grab" />
                    <span className={`text-[10px] font-semibold ${isViolet ? "text-violet-500" : "text-amber-500"}`}>
                      {story.storyNumber ? `US-${story.storyNumber}` : "US"}
                    </span>
                    <span className="text-[11px] font-medium truncate max-w-[120px]">
                      {story.title || "Sans titre"}
                    </span>
                    <span className="text-[9px] text-muted-foreground flex-shrink-0">
                      {story.storyPoints || "?"}pts
                    </span>
                    {/* Remove from container */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onUnship(story.id);
                      }}
                      className="ml-auto w-4 h-4 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-100 transition-all flex-shrink-0"
                      title="Retirer du container"
                    >
                      <X className="w-2.5 h-2.5 text-red-400 hover:text-red-600" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
