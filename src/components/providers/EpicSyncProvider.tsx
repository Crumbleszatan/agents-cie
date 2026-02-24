"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/store/useStore";
import { useEpics } from "@/hooks/useEpics";

/**
 * EpicSyncProvider — Renderless bridge between useEpics (Supabase) and Zustand store.
 *
 * 1. Loads all project epics from Supabase
 * 2. Pushes them into Zustand store
 * 3. Exposes create/update/delete callbacks so Zustand mutations persist to DB
 */
export function EpicSyncProvider() {
  const currentProjectId = useStore((s) => s.currentProjectId);
  const setEpicsFromDb = useStore((s) => s.setEpicsFromDb);
  const setEpicPersistCallbacks = useStore((s) => s.setEpicPersistCallbacks);

  const {
    epics: dbEpics,
    loading,
    createEpic,
    updateEpic,
    deleteEpic,
  } = useEpics(currentProjectId);

  const lastSyncedProjectId = useRef<string | null>(null);
  const dbEpicsRef = useRef(dbEpics);

  // Sync DB epics → Zustand
  useEffect(() => {
    if (loading) return;

    const needsSync =
      currentProjectId !== lastSyncedProjectId.current ||
      dbEpics !== dbEpicsRef.current;

    if (needsSync) {
      setEpicsFromDb(dbEpics);
      lastSyncedProjectId.current = currentProjectId;
      dbEpicsRef.current = dbEpics;
    }
  }, [dbEpics, loading, currentProjectId, setEpicsFromDb]);

  // Expose persistence callbacks to the store
  useEffect(() => {
    if (currentProjectId) {
      setEpicPersistCallbacks({
        create: createEpic,
        update: updateEpic,
        delete_: deleteEpic,
      });
    }

    return () => {
      setEpicPersistCallbacks(null);
    };
  }, [currentProjectId, createEpic, updateEpic, deleteEpic, setEpicPersistCallbacks]);

  return null; // Renderless provider
}
