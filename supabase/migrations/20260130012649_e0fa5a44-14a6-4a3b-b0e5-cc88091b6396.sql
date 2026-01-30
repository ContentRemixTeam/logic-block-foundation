-- Create table for customizable daily page layouts
CREATE TABLE public.daily_page_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  layout_name TEXT NOT NULL DEFAULT 'default',
  section_order JSONB NOT NULL DEFAULT '["habits_tracker", "identity_anchor", "brain_dump", "one_thing", "top_3_priorities", "daily_mindset", "weekly_priorities", "monthly_focus", "cycle_snapshot", "goal_rewrite", "calendar_agenda", "info_cards", "posting_slot", "nurture_checkin", "quick_log", "completed_today", "end_of_day_reflection", "deep_mode"]'::jsonb,
  hidden_sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  custom_questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, layout_name)
);

-- Enable Row Level Security
ALTER TABLE public.daily_page_layouts ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own layouts
CREATE POLICY "Users can select own layouts"
ON public.daily_page_layouts
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own layouts"
ON public.daily_page_layouts
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own layouts"
ON public.daily_page_layouts
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own layouts"
ON public.daily_page_layouts
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create index for performance on user lookups
CREATE INDEX idx_daily_page_layouts_user_active ON public.daily_page_layouts(user_id, is_active);

-- Trigger for updated_at
CREATE TRIGGER update_daily_page_layouts_updated_at
BEFORE UPDATE ON public.daily_page_layouts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();