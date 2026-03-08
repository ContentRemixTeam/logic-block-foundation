
-- 1. Add content_preview column for fast list loads (first 200 chars)
ALTER TABLE public.journal_pages ADD COLUMN IF NOT EXISTS content_preview TEXT GENERATED ALWAYS AS (
  CASE WHEN length(content) > 200 THEN substring(content, 1, 200) || '…' ELSE content END
) STORED;

-- 2. Add content_length column for UI display
ALTER TABLE public.journal_pages ADD COLUMN IF NOT EXISTS content_length INTEGER GENERATED ALWAYS AS (length(content)) STORED;

-- 3. Index for faster list queries (user + archived + updated)
CREATE INDEX IF NOT EXISTS idx_journal_pages_list ON public.journal_pages (user_id, is_archived, updated_at DESC);

-- 4. Index for brain dump queries  
CREATE INDEX IF NOT EXISTS idx_journal_pages_braindump ON public.journal_pages (user_id, is_archived, created_at DESC);

-- 5. Index on ideas for brain dump
CREATE INDEX IF NOT EXISTS idx_ideas_braindump ON public.ideas (user_id, created_at DESC) WHERE deleted_at IS NULL;

-- 6. Auto-archive function: marks notes older than 6 months as archived
CREATE OR REPLACE FUNCTION public.auto_archive_old_notes()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  archived_count INTEGER;
BEGIN
  UPDATE public.journal_pages
  SET is_archived = true
  WHERE is_archived = false
    AND updated_at < now() - interval '6 months'
    AND content_length < 100;
  
  GET DIAGNOSTICS archived_count = ROW_COUNT;
  RETURN archived_count;
END;
$$;
