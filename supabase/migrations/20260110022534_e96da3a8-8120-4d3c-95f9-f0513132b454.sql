-- Create table for Limited Time Offers (flash sales, promotions, launches)
CREATE TABLE public.cycle_limited_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES public.cycles_90_day(cycle_id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  offer_id UUID REFERENCES public.cycle_offers(id) ON DELETE SET NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  promo_type TEXT DEFAULT 'flash_sale',
  discount TEXT,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cycle_limited_offers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own limited offers"
  ON public.cycle_limited_offers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own limited offers"
  ON public.cycle_limited_offers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own limited offers"
  ON public.cycle_limited_offers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own limited offers"
  ON public.cycle_limited_offers FOR DELETE
  USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_cycle_limited_offers_updated_at
  BEFORE UPDATE ON public.cycle_limited_offers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();