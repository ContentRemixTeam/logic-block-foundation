-- Create monthly financial goals table used by the financial tracker.
-- The app reads and upserts one goal per user per month.

CREATE TABLE IF NOT EXISTS public.financial_monthly_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  month DATE NOT NULL,
  revenue_goal NUMERIC(12, 2),
  expense_budget NUMERIC(12, 2),
  profit_goal NUMERIC(12, 2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT financial_monthly_goals_user_month_key UNIQUE (user_id, month)
);

CREATE INDEX IF NOT EXISTS idx_financial_monthly_goals_user_month
ON public.financial_monthly_goals(user_id, month DESC);

ALTER TABLE public.financial_monthly_goals ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'financial_monthly_goals'
      AND policyname = 'Users can view their own monthly goals'
  ) THEN
    CREATE POLICY "Users can view their own monthly goals"
    ON public.financial_monthly_goals
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'financial_monthly_goals'
      AND policyname = 'Users can create their own monthly goals'
  ) THEN
    CREATE POLICY "Users can create their own monthly goals"
    ON public.financial_monthly_goals
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'financial_monthly_goals'
      AND policyname = 'Users can update their own monthly goals'
  ) THEN
    CREATE POLICY "Users can update their own monthly goals"
    ON public.financial_monthly_goals
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'financial_monthly_goals'
      AND policyname = 'Users can delete their own monthly goals'
  ) THEN
    CREATE POLICY "Users can delete their own monthly goals"
    ON public.financial_monthly_goals
    FOR DELETE
    USING (auth.uid() = user_id);
  END IF;
END $$;

DROP TRIGGER IF EXISTS update_financial_monthly_goals_updated_at
ON public.financial_monthly_goals;

CREATE TRIGGER update_financial_monthly_goals_updated_at
BEFORE UPDATE ON public.financial_monthly_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
