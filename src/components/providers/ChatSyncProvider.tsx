"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/store/useStore";
import { useMessages } from "@/hooks/useMessages";

/**
 * ChatSyncProvider — Renderless bridge between useMessages (Supabase) and Zustand store.
 *
 * 1. Loads all project messages from Supabase
 * 2. Filters by current story ID → pushes into Zustand store
 * 3. Re-filters when story changes (via editStory / startNewStory)
 * 4. Exposes create/update/link callbacks so Zustand mutations persist to DB
 */
export function ChatSyncProvider() {
  const currentProjectId = useStore((s) => s.currentProjectId);
  const currentStoryId = useStore((s) => s.currentStory.id);
  const setChatPersistCallbacks = useStore((s) => s.setChatPersistCallbacks);
  const setMessagesFromDb = useStore((s) => s.setMessagesFromDb);

  const {
    allMessages,
    loading,
    createMessage,
    updateMessage,
    linkMessagesToStory,
  } = useMessages(currentProjectId);

  const lastSyncedProjectId = useRef<string | null>(null);
  const lastSyncedStoryId = useRef<string | null>(null);
  const allMessagesRef = useRef(allMessages);

  // Filter and sync messages for the active story
  useEffect(() => {
    if (loading) return;

    const needsSync =
      currentProjectId !== lastSyncedProjectId.current ||
      currentStoryId !== lastSyncedStoryId.current ||
      allMessages !== allMessagesRef.current;

    if (needsSync) {
      const filtered = allMessages.filter((m) => m.storyId === currentStoryId);
      setMessagesFromDb(filtered);

      lastSyncedProjectId.current = currentProjectId;
      lastSyncedStoryId.current = currentStoryId;
      allMessagesRef.current = allMessages;
    }
  }, [allMessages, loading, currentProjectId, currentStoryId, setMessagesFromDb]);

  // Expose persistence callbacks to the store
  useEffect(() => {
    if (currentProjectId) {
      setChatPersistCallbacks({
        create: createMessage,
        update: updateMessage,
        link: linkMessagesToStory,
      });
    }

    return () => {
      setChatPersistCallbacks(null);
    };
  }, [currentProjectId, createMessage, updateMessage, linkMessagesToStory, setChatPersistCallbacks]);

  return null; // Renderless provider
}
