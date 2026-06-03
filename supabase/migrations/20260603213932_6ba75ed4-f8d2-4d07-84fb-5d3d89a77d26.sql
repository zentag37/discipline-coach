DROP POLICY IF EXISTS "Anyone can insert download events" ON public.download_events;

CREATE POLICY "Anon can insert anonymous download events"
ON public.download_events
FOR INSERT
TO anon
WITH CHECK (user_id IS NULL);

CREATE POLICY "Authenticated can insert own download events"
ON public.download_events
FOR INSERT
TO authenticated
WITH CHECK (user_id IS NULL OR user_id = auth.uid());