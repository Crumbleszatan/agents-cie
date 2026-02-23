"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useCallback } from "react";

export interface DBProject {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  website_url: string | null;
  git_provider: string | null;
  git_repo_url: string | null;
  git_default_branch: string | null;
  atlassian_project_key: string | null;
  atlassian_base_url: string | null;
  front_office_url: string | null;
  back_office_url: string | null;
  brand_context: any;
  created_at: string;
  updated_at: string;
}

export function useProjects(organizationId: string | null) {
  const [projects, setProjects] = useState<DBProject[]>([]);
  const [currentProject, setCurrentProject] = useState<DBProject | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  // Load projects for org
  useEffect(() => {
    if (!organizationId) return;

    const loadProjects = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("projects")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });

      if (data) {
        setProjects(data);
        if (data.length > 0 && !currentProject) {
          setCurrentProject(data[0]);
        }
      }
      setLoading(false);
    };

    loadProjects();
  }, [organizationId, supabase, currentProject]);

  const createProject = useCallback(
    async (project: Partial<DBProject> & { name: string }) => {
      if (!organizationId) return null;

      const { data, error } = await supabase
        .from("projects")
        .insert({
          ...project,
          organization_id: organizationId,
        })
        .select()
        .single();

      if (data) {
        setProjects((prev) => [data, ...prev]);
        setCurrentProject(data);
      }

      return { data, error };
    },
    [organizationId, supabase]
  );

  const updateProject = useCallback(
    async (id: string, updates: Partial<DBProject>) => {
      const { data, error } = await supabase
        .from("projects")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (data) {
        setProjects((prev) =>
          prev.map((p) => (p.id === id ? data : p))
        );
        if (currentProject?.id === id) {
          setCurrentProject(data);
        }
      }

      return { data, error };
    },
    [supabase, currentProject]
  );

  const deleteProject = useCallback(
    async (id: string) => {
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", id);

      if (!error) {
        setProjects((prev) => prev.filter((p) => p.id !== id));
        if (currentProject?.id === id) {
          setCurrentProject(null);
        }
      }

      return { error };
    },
    [supabase, currentProject]
  );

  return {
    projects,
    currentProject,
    setCurrentProject,
    loading,
    createProject,
    updateProject,
    deleteProject,
  };
}
