DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['observations','memories','beliefs','understanding_snapshots','relationship_events']
  LOOP
    EXECUTE format('DROP POLICY "Users read own %1$s" ON public.%1$I', t);
    EXECUTE format('DROP POLICY "Users insert own %1$s" ON public.%1$I', t);
    EXECUTE format('DROP POLICY "Users update own %1$s" ON public.%1$I', t);
    EXECUTE format('DROP POLICY "Users delete own %1$s" ON public.%1$I', t);
    EXECUTE format('CREATE POLICY "Users read own %1$s" ON public.%1$I FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.subjects s WHERE s.id = subject_id AND s.user_id = auth.uid()))', t);
    EXECUTE format('CREATE POLICY "Users insert own %1$s" ON public.%1$I FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.subjects s WHERE s.id = subject_id AND s.user_id = auth.uid()))', t);
    EXECUTE format('CREATE POLICY "Users update own %1$s" ON public.%1$I FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.subjects s WHERE s.id = subject_id AND s.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.subjects s WHERE s.id = subject_id AND s.user_id = auth.uid()))', t);
    EXECUTE format('CREATE POLICY "Users delete own %1$s" ON public.%1$I FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.subjects s WHERE s.id = subject_id AND s.user_id = auth.uid()))', t);
  END LOOP;
END $$;

DROP FUNCTION IF EXISTS public.owns_subject(uuid);