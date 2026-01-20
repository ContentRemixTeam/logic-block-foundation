-- Add pets_hatched_today to track multiple pets per day
ALTER TABLE arcade_daily_pet 
ADD COLUMN IF NOT EXISTS pets_hatched_today integer DEFAULT 0;

-- Create hatched_pets table to store individual hatched pets with their types
CREATE TABLE IF NOT EXISTS public.hatched_pets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  pet_type text NOT NULL,
  pet_emoji text NOT NULL,
  hatched_at timestamptz DEFAULT now()
);

-- Create task_reflections table for structured feedback
CREATE TABLE IF NOT EXISTS public.task_reflections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  task_text text,
  went_well text,
  could_improve text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.hatched_pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_reflections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for hatched_pets
CREATE POLICY "Users can view own hatched pets" ON public.hatched_pets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own hatched pets" ON public.hatched_pets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for task_reflections
CREATE POLICY "Users can view own reflections" ON public.task_reflections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reflections" ON public.task_reflections
  FOR INSERT WITH CHECK (auth.uid() = user_id);