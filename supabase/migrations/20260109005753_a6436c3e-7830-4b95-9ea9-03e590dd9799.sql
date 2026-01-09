-- Create error_logs table to capture application errors
CREATE TABLE public.error_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  error_type text NOT NULL,
  error_message text NOT NULL,
  error_stack text,
  component text,
  route text,
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_error_logs_created_at ON public.error_logs(created_at DESC);
CREATE INDEX idx_error_logs_user_id ON public.error_logs(user_id);
CREATE INDEX idx_error_logs_error_type ON public.error_logs(error_type);

-- Enable RLS
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Allow any authenticated user to insert error logs (for their own errors)
CREATE POLICY "Users can insert their own error logs"
ON public.error_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Only admins can read all error logs (we'll create an admin check)
-- For now, allow users to see their own error logs
CREATE POLICY "Users can view their own error logs"
ON public.error_logs
FOR SELECT
USING (auth.uid() = user_id);

-- Create admin_users table to track who has admin access
CREATE TABLE public.admin_users (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Only admins can read the admin_users table
CREATE POLICY "Admins can view admin_users"
ON public.admin_users
FOR SELECT
USING (auth.uid() IN (SELECT user_id FROM public.admin_users));

-- Only admins can insert new admins
CREATE POLICY "Admins can insert admin_users"
ON public.admin_users
FOR INSERT
WITH CHECK (auth.uid() IN (SELECT user_id FROM public.admin_users));

-- Only admins can delete admins
CREATE POLICY "Admins can delete admin_users"
ON public.admin_users
FOR DELETE
USING (auth.uid() IN (SELECT user_id FROM public.admin_users));

-- Allow admins to view all error logs
CREATE POLICY "Admins can view all error logs"
ON public.error_logs
FOR SELECT
USING (auth.uid() IN (SELECT user_id FROM public.admin_users));

-- Allow admins to view all issue_reports
CREATE POLICY "Admins can view all issue_reports"
ON public.issue_reports
FOR SELECT
USING (auth.uid() IN (SELECT user_id FROM public.admin_users));

-- Allow admins to view all feature_requests
CREATE POLICY "Admins can view all feature_requests"
ON public.feature_requests
FOR SELECT
USING (auth.uid() IN (SELECT user_id FROM public.admin_users));