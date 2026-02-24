"use client";

import { useEffect, useRef, useCallback } from "react";
import { useStore } from "@/store/useStore";
import { useStories } from "@/hooks/useStories";

/**
 * StorySyncProvider — Renderless bridge between useStories (Supabase) and Zustand store.
 *
 * 1. On project load: fetches stories from DB → pushes into Zustand store
 * 2. Exposes create/update/delete callbacks so Zustand mutations also persist to DB
 * 3. Real-time updates from Supabase flow through useStories → synced to store
 */
export function StorySyncProvider() {
  const currentProjectId = useStore((s) => s.currentProjectId);
  const setPersistCallbacks = useStore((s) => s.setPersistCallbacks);
  const setStoriesFromDb = useStore((s) => s.setStoriesFromDb);

  const {
    stories: dbStories,
    loading,
    createStory,
    updateStory,
    deleteStory,
  } = useStories(currentProjectId);

  // Track whether we already synced for this project to avoid overwriting user edits
  const lastSyncedProjectId = useRef<string | null>(null);
  const prevDbStoriesRef = useRef(dbStories);

  // Sync DB stories → Zustand store
  useEffect(() => {
    if (loading) return;

    // Full replace on first load for this project
    if (currentProjectId !== lastSyncedProjectId.current) {
      setStoriesFromDb(dbStories);
      lastSyncedProjectId.current = currentProjectId;
      prevDbStoriesRef.current = dbStories;
      return;
    }

    // Incremental sync: real-time updates from Supabase
    const prevStories = prevDbStoriesRef.current;
    if (dbStories !== prevStories) {
      const storeStories = useStore.getState().stories;

      // Detect new stories (from realtime INSERT, e.g. another user)
      const storeIds = new Set(storeStories.map((s) => s.id));
      const newStories = dbStories.filter((s) => !storeIds.has(s.id));

      // Detect updates (from realtime UPDATE)
      const updatedStories = dbStories.filter((dbS) => {
        const storeS = storeStories.find((s) => s.id === dbS.id);
        if (!storeS) return false;
        // Simple check: compare JSON to detect changes
        const prevDbS = prevStories.find((s) => s.id === dbS.id);
        return prevDbS && JSON.stringify(prevDbS) !== JSON.stringify(dbS);
      });

      // Detect deletions (from realtime DELETE)
      const dbIds = new Set(dbStories.map((s) => s.id));
      const deletedIds = storeStories
        .filter((s) => !dbIds.has(s.id))
        // Only consider it a realtime deletion if it existed in the prev snapshot
        .filter((s) => prevStories.some((ps) => ps.id === s.id))
        .map((s) => s.id);

      if (newStories.length > 0 || updatedStories.length > 0 || deletedIds.length > 0) {
        let updated = [...storeStories];

        // Add new
        for (const ns of newStories) {
          updated.push(ns);
        }

        // Update existing
        for (const us of updatedStories) {
          updated = updated.map((s) => (s.id === us.id ? us : s));
        }

        // Remove deleted
        if (deletedIds.length > 0) {
          const deletedSet = new Set(deletedIds);
          updated = updated.filter((s) => !deletedSet.has(s.id));
        }

        setStoriesFromDb(updated);
      }

      prevDbStoriesRef.current = dbStories;
    }
  }, [dbStories, loading, currentProjectId, setStoriesFromDb]);

  // Wrap callbacks to match store interface
  const wrappedCreate = useCallback(
    async (story: Parameters<typeof createStory>[0] & { id?: string }) => {
      return createStory(story);
    },
    [createStory]
  );

  const wrappedDelete = useCallback(
    async (id: string) => {
      await deleteStory(id);
    },
    [deleteStory]
  );

  // Expose persistence callbacks to the store
  useEffect(() => {
    if (currentProjectId) {
      setPersistCallbacks({
        create: wrappedCreate,
        update: updateStory,
        delete: wrappedDelete,
      });
    }

    return () => {
      setPersistCallbacks(null);
    };
  }, [currentProjectId, wrappedCreate, updateStory, wrappedDelete, setPersistCallbacks]);

  return null; // Renderless provider
}
