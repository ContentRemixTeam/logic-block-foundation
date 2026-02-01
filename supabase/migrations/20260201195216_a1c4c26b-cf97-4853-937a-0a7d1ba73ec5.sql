-- Content Planner System Tables

-- 1. Messaging Frameworks - stores user's messaging strategy
CREATE TABLE public.messaging_frameworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Optional associations
  launch_id UUID REFERENCES public.launches(id) ON DELETE CASCADE,
  cycle_id UUID REFERENCES public.cycles_90_day(cycle_id) ON DELETE SET NULL,
  
  -- Core messaging
  name TEXT NOT NULL,
  core_problem TEXT,
  unique_solution TEXT,
  target_customer TEXT,
  core_narrative TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.messaging_frameworks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own frameworks"
ON public.messaging_frameworks FOR ALL
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_messaging_frameworks_updated_at
BEFORE UPDATE ON public.messaging_frameworks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Selling Points - individual selling points linked to messaging framework
CREATE TABLE public.selling_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  framework_id UUID NOT NULL REFERENCES public.messaging_frameworks(id) ON DELETE CASCADE,
  
  label TEXT NOT NULL,
  description TEXT,
  is_core BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  
  -- Performance tracking
  total_uses INTEGER DEFAULT 0,
  conversion_rate DECIMAL,
  best_format TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.selling_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own selling points"
ON public.selling_points FOR ALL
USING (auth.uid() = user_id);

-- 3. Content Plans - main content plan record created by wizard
CREATE TABLE public.content_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Optional associations
  launch_id UUID REFERENCES public.launches(id) ON DELETE CASCADE,
  cycle_id UUID REFERENCES public.cycles_90_day(cycle_id) ON DELETE SET NULL,
  framework_id UUID REFERENCES public.messaging_frameworks(id) ON DELETE SET NULL,
  
  -- Plan details
  name TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('regular', 'launch')),
  start_date DATE,
  end_date DATE,
  
  -- Selected formats (stored as array)
  selected_formats TEXT[] DEFAULT '{}',
  
  -- Batching
  core_content_id UUID REFERENCES public.content_items(id) ON DELETE SET NULL,
  batching_enabled BOOLEAN DEFAULT false,
  
  -- Meta
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.content_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own plans"
ON public.content_plans FOR ALL
USING (auth.uid() = user_id);

CREATE TRIGGER update_content_plans_updated_at
BEFORE UPDATE ON public.content_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Content Plan Items - individual content pieces within a plan
CREATE TABLE public.content_plan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.content_plans(id) ON DELETE CASCADE,
  
  -- Content reference (existing or new)
  content_item_id UUID REFERENCES public.content_items(id) ON DELETE SET NULL,
  
  -- Plan-specific fields
  title TEXT NOT NULL,
  content_type TEXT NOT NULL,
  channel TEXT,
  
  -- Scheduling
  planned_date DATE,
  phase TEXT,
  
  -- Messaging
  selling_point_ids UUID[],
  messaging_angle TEXT,
  
  -- Repurposing
  is_repurposed BOOLEAN DEFAULT false,
  repurposed_from_id UUID REFERENCES public.content_items(id) ON DELETE SET NULL,
  
  -- Status
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'created', 'published')),
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.content_plan_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own plan items"
ON public.content_plan_items FOR ALL
USING (auth.uid() = user_id);

-- 5. Add columns to content_items for vault enhancement
ALTER TABLE public.content_items 
ADD COLUMN IF NOT EXISTS messaging_angle TEXT,
ADD COLUMN IF NOT EXISTS selling_point_ids UUID[],
ADD COLUMN IF NOT EXISTS performance_score DECIMAL,
ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS repurposed_from_id UUID REFERENCES public.content_items(id) ON DELETE SET NULL;

-- Indexes for performance
CREATE INDEX idx_messaging_frameworks_user_id ON public.messaging_frameworks(user_id);
CREATE INDEX idx_messaging_frameworks_launch_id ON public.messaging_frameworks(launch_id);
CREATE INDEX idx_selling_points_framework_id ON public.selling_points(framework_id);
CREATE INDEX idx_content_plans_user_id ON public.content_plans(user_id);
CREATE INDEX idx_content_plans_launch_id ON public.content_plans(launch_id);
CREATE INDEX idx_content_plan_items_plan_id ON public.content_plan_items(plan_id);
CREATE INDEX idx_content_plan_items_planned_date ON public.content_plan_items(planned_date);