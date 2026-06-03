CREATE TABLE public.download_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL CHECK (platform IN ('mac','windows')),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_agent text,
  referrer text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.download_events TO anon, authenticated;
GRANT SELECT ON public.download_events TO authenticated;
GRANT ALL ON public.download_events TO service_role;

ALTER TABLE public.download_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert download events"
  ON public.download_events FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can read download events"
  ON public.download_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_download_events_created_at ON public.download_events (created_at DESC);
CREATE INDEX idx_download_events_platform ON public.download_events (platform);