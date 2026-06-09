-- Migration 001: Core org tables, triggers, and RLS

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 1) orgs
CREATE TABLE IF NOT EXISTS public.orgs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  gst_number text,
  primary_contact_name text,
  primary_contact_phone text,
  primary_contact_email text,
  plan_tier text NOT NULL DEFAULT 'starter',
  onboarding_step int NOT NULL DEFAULT 1,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT orgs_plan_tier_check CHECK (plan_tier IN ('starter', 'growth', 'enterprise')),
  CONSTRAINT orgs_onboarding_step_check CHECK (onboarding_step BETWEEN 1 AND 10)
);

ALTER TABLE public.orgs ENABLE ROW LEVEL SECURITY;

CREATE POLICY org_isolation_select ON public.orgs
  FOR SELECT
  USING (
    id = (SELECT (auth.jwt() ->> 'org_id')::uuid)
  );

CREATE POLICY org_isolation_insert ON public.orgs
  FOR INSERT
  WITH CHECK (
    id = (SELECT (auth.jwt() ->> 'org_id')::uuid)
  );

CREATE POLICY org_isolation_update ON public.orgs
  FOR UPDATE
  USING (
    id = (SELECT (auth.jwt() ->> 'org_id')::uuid)
  );

CREATE TRIGGER set_orgs_updated_at
BEFORE UPDATE ON public.orgs
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- 2) org_locations
CREATE TABLE IF NOT EXISTS public.org_locations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  name text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.org_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY org_isolation_select ON public.org_locations
  FOR SELECT
  USING (
    org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid)
  );

CREATE POLICY org_isolation_insert ON public.org_locations
  FOR INSERT
  WITH CHECK (
    org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid)
  );

CREATE POLICY org_isolation_update ON public.org_locations
  FOR UPDATE
  USING (
    org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid)
  );

-- 3) org_theme
CREATE TABLE IF NOT EXISTS public.org_theme (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL UNIQUE REFERENCES public.orgs(id) ON DELETE CASCADE,
  logo_url text,
  primary_color text DEFAULT '#2563EB',
  font_choice text DEFAULT 'system',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.org_theme ENABLE ROW LEVEL SECURITY;

CREATE POLICY org_isolation_select ON public.org_theme
  FOR SELECT
  USING (
    org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid)
  );

CREATE POLICY org_isolation_insert ON public.org_theme
  FOR INSERT
  WITH CHECK (
    org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid)
  );

CREATE POLICY org_isolation_update ON public.org_theme
  FOR UPDATE
  USING (
    org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid)
  );

CREATE TRIGGER set_org_theme_updated_at
BEFORE UPDATE ON public.org_theme
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- 4) org_config
CREATE TABLE IF NOT EXISTS public.org_config (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  key text NOT NULL,
  value text NOT NULL,
  UNIQUE (org_id, key)
);

ALTER TABLE public.org_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY org_isolation_select ON public.org_config
  FOR SELECT
  USING (
    org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid)
  );

CREATE POLICY org_isolation_insert ON public.org_config
  FOR INSERT
  WITH CHECK (
    org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid)
  );

CREATE POLICY org_isolation_update ON public.org_config
  FOR UPDATE
  USING (
    org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid)
  );

-- 5) org_charges
CREATE TABLE IF NOT EXISTS public.org_charges (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  charge_key text NOT NULL,
  label text NOT NULL,
  amount numeric(12,2) NOT NULL,
  UNIQUE (org_id, charge_key)
);

ALTER TABLE public.org_charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY org_isolation_select ON public.org_charges
  FOR SELECT
  USING (
    org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid)
  );

CREATE POLICY org_isolation_insert ON public.org_charges
  FOR INSERT
  WITH CHECK (
    org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid)
  );

CREATE POLICY org_isolation_update ON public.org_charges
  FOR UPDATE
  USING (
    org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid)
  );

-- 6) modules (platform-level)
CREATE TABLE IF NOT EXISTS public.modules (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  key text UNIQUE NOT NULL,
  label text NOT NULL,
  description text,
  base_price numeric(10,2),
  is_addon boolean DEFAULT false
);

ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY authenticated_select_modules ON public.modules
  FOR SELECT
  TO authenticated
  USING (true);

-- 7) org_modules
CREATE TABLE IF NOT EXISTS public.org_modules (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  module_key text NOT NULL REFERENCES public.modules(key),
  enabled boolean DEFAULT true,
  purchased_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  UNIQUE (org_id, module_key)
);

ALTER TABLE public.org_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY org_isolation_select ON public.org_modules
  FOR SELECT
  USING (
    org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid)
  );

CREATE POLICY org_isolation_insert ON public.org_modules
  FOR INSERT
  WITH CHECK (
    org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid)
  );

CREATE POLICY org_isolation_update ON public.org_modules
  FOR UPDATE
  USING (
    org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid)
  );
