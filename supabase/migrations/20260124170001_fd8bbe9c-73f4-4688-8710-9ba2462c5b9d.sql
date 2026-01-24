-- Add cycle_id column to link transactions to 90-day cycles
ALTER TABLE public.financial_transactions 
ADD COLUMN IF NOT EXISTS cycle_id UUID REFERENCES public.cycles_90_day(cycle_id) ON DELETE SET NULL;

-- Add index for efficient cycle-based queries
CREATE INDEX IF NOT EXISTS idx_financial_transactions_cycle 
ON public.financial_transactions(cycle_id) 
WHERE cycle_id IS NOT NULL;