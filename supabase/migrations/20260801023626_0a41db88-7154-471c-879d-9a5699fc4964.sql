-- Apple Health (and future source) consent records
CREATE TABLE public.health_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  provider text NOT NULL,
  metrics text[] NOT NULL DEFAULT '{}',
  connected_at timestamptz,
  disconnected_at timestamptz,
  last_import_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subject_id, provider)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.health_connections TO authenticated;
GRANT ALL ON public.health_connections TO service_role;

ALTER TABLE public.health_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own health connections" ON public.health_connections
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.subjects s WHERE s.id = health_connections.subject_id AND s.user_id = auth.uid()));
CREATE POLICY "Users insert own health connections" ON public.health_connections
  FOR INSERT TO authenticated WITH CHECK (EXISTS (
    SELECT 1 FROM public.subjects s WHERE s.id = health_connections.subject_id AND s.user_id = auth.uid()));
CREATE POLICY "Users update own health connections" ON public.health_connections
  FOR UPDATE TO authenticated USING (EXISTS (
    SELECT 1 FROM public.subjects s WHERE s.id = health_connections.subject_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.subjects s WHERE s.id = health_connections.subject_id AND s.user_id = auth.uid()));
CREATE POLICY "Users delete own health connections" ON public.health_connections
  FOR DELETE TO authenticated USING (EXISTS (
    SELECT 1 FROM public.subjects s WHERE s.id = health_connections.subject_id AND s.user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_health_connections_updated_at
  BEFORE UPDATE ON public.health_connections
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Append-only, tamper-evident internal audit log
CREATE TABLE public.audit_events (
  id bigserial PRIMARY KEY,
  user_id uuid,
  event_type text NOT NULL,
  outcome text NOT NULL DEFAULT 'success',
  session_id text,
  ip_address text,
  user_agent text,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  prev_hash text,
  record_hash text NOT NULL
);

CREATE INDEX audit_events_user_idx ON public.audit_events (user_id, occurred_at DESC);

-- Internal only: never exposed to the app or its users.
GRANT ALL ON public.audit_events TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.audit_events_id_seq TO service_role;

ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- Append-only: no updates or deletes, ever, for any role.
CREATE OR REPLACE FUNCTION public.audit_events_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'audit_events is append-only';
END;
$$;

CREATE TRIGGER audit_events_no_update BEFORE UPDATE ON public.audit_events
  FOR EACH ROW EXECUTE FUNCTION public.audit_events_immutable();
CREATE TRIGGER audit_events_no_delete BEFORE DELETE ON public.audit_events
  FOR EACH ROW EXECUTE FUNCTION public.audit_events_immutable();

-- Chains each record to the previous one so gaps or edits are detectable.
CREATE OR REPLACE FUNCTION public.audit_events_chain()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  last_hash text;
BEGIN
  SELECT record_hash INTO last_hash FROM public.audit_events ORDER BY id DESC LIMIT 1;
  NEW.prev_hash := last_hash;
  NEW.record_hash := encode(sha256(convert_to(
    coalesce(last_hash, '') || '|' ||
    coalesce(NEW.user_id::text, '') || '|' ||
    NEW.event_type || '|' || NEW.outcome || '|' ||
    coalesce(NEW.session_id, '') || '|' ||
    coalesce(NEW.ip_address, '') || '|' ||
    NEW.detail::text || '|' ||
    NEW.occurred_at::text, 'UTF8')), 'hex');
  RETURN NEW;
END;
$$;

CREATE TRIGGER audit_events_chain_before_insert BEFORE INSERT ON public.audit_events
  FOR EACH ROW EXECUTE FUNCTION public.audit_events_chain();

-- Per-user / per-IP request accounting for write-heavy endpoints
CREATE TABLE public.rate_limit_counters (
  bucket_key text NOT NULL,
  window_start timestamptz NOT NULL,
  hits integer NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket_key, window_start)
);

GRANT ALL ON public.rate_limit_counters TO service_role;
ALTER TABLE public.rate_limit_counters ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.consume_rate_limit(
  _bucket_key text,
  _window_seconds integer,
  _limit integer
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  win timestamptz := to_timestamp(floor(extract(epoch FROM now()) / _window_seconds) * _window_seconds);
  current_hits integer;
BEGIN
  INSERT INTO public.rate_limit_counters (bucket_key, window_start, hits)
  VALUES (_bucket_key, win, 1)
  ON CONFLICT (bucket_key, window_start)
  DO UPDATE SET hits = public.rate_limit_counters.hits + 1
  RETURNING hits INTO current_hits;

  DELETE FROM public.rate_limit_counters
  WHERE window_start < now() - interval '1 day';

  RETURN current_hits <= _limit;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_rate_limit(text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_rate_limit(text, integer, integer) TO service_role;