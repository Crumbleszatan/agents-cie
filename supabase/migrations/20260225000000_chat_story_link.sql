-- ────────────────────────────────────────────────────────────
-- Chat messages: link to user stories + search index
-- ────────────────────────────────────────────────────────────

-- Add story_id (nullable: messages may exist before story is saved)
ALTER TABLE public.chat_messages
  ADD COLUMN story_id uuid REFERENCES public.user_stories(id) ON DELETE SET NULL;

-- Persist UI state for interactive options
ALTER TABLE public.chat_messages
  ADD COLUMN options_answered boolean DEFAULT false;

-- Index for per-story message retrieval
CREATE INDEX idx_chat_story ON public.chat_messages(story_id, created_at);

-- Full-text search index (French config)
CREATE INDEX idx_chat_content_search ON public.chat_messages
  USING gin(to_tsvector('french', content));

-- UPDATE policy (missing from initial migration — needed for backfilling story_id)
CREATE POLICY "Org members can update own messages"
  ON public.chat_messages FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
