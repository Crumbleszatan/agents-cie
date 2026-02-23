"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "./useAuth";
import type { UserStory } from "@/types";

// Convert DB row to app UserStory
function dbToStory(row: any): UserStory {
  return {
    id: row.id,
    title: row.title || "",
    asA: row.as_a || "",
    iWant: row.i_want || "",
    soThat: row.so_that || "",
    acceptanceCriteria: row.acceptance_criteria || [],
    subtasks: row.subtasks || [],
    storyPoints: row.story_points,
    priority: row.priority || "medium",
    labels: row.labels || [],
    affectedPages: row.affected_pages || [],
    affectedServices: row.affected_services || [],
    definitionOfDone: row.definition_of_done || [],
    status: row.status || "draft",
    effort: row.effort || 0,
    impact: row.impact || 0,
    matrixPosition: row.matrix_position || undefined,
    productionMode: row.production_mode || "engineer-ai",
    productionStatus: row.production_status || "backlog",
    release: row.release_id,
    startDate: row.start_date,
    endDate: row.end_date,
    linesOfCode: row.lines_of_code || 0,
    jiraKey: row.jira_key,
    gitBranch: row.git_branch,
    completionPercent: row.completion_percent || 0,
  };
}

// Convert app UserStory to DB insert/update format
function storyToDb(story: Partial<UserStory>, projectId?: string, userId?: string) {
  const result: any = {};
  if (projectId) result.project_id = projectId;
  if (userId) result.created_by = userId;
  if (story.title !== undefined) result.title = story.title;
  if (story.asA !== undefined) result.as_a = story.asA;
  if (story.iWant !== undefined) result.i_want = story.iWant;
  if (story.soThat !== undefined) result.so_that = story.soThat;
  if (story.acceptanceCriteria !== undefined) result.acceptance_criteria = story.acceptanceCriteria;
  if (story.subtasks !== undefined) result.subtasks = story.subtasks;
  if (story.storyPoints !== undefined) result.story_points = story.storyPoints;
  if (story.priority !== undefined) result.priority = story.priority;
  if (story.labels !== undefined) result.labels = story.labels;
  if (story.affectedPages !== undefined) result.affected_pages = story.affectedPages;
  if (story.affectedServices !== undefined) result.affected_services = story.affectedServices;
  if (story.definitionOfDone !== undefined) result.definition_of_done = story.definitionOfDone;
  if (story.status !== undefined) result.status = story.status;
  if (story.effort !== undefined) result.effort = story.effort;
  if (story.impact !== undefined) result.impact = story.impact;
  if (story.matrixPosition !== undefined) result.matrix_position = story.matrixPosition;
  if (story.productionMode !== undefined) result.production_mode = story.productionMode;
  if (story.productionStatus !== undefined) result.production_status = story.productionStatus;
  if (story.linesOfCode !== undefined) result.lines_of_code = story.linesOfCode;
  if (story.jiraKey !== undefined) result.jira_key = story.jiraKey;
  if (story.gitBranch !== undefined) result.git_branch = story.gitBranch;
  if (story.completionPercent !== undefined) result.completion_percent = story.completionPercent;
  return result;
}

export function useStories(projectId: string | null) {
  const { user } = useAuth();
  const [stories, setStories] = useState<UserStory[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  // Load stories for project
  useEffect(() => {
    if (!projectId) {
      setStories([]);
      setLoading(false);
      return;
    }

    const loadStories = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("user_stories")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true });

      if (data) {
        setStories(data.map(dbToStory));
      }
      setLoading(false);
    };

    loadStories();

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`stories-${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_stories",
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setStories((prev) => [...prev, dbToStory(payload.new)]);
          } else if (payload.eventType === "UPDATE") {
            setStories((prev) =>
              prev.map((s) => (s.id === payload.new.id ? dbToStory(payload.new) : s))
            );
          } else if (payload.eventType === "DELETE") {
            setStories((prev) => prev.filter((s) => s.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, supabase]);

  const createStory = useCallback(
    async (story: Partial<UserStory>) => {
      if (!projectId || !user) return null;

      const { data, error } = await supabase
        .from("user_stories")
        .insert(storyToDb(story, projectId, user.id))
        .select()
        .single();

      if (data) {
        const newStory = dbToStory(data);
        setStories((prev) => [...prev, newStory]);
        return newStory;
      }
      if (error) console.error("Error creating story:", error);
      return null;
    },
    [projectId, user, supabase]
  );

  const updateStory = useCallback(
    async (id: string, updates: Partial<UserStory>) => {
      const { data, error } = await supabase
        .from("user_stories")
        .update(storyToDb(updates))
        .eq("id", id)
        .select()
        .single();

      if (data) {
        const updated = dbToStory(data);
        setStories((prev) =>
          prev.map((s) => (s.id === id ? updated : s))
        );
        return updated;
      }
      if (error) console.error("Error updating story:", error);
      return null;
    },
    [supabase]
  );

  const deleteStory = useCallback(
    async (id: string) => {
      const { error } = await supabase
        .from("user_stories")
        .delete()
        .eq("id", id);

      if (!error) {
        setStories((prev) => prev.filter((s) => s.id !== id));
      }
      return { error };
    },
    [supabase]
  );

  return {
    stories,
    loading,
    createStory,
    updateStory,
    deleteStory,
  };
}
