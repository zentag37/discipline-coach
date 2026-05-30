-- Trades
CREATE TABLE public.trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instrument text,
  direction text,
  entry_price numeric,
  exit_price numeric,
  result_dollars numeric,
  risk_dollars numeric,
  emotion text,
  notes text,
  session text,
  journal_entry text,
  ace_note text,
  trade_date date NOT NULL DEFAULT CURRENT_DATE,
  trade_time time NOT NULL DEFAULT CURRENT_TIME,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.trades TO authenticated;
GRANT ALL ON public.trades TO service_role;

ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own trades" ON public.trades
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own trades" ON public.trades
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own trades" ON public.trades
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own trades" ON public.trades
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_trades_user_date ON public.trades(user_id, trade_date DESC);

-- Journal reviews
CREATE TABLE public.journal_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start date,
  week_end date,
  total_trades integer,
  wins integer,
  losses integer,
  win_rate numeric,
  avg_rr numeric,
  net_pnl numeric,
  ace_review text,
  focus_next_week text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.journal_reviews TO authenticated;
GRANT ALL ON public.journal_reviews TO service_role;

ALTER TABLE public.journal_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own reviews" ON public.journal_reviews
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own reviews" ON public.journal_reviews
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Sessions
CREATE TABLE public.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  session_type text,
  trades_taken integer NOT NULL DEFAULT 0,
  daily_pnl numeric NOT NULL DEFAULT 0,
  limit_hit boolean NOT NULL DEFAULT false,
  checklist_done boolean NOT NULL DEFAULT false,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sessions TO authenticated;
GRANT ALL ON public.sessions TO service_role;

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own sessions" ON public.sessions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own sessions" ON public.sessions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own sessions" ON public.sessions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);