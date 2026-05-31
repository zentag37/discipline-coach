
CREATE TYPE public.feedback_status AS ENUM ('new', 'in_progress', 'resolved', 'archived');
CREATE TYPE public.feedback_category AS ENUM ('bug', 'feature', 'question', 'praise', 'other');

CREATE TABLE public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category public.feedback_category NOT NULL DEFAULT 'other',
  subject text NOT NULL,
  message text NOT NULL,
  status public.feedback_status NOT NULL DEFAULT 'new',
  admin_response text,
  responded_by uuid,
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.feedback TO authenticated;
GRANT ALL ON public.feedback TO service_role;

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own feedback" ON public.feedback
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users view own feedback" ON public.feedback
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all feedback" ON public.feedback
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update feedback" ON public.feedback
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete feedback" ON public.feedback
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER feedback_touch_updated_at
  BEFORE UPDATE ON public.feedback
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_feedback_status_created ON public.feedback(status, created_at DESC);
CREATE INDEX idx_feedback_user ON public.feedback(user_id);
