-- Create flash_sales table for Flash Sale Wizard
CREATE TABLE public.flash_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  
  -- Sale info
  name TEXT NOT NULL,
  product_name TEXT,
  product_id UUID REFERENCES public.user_products(id) ON DELETE SET NULL,
  original_price NUMERIC(10,2),
  sale_price NUMERIC(10,2),
  discount_type TEXT DEFAULT 'percentage', -- percentage, fixed
  discount_value NUMERIC(10,2),
  
  -- Timing
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  timezone TEXT DEFAULT 'America/New_York',
  
  -- Urgency strategy
  urgency_type TEXT, -- countdown, limited-quantity, early-bird, flash-bonus
  limited_quantity INTEGER,
  early_bird_hours INTEGER,
  early_bird_bonus TEXT,
  flash_bonus TEXT,
  flash_bonus_deadline TIMESTAMPTZ,
  
  -- Target audience
  target_audience TEXT,
  pain_points JSONB DEFAULT '[]',
  why_now TEXT,
  
  -- Email sequence config
  email_sequence_type TEXT DEFAULT 'standard', -- standard, aggressive, minimal
  emails_planned JSONB DEFAULT '[]', -- array of {type, send_time, subject}
  
  -- Copy elements
  headline TEXT,
  subheadline TEXT,
  urgency_hook TEXT,
  bullets JSONB DEFAULT '[]',
  
  -- Promotion
  promotion_platforms TEXT[],
  promotion_schedule JSONB DEFAULT '[]',
  
  -- Status
  status TEXT DEFAULT 'draft', -- draft, scheduled, active, completed
  total_revenue NUMERIC(10,2) DEFAULT 0,
  total_sales INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.flash_sales ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own flash sales"
  ON public.flash_sales FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own flash sales"
  ON public.flash_sales FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own flash sales"
  ON public.flash_sales FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own flash sales"
  ON public.flash_sales FOR DELETE
  USING (auth.uid() = user_id);

-- Updated at trigger
CREATE TRIGGER update_flash_sales_updated_at
  BEFORE UPDATE ON public.flash_sales
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();