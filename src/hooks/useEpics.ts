"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "./useAuth";
import type { Epic } from "@/types";

// Convert DB row → app Epic
function dbToEpic(row: any): Epic {
  return {
    id: row.id,
    title: row.title || "",
    description: row.description || "",
    color: row.color || "#6366f1",
    storyIds: [],
    createdAt: row.created_at || new Date().toISOString(),
  };
}

// Convert app Epic → DB insert/update
function epicToDb(epic: Partial<Epic>, projectId?: string, userId?: string) {
  const result: any = {};
  if (projectId) result.project_id = projectId;
  if (userId) result.created_by = userId;
  if (epic.title !== undefined) result.title = epic.title;
  if (epic.description !== undefined) result.description = epic.description;
  if (epic.color !== undefined) result.color = epic.color;
  return result;
}

export function useEpics(projectId: string | null) {
  const { user } = useAuth();
  const [epics, setEpics] = useState<Epic[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  // Load epics for project
  useEffect(() => {
    if (!projectId) {
      setEpics([]);
      setLoading(false);
      return;
    }

    const loadEpics = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("epics")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true });

      if (data) {
        setEpics(data.map(dbToEpic));
      }
      setLoading(false);
    };

    loadEpics();

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`epics-${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "epics",
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setEpics((prev) => {
              if (prev.some((e) => e.id === payload.new.id)) return prev;
              return [...prev, dbToEpic(payload.new)];
            });
          } else if (payload.eventType === "UPDATE") {
            setEpics((prev) =>
              prev.map((e) => (e.id === payload.new.id ? dbToEpic(payload.new) : e))
            );
          } else if (payload.eventType === "DELETE") {
            setEpics((prev) => prev.filter((e) => e.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, supabase]);

  const createEpic = useCallback(
    async (epic: Partial<Epic>) => {
      if (!projectId || !user) return null;

      const { data, error } = await supabase
        .from("epics")
        .insert(epicToDb(epic, projectId, user.id))
        .select()
        .single();

      if (data) {
        const newEpic = dbToEpic(data);
        setEpics((prev) => [...prev, newEpic]);
        return newEpic;
      }
      if (error) console.error("Error creating epic:", error);
      return null;
    },
    [projectId, user, supabase]
  );

  const updateEpic = useCallback(
    async (id: string, updates: Partial<Epic>) => {
      const { data, error } = await supabase
        .from("epics")
        .update(epicToDb(updates))
        .eq("id", id)
        .select()
        .single();

      if (data) {
        const updated = dbToEpic(data);
        setEpics((prev) => prev.map((e) => (e.id === id ? updated : e)));
        return updated;
      }
      if (error) console.error("Error updating epic:", error);
      return null;
    },
    [supabase]
  );

  const deleteEpic = useCallback(
    async (id: string) => {
      const { error } = await supabase
        .from("epics")
        .delete()
        .eq("id", id);

      if (!error) {
        setEpics((prev) => prev.filter((e) => e.id !== id));
      }
      return { error };
    },
    [supabase]
  );

  return {
    epics,
    loading,
    createEpic,
    updateEpic,
    deleteEpic,
  };
}
