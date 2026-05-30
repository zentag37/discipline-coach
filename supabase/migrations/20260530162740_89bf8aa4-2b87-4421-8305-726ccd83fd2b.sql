-- Retype profile numeric columns
ALTER TABLE public.profiles
  ALTER COLUMN risk_per_trade TYPE numeric USING NULLIF(risk_per_trade, '')::numeric,
  ALTER COLUMN daily_loss_limit TYPE numeric USING NULLIF(daily_loss_limit, '')::numeric,
  ALTER COLUMN max_trades TYPE integer USING NULLIF(max_trades, '')::integer;

-- Audit RLS: add missing delete policies (others already exist)
CREATE POLICY "Users delete own profile"
  ON public.profiles FOR DELETE TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users delete own reviews"
  ON public.journal_reviews FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users update own reviews"
  ON public.journal_reviews FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own sessions"
  ON public.sessions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
