
-- Offers table
CREATE TABLE IF NOT EXISTS public.offers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  offer_type TEXT,
  price NUMERIC,
  currency TEXT DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'active',
  color TEXT,
  url TEXT,
  launch_id UUID,
  project_id UUID,
  revenue_goal NUMERIC,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own offers" ON public.offers
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own offers" ON public.offers
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own offers" ON public.offers
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own offers" ON public.offers
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER offers_updated_at
  BEFORE UPDATE ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_offers_user ON public.offers(user_id);
CREATE INDEX IF NOT EXISTS idx_offers_launch ON public.offers(launch_id);

-- Content purpose tag
ALTER TABLE public.content_items
  ADD COLUMN IF NOT EXISTS purpose TEXT;

CREATE INDEX IF NOT EXISTS idx_content_items_purpose ON public.content_items(purpose);
