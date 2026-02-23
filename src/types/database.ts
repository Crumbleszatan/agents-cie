export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          logo_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          logo_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          logo_url?: string | null;
          updated_at?: string;
        };
      };
      organization_members: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: "admin" | "member" | "viewer";
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          role?: "admin" | "member" | "viewer";
          created_at?: string;
        };
        Update: {
          role?: "admin" | "member" | "viewer";
        };
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          updated_at?: string;
        };
      };
      projects: {
        Row: {
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
          brand_context: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          description?: string | null;
          website_url?: string | null;
          git_provider?: string | null;
          git_repo_url?: string | null;
          git_default_branch?: string | null;
          atlassian_project_key?: string | null;
          atlassian_base_url?: string | null;
          front_office_url?: string | null;
          back_office_url?: string | null;
          brand_context?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          website_url?: string | null;
          git_provider?: string | null;
          git_repo_url?: string | null;
          git_default_branch?: string | null;
          atlassian_project_key?: string | null;
          atlassian_base_url?: string | null;
          front_office_url?: string | null;
          back_office_url?: string | null;
          brand_context?: Json | null;
          updated_at?: string;
        };
      };
      user_stories: {
        Row: {
          id: string;
          project_id: string;
          title: string;
          as_a: string;
          i_want: string;
          so_that: string;
          acceptance_criteria: Json;
          subtasks: Json;
          story_points: number | null;
          priority: string;
          labels: Json;
          affected_pages: Json;
          affected_services: Json;
          definition_of_done: Json;
          status: string;
          effort: number;
          impact: number;
          matrix_position: Json | null;
          production_mode: string;
          production_status: string;
          release_id: string | null;
          start_date: string | null;
          end_date: string | null;
          lines_of_code: number;
          jira_key: string | null;
          git_branch: string | null;
          completion_percent: number;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          title: string;
          as_a?: string;
          i_want?: string;
          so_that?: string;
          acceptance_criteria?: Json;
          subtasks?: Json;
          story_points?: number | null;
          priority?: string;
          labels?: Json;
          affected_pages?: Json;
          affected_services?: Json;
          definition_of_done?: Json;
          status?: string;
          effort?: number;
          impact?: number;
          matrix_position?: Json | null;
          production_mode?: string;
          production_status?: string;
          release_id?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          lines_of_code?: number;
          jira_key?: string | null;
          git_branch?: string | null;
          completion_percent?: number;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          as_a?: string;
          i_want?: string;
          so_that?: string;
          acceptance_criteria?: Json;
          subtasks?: Json;
          story_points?: number | null;
          priority?: string;
          labels?: Json;
          affected_pages?: Json;
          affected_services?: Json;
          definition_of_done?: Json;
          status?: string;
          effort?: number;
          impact?: number;
          matrix_position?: Json | null;
          production_mode?: string;
          production_status?: string;
          release_id?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          lines_of_code?: number;
          jira_key?: string | null;
          git_branch?: string | null;
          completion_percent?: number;
          updated_at?: string;
        };
      };
      capsules: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          status: string;
          deadline: string | null;
          total_effort: number;
          total_lines_of_code: number;
          completion_percent: number;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          name: string;
          status?: string;
          deadline?: string | null;
          total_effort?: number;
          total_lines_of_code?: number;
          completion_percent?: number;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          status?: string;
          deadline?: string | null;
          total_effort?: number;
          total_lines_of_code?: number;
          completion_percent?: number;
          updated_at?: string;
        };
      };
      releases: {
        Row: {
          id: string;
          capsule_id: string;
          name: string;
          planned_date: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          capsule_id: string;
          name: string;
          planned_date: string;
          status?: string;
          created_at?: string;
        };
        Update: {
          name?: string;
          planned_date?: string;
          status?: string;
        };
      };
      chat_messages: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          role: string;
          content: string;
          message_type: string;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          role: string;
          content: string;
          message_type?: string;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          content?: string;
          metadata?: Json | null;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
