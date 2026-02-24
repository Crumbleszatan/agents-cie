"use client";

import { useState, useMemo, useCallback } from "react";
import { useStore } from "@/store/useStore";
import { useMessages } from "@/hooks/useMessages";
import { useStories } from "@/hooks/useStories";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Search, MessageSquare, X } from "lucide-react";
import type { ChatMessage, UserStory } from "@/types";

interface StoryConversation {
  story: UserStory;
  messages: ChatMessage[];
  lastMessage: ChatMessage;
}

export function ChatHistory({ onClose }: { onClose: () => void }) {
  const currentProjectId = useStore((s) => s.currentProjectId);
  const currentStory = useStore((s) => s.currentStory);
  const currentStoryId = currentStory.id;
  const stories = useStore((s) => s.stories);
  const editStory = useStore((s) => s.editStory);
  const storeMessages = useStore((s) => s.messages);

  const { allMessages, searchMessages } = useMessages(currentProjectId);
  const { stories: dbStories } = useStories(currentProjectId);

  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ChatMessage[] | null>(null);
  const [searching, setSearching] = useState(false);

  // Build a lookup map: DB stories + Zustand stories + current unsaved story
  const storyMap = useMemo(() => {
    const map = new Map<string, UserStory>();
    // DB stories (most complete source)
    for (const s of dbStories) map.set(s.id, s);
    // Zustand store stories (may have local changes)
    for (const s of stories) map.set(s.id, s);
    // Current unsaved story
    if (!map.has(currentStoryId) && storeMessages.length > 0) {
      map.set(currentStoryId, currentStory);
    }
    return map;
  }, [dbStories, stories, currentStoryId, currentStory, storeMessages.length]);

  // Merge DB messages with current in-memory messages (for unsaved story)
  const mergedMessages = useMemo(() => {
    const dbIds = new Set(allMessages.map((m) => m.id));
    const extra = storeMessages.filter((m) => !dbIds.has(m.id));
    return [...allMessages, ...extra];
  }, [allMessages, storeMessages]);

  // Group all messages by storyId → map to story
  const conversations = useMemo<StoryConversation[]>(() => {
    const grouped = new Map<string, ChatMessage[]>();

    const source = searchResults ?? mergedMessages;

    for (const msg of source) {
      if (!msg.storyId) continue;
      const existing = grouped.get(msg.storyId) || [];
      existing.push(msg);
      grouped.set(msg.storyId, existing);
    }

    const result: StoryConversation[] = [];
    for (const [storyId, msgs] of grouped) {
      if (msgs.length === 0) continue;
      // Use known story or build a placeholder for orphan messages
      const story = storyMap.get(storyId) ?? {
        id: storyId,
        title: "",
        asA: "", iWant: "", soThat: "",
        acceptanceCriteria: [], subtasks: [],
        storyPoints: null, priority: "medium" as const,
        labels: [], affectedPages: [], affectedServices: [], definitionOfDone: [],
        status: "draft" as const, effort: 0, impact: 0,
        productionMode: "engineer-ai" as const, productionStatus: "backlog",
        linesOfCode: 0, completionPercent: 0,
      };
      const sorted = msgs.sort(
        (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
      );
      result.push({
        story,
        messages: sorted,
        lastMessage: sorted[sorted.length - 1],
      });
    }

    // Sort: most recent conversation first
    return result.sort(
      (a, b) =>
        b.lastMessage.timestamp.getTime() - a.lastMessage.timestamp.getTime()
    );
  }, [mergedMessages, searchResults, storyMap]);

  const handleSearch = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!query.trim()) {
        setSearchResults(null);
        return;
      }
      setSearching(true);
      try {
        const results = await searchMessages(query.trim());
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    },
    [query, searchMessages]
  );

  const clearSearch = () => {
    setQuery("");
    setSearchResults(null);
  };

  const handleSelectStory = (storyId: string) => {
    editStory(storyId);
    onClose();
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border-light flex items-center gap-2">
        <button
          onClick={onClose}
          className="p-1 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h3 className="text-sm font-semibold">Historique</h3>
        <span className="text-[11px] text-muted-foreground ml-auto">
          {conversations.length} conversation{conversations.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="px-3 py-2 border-b border-border-light">
        <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2">
          <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher dans les conversations..."
            className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground/60"
          />
          {query && (
            <button
              type="button"
              onClick={clearSearch}
              className="p-0.5 rounded hover:bg-white/60 transition-colors text-muted-foreground"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
        {searchResults !== null && (
          <p className="text-[11px] text-muted-foreground mt-1.5 px-1">
            {searching
              ? "Recherche..."
              : `${searchResults.length} résultat${searchResults.length !== 1 ? "s" : ""} trouvé${searchResults.length !== 1 ? "s" : ""}`}
          </p>
        )}
      </form>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <AnimatePresence initial={false}>
          {conversations.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-12 text-muted-foreground"
            >
              <MessageSquare className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm">
                {searchResults !== null
                  ? "Aucun résultat"
                  : "Aucune conversation"}
              </p>
            </motion.div>
          ) : (
            conversations.map((conv, i) => {
              const isActive = conv.story.id === currentStoryId;
              const preview =
                conv.lastMessage.content.length > 80
                  ? conv.lastMessage.content.slice(0, 80) + "…"
                  : conv.lastMessage.content;

              return (
                <motion.button
                  key={conv.story.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => handleSelectStory(conv.story.id)}
                  className={`w-full text-left px-4 py-3 border-b border-border-light/50 transition-colors ${
                    isActive
                      ? "bg-foreground/5 ring-1 ring-inset ring-foreground/10"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium truncate">
                        {conv.story.title || (
                          <span className="italic text-muted-foreground">Conversation en cours…</span>
                        )}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                        {preview}
                      </p>
                    </div>
                    <div className="flex-shrink-0 flex flex-col items-end gap-1">
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        {conv.messages.length} msg
                      </span>
                      {conv.story.status && (
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                            conv.story.status === "ready"
                              ? "bg-emerald-100 text-emerald-700"
                              : conv.story.status === "refining"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {conv.story.status}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.button>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
