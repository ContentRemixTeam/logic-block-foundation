
CREATE TABLE IF NOT EXISTS public.quarter_debriefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quarter_key TEXT NOT NULL,
  quarter_label TEXT NOT NULL,
  quarter_start_date DATE,
  quarter_end_date DATE,
  what_worked JSONB NOT NULL DEFAULT '[]'::jsonb,
  what_did_not_work JSONB NOT NULL DEFAULT '[]'::jsonb,
  lessons_learned JSONB NOT NULL DEFAULT '[]'::jsonb,
  carry_forward JSONB NOT NULL DEFAULT '[]'::jsonb,
  leave_behind JSONB NOT NULL DEFAULT '[]'::jsonb,
  business_sections JSONB NOT NULL DEFAULT '{}'::jsonb,
  next_quarter_focus TEXT,
  support_needed TEXT,
  cycle_score INTEGER CHECK (cycle_score BETWEEN 0 AND 10),
  wants_next_quarter_plan BOOLEAN,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, quarter_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quarter_debriefs TO authenticated;
GRANT ALL ON public.quarter_debriefs TO service_role;

ALTER TABLE public.quarter_debriefs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='quarter_debriefs' AND policyname='Users can view their own quarter debriefs') THEN
    CREATE POLICY "Users can view their own quarter debriefs" ON public.quarter_debriefs FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='quarter_debriefs' AND policyname='Users can create their own quarter debriefs') THEN
    CREATE POLICY "Users can create their own quarter debriefs" ON public.quarter_debriefs FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='quarter_debriefs' AND policyname='Users can update their own quarter debriefs') THEN
    CREATE POLICY "Users can update their own quarter debriefs" ON public.quarter_debriefs FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='quarter_debriefs' AND policyname='Users can delete their own quarter debriefs') THEN
    CREATE POLICY "Users can delete their own quarter debriefs" ON public.quarter_debriefs FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_quarter_debriefs_user_created ON public.quarter_debriefs(user_id, created_at DESC);

DROP TRIGGER IF EXISTS update_quarter_debriefs_updated_at ON public.quarter_debriefs;
CREATE TRIGGER update_quarter_debriefs_updated_at
BEFORE UPDATE ON public.quarter_debriefs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
