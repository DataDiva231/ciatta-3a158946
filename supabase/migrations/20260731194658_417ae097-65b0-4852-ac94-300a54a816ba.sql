CREATE TABLE public.subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_key text NOT NULL UNIQUE,
  user_id uuid,
  identity jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.subjects TO service_role;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL,
  category text NOT NULL,
  value text NOT NULL,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence numeric NOT NULL DEFAULT 0.6,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX observations_subject_time_idx ON public.observations (subject_id, occurred_at DESC);
GRANT ALL ON public.observations TO service_role;
ALTER TABLE public.observations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  kind text NOT NULL,
  key text NOT NULL,
  summary text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurrences integer NOT NULL DEFAULT 1,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subject_id, kind, key)
);
GRANT ALL ON public.memories TO service_role;
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.beliefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  key text NOT NULL,
  domain text NOT NULL,
  statement text NOT NULL,
  strength numeric NOT NULL DEFAULT 0.2,
  support integer NOT NULL DEFAULT 0,
  contradiction integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'forming',
  first_formed_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subject_id, key)
);
GRANT ALL ON public.beliefs TO service_role;
ALTER TABLE public.beliefs ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.understanding_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  depth numeric NOT NULL DEFAULT 0,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX understanding_subject_time_idx ON public.understanding_snapshots (subject_id, created_at DESC);
GRANT ALL ON public.understanding_snapshots TO service_role;
ALTER TABLE public.understanding_snapshots ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.relationship_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  kind text NOT NULL,
  label text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX relationship_subject_time_idx ON public.relationship_events (subject_id, occurred_at DESC);
GRANT ALL ON public.relationship_events TO service_role;
ALTER TABLE public.relationship_events ENABLE ROW LEVEL SECURITY;