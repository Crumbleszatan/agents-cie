"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "./useAuth";
import type { ChatMessage } from "@/types";

// DB row → ChatMessage
function dbToMessage(row: any): ChatMessage {
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    timestamp: new Date(row.created_at),
    type: row.message_type || "text",
    storyId: row.story_id || undefined,
    metadata: row.metadata || undefined,
    optionsAnswered: row.options_answered || false,
  };
}

// ChatMessage → DB insert format
function messageToDb(msg: ChatMessage, projectId: string, userId: string) {
  return {
    id: msg.id,
    project_id: projectId,
    user_id: userId,
    role: msg.role,
    content: msg.content,
    message_type: msg.type,
    story_id: msg.storyId || null,
    metadata: msg.metadata || null,
    options_answered: msg.optionsAnswered || false,
    created_at: msg.timestamp.toISOString(),
  };
}

export function useMessages(projectId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  // Load all messages for this project
  useEffect(() => {
    if (!projectId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    const loadMessages = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true });

      if (data) {
        setMessages(data.map(dbToMessage));
      }
      setLoading(false);
    };

    loadMessages();

    // Realtime subscription
    const channel = supabase
      .channel(`chat-${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_messages",
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setMessages((prev) => {
              // Avoid duplicates (we already added client-side)
              if (prev.some((m) => m.id === payload.new.id)) return prev;
              return [...prev, dbToMessage(payload.new)];
            });
          } else if (payload.eventType === "UPDATE") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === payload.new.id ? dbToMessage(payload.new) : m
              )
            );
          } else if (payload.eventType === "DELETE") {
            setMessages((prev) =>
              prev.filter((m) => m.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, supabase]);

  // Create a message
  const createMessage = useCallback(
    async (msg: ChatMessage) => {
      if (!projectId || !user) return null;

      const { data, error } = await supabase
        .from("chat_messages")
        .insert(messageToDb(msg, projectId, user.id))
        .select()
        .single();

      if (error) console.error("Error creating message:", error);
      return data ? dbToMessage(data) : null;
    },
    [projectId, user, supabase]
  );

  // Update a message (partial)
  const updateMessage = useCallback(
    async (id: string, updates: Partial<ChatMessage>) => {
      const dbUpdates: any = {};
      if (updates.optionsAnswered !== undefined)
        dbUpdates.options_answered = updates.optionsAnswered;
      if (updates.storyId !== undefined)
        dbUpdates.story_id = updates.storyId;
      if (updates.content !== undefined) dbUpdates.content = updates.content;

      const { error } = await supabase
        .from("chat_messages")
        .update(dbUpdates)
        .eq("id", id);

      if (error) console.error("Error updating message:", error);
    },
    [supabase]
  );

  // Bulk update story_id (backfill after story save)
  const linkMessagesToStory = useCallback(
    async (clientStoryId: string, dbStoryId: string) => {
      if (clientStoryId === dbStoryId) return;
      const { error } = await supabase
        .from("chat_messages")
        .update({ story_id: dbStoryId })
        .eq("story_id", clientStoryId);

      if (error) console.error("Error linking messages to story:", error);
    },
    [supabase]
  );

  // Full-text search across all project messages
  const searchMessages = useCallback(
    async (query: string): Promise<ChatMessage[]> => {
      if (!projectId || !query.trim()) return [];

      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("project_id", projectId)
        .textSearch("content", query, {
          type: "websearch",
          config: "french",
        })
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error searching messages:", error);
        return [];
      }
      return data ? data.map(dbToMessage) : [];
    },
    [projectId, supabase]
  );

  return {
    allMessages: messages,
    loading,
    createMessage,
    updateMessage,
    linkMessagesToStory,
    searchMessages,
  };
}
