-- Create content_items table
CREATE TABLE public.content_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  type text NOT NULL CHECK (type IN ('Email', 'IG Post', 'Reel', 'Carousel', 'Story', 'YouTube', 'Podcast', 'Blog', 'Live', 'Ad', 'Landing Page', 'Other')),
  status text NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Ready', 'Published')),
  channel text CHECK (channel IN ('Email', 'Instagram', 'Facebook', 'YouTube', 'Podcast', 'Blog', 'Twitter', 'LinkedIn', 'TikTok', 'Other')),
  topic text,
  tags text[] DEFAULT '{}',
  body text,
  hook text,
  cta text,
  offer text,
  subject_line text,
  preview_text text,
  published_at timestamptz,
  link_url text,
  notes text,
  cycle_id uuid REFERENCES public.cycles_90_day(cycle_id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create content_send_log table
CREATE TABLE public.content_send_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  content_item_id uuid REFERENCES public.content_items(id) ON DELETE SET NULL,
  channel text NOT NULL CHECK (channel IN ('Email', 'Instagram', 'Facebook', 'YouTube', 'Podcast', 'Blog', 'Twitter', 'LinkedIn', 'TikTok', 'Other')),
  type text NOT NULL CHECK (type IN ('Email', 'IG Post', 'Reel', 'Carousel', 'Story', 'YouTube', 'Podcast', 'Blog', 'Live', 'Ad', 'Landing Page', 'Other')),
  topic text,
  sent_at timestamptz NOT NULL DEFAULT now(),
  cycle_id uuid REFERENCES public.cycles_90_day(cycle_id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_content_items_tags ON public.content_items USING GIN(tags);
CREATE INDEX idx_content_items_user_type_status ON public.content_items(user_id, type, status);
CREATE INDEX idx_content_items_published_at ON public.content_items(user_id, published_at);
CREATE INDEX idx_content_send_log_user_sent ON public.content_send_log(user_id, sent_at);
CREATE INDEX idx_content_send_log_cycle ON public.content_send_log(user_id, cycle_id);

-- Enable RLS
ALTER TABLE public.content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_send_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for content_items
CREATE POLICY "Users can view their own content items"
  ON public.content_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own content items"
  ON public.content_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own content items"
  ON public.content_items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own content items"
  ON public.content_items FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for content_send_log
CREATE POLICY "Users can view their own send logs"
  ON public.content_send_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own send logs"
  ON public.content_send_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own send logs"
  ON public.content_send_log FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own send logs"
  ON public.content_send_log FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at on content_items
CREATE TRIGGER update_content_items_updated_at
  BEFORE UPDATE ON public.content_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();