-- MFE/MAE (max favorable/adverse excursion) — computed on demand from candle
-- data by the compute-excursion edge function, cached here since it costs a
-- Yahoo Finance round-trip per trade.
ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS mfe_price NUMERIC(14,4),
  ADD COLUMN IF NOT EXISTS mae_price NUMERIC(14,4),
  ADD COLUMN IF NOT EXISTS excursion_computed_at TIMESTAMPTZ;
