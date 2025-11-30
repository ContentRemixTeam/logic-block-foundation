-- Create mindset_categories table
CREATE TABLE public.mindset_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#10B8C7',
  created_at timestamp with time zone DEFAULT now()
);

-- Create useful_thoughts table
CREATE TABLE public.useful_thoughts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text text NOT NULL,
  category_id uuid REFERENCES public.mindset_categories(id) ON DELETE SET NULL,
  is_favorite boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mindset_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.useful_thoughts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mindset_categories
CREATE POLICY "Users can view their own categories"
  ON public.mindset_categories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own categories"
  ON public.mindset_categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories"
  ON public.mindset_categories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories"
  ON public.mindset_categories FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for useful_thoughts
CREATE POLICY "Users can view their own thoughts"
  ON public.useful_thoughts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own thoughts"
  ON public.useful_thoughts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own thoughts"
  ON public.useful_thoughts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own thoughts"
  ON public.useful_thoughts FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_mindset_categories_user_id ON public.mindset_categories(user_id);
CREATE INDEX idx_useful_thoughts_user_id ON public.useful_thoughts(user_id);
CREATE INDEX idx_useful_thoughts_category_id ON public.useful_thoughts(category_id);
CREATE INDEX idx_useful_thoughts_is_favorite ON public.useful_thoughts(user_id, is_favorite);