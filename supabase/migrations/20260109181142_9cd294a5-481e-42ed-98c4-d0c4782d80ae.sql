-- Create nurture_commitments table
CREATE TABLE public.nurture_commitments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  cycle_id UUID REFERENCES public.cycles_90_day(cycle_id) ON DELETE SET NULL,
  commitment_type TEXT NOT NULL DEFAULT 'email',
  cadence TEXT NOT NULL DEFAULT 'weekly',
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  preferred_time_block TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  grace_days INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create nurture_checkins table
CREATE TABLE public.nurture_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  commitment_id UUID REFERENCES public.nurture_commitments(id) ON DELETE CASCADE,
  expected_date DATE NOT NULL,
  checkin_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'missed')),
  coach_response TEXT,
  reschedule_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on nurture_commitments
ALTER TABLE public.nurture_commitments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own nurture commitments"
ON public.nurture_commitments FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own nurture commitments"
ON public.nurture_commitments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own nurture commitments"
ON public.nurture_commitments FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own nurture commitments"
ON public.nurture_commitments FOR DELETE
USING (auth.uid() = user_id);

-- Enable RLS on nurture_checkins
ALTER TABLE public.nurture_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own nurture checkins"
ON public.nurture_checkins FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own nurture checkins"
ON public.nurture_checkins FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own nurture checkins"
ON public.nurture_checkins FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own nurture checkins"
ON public.nurture_checkins FOR DELETE
USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX idx_nurture_commitments_user_enabled ON public.nurture_commitments(user_id, enabled);
CREATE INDEX idx_nurture_checkins_user_status ON public.nurture_checkins(user_id, status, checkin_date);
CREATE INDEX idx_nurture_checkins_commitment ON public.nurture_checkins(commitment_id);

-- Create trigger for updated_at on nurture_commitments
CREATE TRIGGER update_nurture_commitments_updated_at
BEFORE UPDATE ON public.nurture_commitments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updated_at on nurture_checkins
CREATE TRIGGER update_nurture_checkins_updated_at
BEFORE UPDATE ON public.nurture_checkins
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();