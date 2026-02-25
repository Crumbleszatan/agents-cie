-- ============================================================
-- Agen.cy — Auto-increment story number per project
-- Migration: 20260225010000_story_number
-- ============================================================

-- Add story_number column (auto-increment per project)
ALTER TABLE public.user_stories
  ADD COLUMN IF NOT EXISTS story_number integer;

-- Function to auto-assign next story number within project
CREATE OR REPLACE FUNCTION public.assign_story_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.story_number IS NULL THEN
    SELECT COALESCE(MAX(story_number), 0) + 1
    INTO NEW.story_number
    FROM public.user_stories
    WHERE project_id = NEW.project_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger: auto-assign on insert
CREATE TRIGGER trg_assign_story_number
  BEFORE INSERT ON public.user_stories
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_story_number();

-- Backfill existing stories with sequential numbers
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY created_at) AS rn
  FROM public.user_stories
  WHERE story_number IS NULL
)
UPDATE public.user_stories
SET story_number = numbered.rn
FROM numbered
WHERE public.user_stories.id = numbered.id;
