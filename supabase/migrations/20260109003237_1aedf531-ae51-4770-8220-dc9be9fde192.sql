-- Add cycle_id to projects table (nullable for backward compatibility)
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS cycle_id uuid REFERENCES public.cycles_90_day(cycle_id) ON DELETE SET NULL;

-- Add cycle_id to habits table (nullable for backward compatibility)
ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS cycle_id uuid REFERENCES public.cycles_90_day(cycle_id) ON DELETE SET NULL;

-- Add new fields to cycles_90_day for audience & message clarity
ALTER TABLE public.cycles_90_day 
ADD COLUMN IF NOT EXISTS biggest_bottleneck text,
ADD COLUMN IF NOT EXISTS audience_target text,
ADD COLUMN IF NOT EXISTS audience_frustration text,
ADD COLUMN IF NOT EXISTS signature_message text;

-- Create cycle_strategy table for 3-part strategy
CREATE TABLE IF NOT EXISTS public.cycle_strategy (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cycle_id uuid NOT NULL REFERENCES public.cycles_90_day(cycle_id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  -- Lead Gen (blue)
  lead_primary_platform text,
  lead_content_type text,
  lead_frequency text,
  lead_committed_90_days boolean DEFAULT false,
  -- Nurture (pink)
  nurture_method text,
  nurture_frequency text,
  free_transformation text,
  proof_methods jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(cycle_id)
);

-- Create cycle_offers table for repeatable offers
CREATE TABLE IF NOT EXISTS public.cycle_offers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cycle_id uuid NOT NULL REFERENCES public.cycles_90_day(cycle_id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  offer_name text NOT NULL,
  price numeric,
  sales_frequency text,
  transformation text,
  sort_order integer DEFAULT 0,
  is_primary boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create cycle_revenue_plan table
CREATE TABLE IF NOT EXISTS public.cycle_revenue_plan (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cycle_id uuid NOT NULL REFERENCES public.cycles_90_day(cycle_id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  revenue_goal numeric,
  price_per_sale numeric,
  sales_needed numeric,
  launch_schedule text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(cycle_id)
);

-- Create cycle_month_plans table for 3 months breakdown
CREATE TABLE IF NOT EXISTS public.cycle_month_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cycle_id uuid NOT NULL REFERENCES public.cycles_90_day(cycle_id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  month_number integer NOT NULL CHECK (month_number BETWEEN 1 AND 3),
  month_name text,
  projects_text text,
  sales_promos_text text,
  main_focus text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(cycle_id, month_number)
);

-- Enable RLS on new tables
ALTER TABLE public.cycle_strategy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cycle_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cycle_revenue_plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cycle_month_plans ENABLE ROW LEVEL SECURITY;

-- RLS policies for cycle_strategy
CREATE POLICY "Users can view their own cycle strategy" ON public.cycle_strategy FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own cycle strategy" ON public.cycle_strategy FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own cycle strategy" ON public.cycle_strategy FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own cycle strategy" ON public.cycle_strategy FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for cycle_offers
CREATE POLICY "Users can view their own cycle offers" ON public.cycle_offers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own cycle offers" ON public.cycle_offers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own cycle offers" ON public.cycle_offers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own cycle offers" ON public.cycle_offers FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for cycle_revenue_plan
CREATE POLICY "Users can view their own revenue plan" ON public.cycle_revenue_plan FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own revenue plan" ON public.cycle_revenue_plan FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own revenue plan" ON public.cycle_revenue_plan FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own revenue plan" ON public.cycle_revenue_plan FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for cycle_month_plans
CREATE POLICY "Users can view their own month plans" ON public.cycle_month_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own month plans" ON public.cycle_month_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own month plans" ON public.cycle_month_plans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own month plans" ON public.cycle_month_plans FOR DELETE USING (auth.uid() = user_id);

-- Add updated_at triggers
CREATE TRIGGER update_cycle_strategy_updated_at BEFORE UPDATE ON public.cycle_strategy FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_cycle_offers_updated_at BEFORE UPDATE ON public.cycle_offers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_cycle_revenue_plan_updated_at BEFORE UPDATE ON public.cycle_revenue_plan FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_cycle_month_plans_updated_at BEFORE UPDATE ON public.cycle_month_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_projects_cycle_id ON public.projects(cycle_id);
CREATE INDEX IF NOT EXISTS idx_habits_cycle_id ON public.habits(cycle_id);
CREATE INDEX IF NOT EXISTS idx_cycle_strategy_cycle_id ON public.cycle_strategy(cycle_id);
CREATE INDEX IF NOT EXISTS idx_cycle_offers_cycle_id ON public.cycle_offers(cycle_id);
CREATE INDEX IF NOT EXISTS idx_cycle_revenue_plan_cycle_id ON public.cycle_revenue_plan(cycle_id);
CREATE INDEX IF NOT EXISTS idx_cycle_month_plans_cycle_id ON public.cycle_month_plans(cycle_id);