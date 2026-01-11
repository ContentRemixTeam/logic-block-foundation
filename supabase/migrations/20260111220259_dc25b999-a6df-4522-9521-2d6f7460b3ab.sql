-- Create arcade_events table (ledger for all coin/token transactions)
CREATE TABLE public.arcade_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  coins_delta INTEGER DEFAULT 0,
  tokens_delta INTEGER DEFAULT 0,
  task_id UUID REFERENCES public.tasks(task_id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  dedupe_key TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create arcade_wallet table (cached balances)
CREATE TABLE public.arcade_wallet (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  coins_balance INTEGER DEFAULT 0,
  tokens_balance INTEGER DEFAULT 0,
  total_coins_earned INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create arcade_daily_pet table
CREATE TABLE public.arcade_daily_pet (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  pet_type TEXT NOT NULL,
  stage TEXT DEFAULT 'egg',
  tasks_completed_today INTEGER DEFAULT 0,
  hatched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Create arcade_games table (seed data, no user_id)
CREATE TABLE public.arcade_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  difficulty TEXT DEFAULT 'easy',
  token_cost INTEGER DEFAULT 1,
  unlock_rule_json JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create arcade_game_sessions table
CREATE TABLE public.arcade_game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES public.arcade_games(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  score INTEGER
);

-- Create arcade_pomodoro_sessions table
CREATE TABLE public.arcade_pomodoro_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(task_id) ON DELETE SET NULL,
  focus_minutes INTEGER NOT NULL DEFAULT 25,
  break_minutes INTEGER NOT NULL DEFAULT 5,
  status TEXT DEFAULT 'in_progress',
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Add arcade settings to user_settings
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS arcade_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS arcade_reduce_motion BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS arcade_sounds_off BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS pomodoro_focus_minutes INTEGER DEFAULT 25,
ADD COLUMN IF NOT EXISTS pomodoro_break_minutes INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS pomodoro_auto_start_break BOOLEAN DEFAULT false;

-- Enable RLS on all new tables
ALTER TABLE public.arcade_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arcade_wallet ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arcade_daily_pet ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arcade_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arcade_game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arcade_pomodoro_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies for arcade_events
CREATE POLICY "Users can view their own arcade events"
ON public.arcade_events FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own arcade events"
ON public.arcade_events FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- RLS policies for arcade_wallet
CREATE POLICY "Users can view their own wallet"
ON public.arcade_wallet FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wallet"
ON public.arcade_wallet FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallet"
ON public.arcade_wallet FOR UPDATE
USING (auth.uid() = user_id);

-- RLS policies for arcade_daily_pet
CREATE POLICY "Users can view their own pets"
ON public.arcade_daily_pet FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own pets"
ON public.arcade_daily_pet FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pets"
ON public.arcade_daily_pet FOR UPDATE
USING (auth.uid() = user_id);

-- RLS policies for arcade_games (public read)
CREATE POLICY "Anyone can view active games"
ON public.arcade_games FOR SELECT
USING (is_active = true);

-- RLS policies for arcade_game_sessions
CREATE POLICY "Users can view their own game sessions"
ON public.arcade_game_sessions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own game sessions"
ON public.arcade_game_sessions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own game sessions"
ON public.arcade_game_sessions FOR UPDATE
USING (auth.uid() = user_id);

-- RLS policies for arcade_pomodoro_sessions
CREATE POLICY "Users can view their own pomodoro sessions"
ON public.arcade_pomodoro_sessions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own pomodoro sessions"
ON public.arcade_pomodoro_sessions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pomodoro sessions"
ON public.arcade_pomodoro_sessions FOR UPDATE
USING (auth.uid() = user_id);

-- Seed arcade_games with initial games
INSERT INTO public.arcade_games (title, description, difficulty, token_cost, unlock_rule_json) VALUES
('Memory Match', 'Match pairs of cards to test your memory', 'easy', 1, '{}'),
('Focus Challenge', 'Beat the clock productivity challenge', 'medium', 2, '{"min_total_coins": 50}'),
('Pattern Pro', 'Remember and repeat patterns', 'hard', 3, '{"min_total_coins": 100}');