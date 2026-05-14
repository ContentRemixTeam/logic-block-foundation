CREATE TABLE public.money_moves_sprint_trackers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  track TEXT NOT NULL,
  rung INTEGER NOT NULL DEFAULT 1,
  move_title TEXT,
  move_why TEXT,
  goal TEXT,
  block TEXT,
  actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  proof JSONB NOT NULL DEFAULT '{}'::jsonb,
  community_posts JSONB NOT NULL DEFAULT '{}'::jsonb,
  sale_logged BOOLEAN NOT NULL DEFAULT false,
  result_note TEXT,
  diagnostic_answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.money_moves_sprint_trackers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own money moves trackers"
  ON public.money_moves_sprint_trackers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own money moves trackers"
  ON public.money_moves_sprint_trackers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own money moves trackers"
  ON public.money_moves_sprint_trackers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own money moves trackers"
  ON public.money_moves_sprint_trackers FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_mmst_user ON public.money_moves_sprint_trackers(user_id);

CREATE TRIGGER trg_mmst_updated_at
  BEFORE UPDATE ON public.money_moves_sprint_trackers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();