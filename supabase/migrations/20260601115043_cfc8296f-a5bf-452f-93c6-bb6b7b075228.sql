CREATE TABLE IF NOT EXISTS public.signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  instrument text NOT NULL,
  direction text NOT NULL,
  entry_price numeric,
  stop_loss numeric,
  target1 numeric,
  target2 numeric,
  confidence integer,
  reasons text[],
  timeframe text DEFAULT '1H',
  rr numeric,
  rsi numeric,
  status text NOT NULL DEFAULT 'active',
  followed boolean NOT NULL DEFAULT false,
  outcome text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.signals TO authenticated;
GRANT ALL ON public.signals TO service_role;

ALTER TABLE public.signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own signals" ON public.signals
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own signals" ON public.signals
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own signals" ON public.signals
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own signals" ON public.signals
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all signals" ON public.signals
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_signals_user_created ON public.signals(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_signals_user_active ON public.signals(user_id, status) WHERE status = 'active';