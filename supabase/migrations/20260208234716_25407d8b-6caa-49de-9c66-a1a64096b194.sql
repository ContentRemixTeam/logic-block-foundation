-- Create content_pillars table (reusable across wizards)
CREATE TABLE public.content_pillars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#6366f1',
  emoji TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create content_challenges table
CREATE TABLE public.content_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  platforms TEXT[] NOT NULL DEFAULT '{}',
  promotion_context JSONB DEFAULT '{}',
  pillar_ids UUID[] DEFAULT '{}',
  ideal_customer TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  completion_rate NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('draft', 'active', 'completed', 'abandoned')),
  CONSTRAINT valid_dates CHECK (end_date > start_date)
);

-- Create content_challenge_days table
CREATE TABLE public.content_challenge_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES public.content_challenges(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  date DATE NOT NULL,
  platform TEXT NOT NULL,
  pillar_id UUID REFERENCES public.content_pillars(id) ON DELETE SET NULL,
  title TEXT,
  hook TEXT,
  content_idea TEXT,
  full_copy TEXT,
  content_item_id UUID REFERENCES public.content_items(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'planned',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_day_number CHECK (day_number BETWEEN 1 AND 30),
  CONSTRAINT valid_day_status CHECK (status IN ('planned', 'drafted', 'finalized', 'published', 'skipped')),
  UNIQUE (challenge_id, day_number, platform)
);

-- Enable RLS on all tables
ALTER TABLE public.content_pillars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_challenge_days ENABLE ROW LEVEL SECURITY;

-- RLS policies for content_pillars
CREATE POLICY "Users can view own pillars"
  ON public.content_pillars FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own pillars"
  ON public.content_pillars FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pillars"
  ON public.content_pillars FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own pillars"
  ON public.content_pillars FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for content_challenges
CREATE POLICY "Users can view own challenges"
  ON public.content_challenges FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own challenges"
  ON public.content_challenges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own challenges"
  ON public.content_challenges FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own challenges"
  ON public.content_challenges FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for content_challenge_days
CREATE POLICY "Users can view own challenge days"
  ON public.content_challenge_days FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own challenge days"
  ON public.content_challenge_days FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own challenge days"
  ON public.content_challenge_days FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own challenge days"
  ON public.content_challenge_days FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_content_pillars_user_id ON public.content_pillars(user_id);
CREATE INDEX idx_content_challenges_user_id ON public.content_challenges(user_id);
CREATE INDEX idx_content_challenges_status ON public.content_challenges(status);
CREATE INDEX idx_content_challenge_days_challenge_id ON public.content_challenge_days(challenge_id);
CREATE INDEX idx_content_challenge_days_date ON public.content_challenge_days(date);

-- Triggers for updated_at
CREATE TRIGGER update_content_pillars_updated_at
  BEFORE UPDATE ON public.content_pillars
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_content_challenges_updated_at
  BEFORE UPDATE ON public.content_challenges
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_content_challenge_days_updated_at
  BEFORE UPDATE ON public.content_challenge_days
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();