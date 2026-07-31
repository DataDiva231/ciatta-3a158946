-- Reset device-scoped rows; identity is now the authenticated account.
DELETE FROM public.subjects;

ALTER TABLE public.subjects DROP COLUMN device_key;
ALTER TABLE public.subjects ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.subjects ADD CONSTRAINT subjects_user_id_key UNIQUE (user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.subjects TO authenticated;
GRANT ALL ON public.subjects TO service_role;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own subject" ON public.subjects
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users create own subject" ON public.subjects
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own subject" ON public.subjects
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users delete own subject" ON public.subjects
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.owns_subject(_subject_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subjects s
    WHERE s.id = _subject_id AND s.user_id = auth.uid()
  )
$$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['observations','memories','beliefs','understanding_snapshots','relationship_events']
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "Users read own %1$s" ON public.%1$I FOR SELECT TO authenticated USING (public.owns_subject(subject_id))', t);
    EXECUTE format('CREATE POLICY "Users insert own %1$s" ON public.%1$I FOR INSERT TO authenticated WITH CHECK (public.owns_subject(subject_id))', t);
    EXECUTE format('CREATE POLICY "Users update own %1$s" ON public.%1$I FOR UPDATE TO authenticated USING (public.owns_subject(subject_id)) WITH CHECK (public.owns_subject(subject_id))', t);
    EXECUTE format('CREATE POLICY "Users delete own %1$s" ON public.%1$I FOR DELETE TO authenticated USING (public.owns_subject(subject_id))', t);
  END LOOP;
END $$;