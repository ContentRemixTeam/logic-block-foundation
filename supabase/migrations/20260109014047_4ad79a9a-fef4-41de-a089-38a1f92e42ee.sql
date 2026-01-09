-- Create user_profiles table with trial support
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  user_type TEXT NOT NULL DEFAULT 'guest' CHECK (user_type IN ('guest', 'member', 'admin')),
  workshop_date DATE,
  trial_started_at TIMESTAMPTZ,
  trial_expires_at TIMESTAMPTZ,
  upgraded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own profile"
ON public.user_profiles
FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.user_profiles
FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
ON public.user_profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

-- Index for trial expiration queries
CREATE INDEX idx_trial_expiration ON public.user_profiles(trial_expires_at) 
WHERE user_type = 'guest';

-- Trigger for updated_at
CREATE TRIGGER update_user_profiles_updated_at
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  trial_end TIMESTAMPTZ;
BEGIN
  -- Calculate 3-day trial expiration
  trial_end := now() + interval '3 days';
  
  INSERT INTO public.user_profiles (
    id, 
    email, 
    user_type,
    workshop_date,
    trial_started_at,
    trial_expires_at
  )
  VALUES (
    new.id, 
    new.email,
    COALESCE(new.raw_user_meta_data->>'user_type', 'guest'),
    (new.raw_user_meta_data->>'workshop_date')::DATE,
    now(),
    trial_end
  );
  RETURN new;
END;
$$;

-- Trigger for new user signups
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();