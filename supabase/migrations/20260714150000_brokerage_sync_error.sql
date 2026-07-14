ALTER TABLE public.brokerage_accounts
  ADD COLUMN IF NOT EXISTS sync_error TEXT;
