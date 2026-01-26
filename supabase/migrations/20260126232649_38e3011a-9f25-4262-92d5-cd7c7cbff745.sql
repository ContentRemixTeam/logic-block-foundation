-- Create sales_log table for tracking sales entries
CREATE TABLE public.sales_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  cycle_id UUID REFERENCES public.cycles_90_day(cycle_id) ON DELETE SET NULL,
  date DATE NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  client_name TEXT,
  offer_name TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create wins table for tracking achievements
CREATE TABLE public.wins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  cycle_id UUID NOT NULL REFERENCES public.cycles_90_day(cycle_id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  win_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.sales_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wins ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sales_log
CREATE POLICY "Users can view their own sales"
  ON public.sales_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sales"
  ON public.sales_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sales"
  ON public.sales_log FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sales"
  ON public.sales_log FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for wins
CREATE POLICY "Users can view their own wins"
  ON public.wins FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wins"
  ON public.wins FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wins"
  ON public.wins FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own wins"
  ON public.wins FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_sales_log_user_cycle ON public.sales_log(user_id, cycle_id);
CREATE INDEX idx_sales_log_date ON public.sales_log(user_id, date);
CREATE INDEX idx_wins_user_cycle ON public.wins(user_id, cycle_id);