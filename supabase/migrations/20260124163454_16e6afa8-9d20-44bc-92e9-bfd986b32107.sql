-- Add finance recovery wizard to wizard_templates with correct column names
INSERT INTO public.wizard_templates (template_name, display_name, description, icon, estimated_time_minutes, questions)
VALUES (
  'finance-recovery',
  'Money Momentum',
  'Get back on track when you''re behind on your financial goals',
  'TrendingUp',
  15,
  '[]'::jsonb
) ON CONFLICT (template_name) DO NOTHING;