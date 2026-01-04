-- Create feature_requests table
CREATE TABLE public.feature_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Other',
  priority TEXT NOT NULL DEFAULT 'Nice to have',
  screenshot_url TEXT,
  status TEXT NOT NULL DEFAULT 'Submitted',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create issue_reports table
CREATE TABLE public.issue_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  ticket_number TEXT NOT NULL,
  title TEXT NOT NULL,
  what_happened TEXT NOT NULL,
  what_trying_to_do TEXT NOT NULL,
  page_section TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'Minor annoyance',
  browser_info TEXT,
  device_info TEXT,
  screenshot_url TEXT,
  status TEXT NOT NULL DEFAULT 'Submitted',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.feature_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issue_reports ENABLE ROW LEVEL SECURITY;

-- RLS policies for feature_requests
CREATE POLICY "Users can view their own feature requests" 
ON public.feature_requests 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own feature requests" 
ON public.feature_requests 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own feature requests" 
ON public.feature_requests 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own feature requests" 
ON public.feature_requests 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS policies for issue_reports
CREATE POLICY "Users can view their own issue reports" 
ON public.issue_reports 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own issue reports" 
ON public.issue_reports 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own issue reports" 
ON public.issue_reports 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own issue reports" 
ON public.issue_reports 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_support_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for timestamp updates
CREATE TRIGGER update_feature_requests_updated_at
BEFORE UPDATE ON public.feature_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_support_updated_at();

CREATE TRIGGER update_issue_reports_updated_at
BEFORE UPDATE ON public.issue_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_support_updated_at();

-- Create function to generate ticket numbers
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.ticket_number = 'ISS-' || LPAD(nextval('public.issue_ticket_seq')::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create sequence for ticket numbers
CREATE SEQUENCE public.issue_ticket_seq START 1;

-- Create trigger to auto-generate ticket numbers
CREATE TRIGGER generate_issue_ticket_number
BEFORE INSERT ON public.issue_reports
FOR EACH ROW
EXECUTE FUNCTION public.generate_ticket_number();