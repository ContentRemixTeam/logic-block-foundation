-- Add share_to_community column to weekly_reviews
ALTER TABLE public.weekly_reviews 
ADD COLUMN share_to_community boolean DEFAULT false;

-- Create a policy to allow anyone to read shared reviews
CREATE POLICY "Anyone can view shared reviews" 
ON public.weekly_reviews 
FOR SELECT 
USING (share_to_community = true OR auth.uid() = user_id);