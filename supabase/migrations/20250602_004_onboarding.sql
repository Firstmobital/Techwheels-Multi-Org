-- Migration 004: Onboarding wizard schema and seeds

ALTER TABLE public.orgs
  ADD COLUMN IF NOT EXISTS onboarding_complete boolean NOT NULL DEFAULT false;

-- Platform role templates
CREATE TABLE IF NOT EXISTS public.org_role_templates (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  key text UNIQUE NOT NULL,
  label text NOT NULL,
  description text
);

ALTER TABLE public.org_role_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY authenticated_select_org_role_templates ON public.org_role_templates
  FOR SELECT
  TO authenticated
  USING (true);

CREATE TABLE IF NOT EXISTS public.org_role_template_roles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_key text NOT NULL REFERENCES public.org_role_templates(key) ON DELETE CASCADE,
  role_name text NOT NULL,
  is_default boolean NOT NULL DEFAULT false
);

ALTER TABLE public.org_role_template_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY authenticated_select_org_role_template_roles ON public.org_role_template_roles
  FOR SELECT
  TO authenticated
  USING (true);

-- Pending employee invites
CREATE TABLE IF NOT EXISTS public.employee_invites (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  email text NOT NULL,
  role_id uuid REFERENCES public.org_roles(id) ON DELETE SET NULL,
  location_ids uuid[] DEFAULT '{}',
  token text UNIQUE NOT NULL,
  invited_by uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  accepted_at timestamptz,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.employee_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY org_isolation_select ON public.employee_invites
  FOR SELECT
  USING (
    org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid)
  );

CREATE POLICY org_isolation_insert ON public.employee_invites
  FOR INSERT
  WITH CHECK (
    org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid)
  );

CREATE POLICY org_isolation_update ON public.employee_invites
  FOR UPDATE
  USING (
    org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid)
  );

-- Platform vehicle catalogue
CREATE TABLE IF NOT EXISTS public.vehicles_master (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  make text NOT NULL,
  model text NOT NULL,
  variant text NOT NULL,
  fuel_type text NOT NULL,
  transmission text NOT NULL,
  colour_code text,
  colour_name text
);

ALTER TABLE public.vehicles_master ENABLE ROW LEVEL SECURITY;

CREATE POLICY authenticated_select_vehicles_master ON public.vehicles_master
  FOR SELECT
  TO authenticated
  USING (true);

CREATE TABLE IF NOT EXISTS public.org_variants (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  master_variant_id uuid NOT NULL REFERENCES public.vehicles_master(id) ON DELETE CASCADE,
  display_name text,
  ndp numeric(12,2),
  esp numeric(12,2),
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE (org_id, master_variant_id)
);

ALTER TABLE public.org_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY org_isolation_select ON public.org_variants
  FOR SELECT
  USING (
    org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid)
  );

CREATE POLICY org_isolation_insert ON public.org_variants
  FOR INSERT
  WITH CHECK (
    org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid)
  );

CREATE POLICY org_isolation_update ON public.org_variants
  FOR UPDATE
  USING (
    org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid)
  );

-- Pricing configuration tables
CREATE TABLE IF NOT EXISTS public.org_accessories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  name text NOT NULL,
  price numeric(12,2) NOT NULL DEFAULT 0,
  part_number text,
  is_active boolean NOT NULL DEFAULT true
);

ALTER TABLE public.org_accessories ENABLE ROW LEVEL SECURITY;

CREATE POLICY org_isolation_select ON public.org_accessories
  FOR SELECT
  USING (
    org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid)
  );

CREATE POLICY org_isolation_insert ON public.org_accessories
  FOR INSERT
  WITH CHECK (
    org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid)
  );

CREATE POLICY org_isolation_update ON public.org_accessories
  FOR UPDATE
  USING (
    org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid)
  );

CREATE TABLE IF NOT EXISTS public.org_schemes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  name text NOT NULL,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  applicable_variants uuid[] DEFAULT '{}',
  valid_from date,
  valid_to date,
  is_active boolean NOT NULL DEFAULT true
);

ALTER TABLE public.org_schemes ENABLE ROW LEVEL SECURITY;

CREATE POLICY org_isolation_select ON public.org_schemes
  FOR SELECT
  USING (
    org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid)
  );

CREATE POLICY org_isolation_insert ON public.org_schemes
  FOR INSERT
  WITH CHECK (
    org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid)
  );

CREATE POLICY org_isolation_update ON public.org_schemes
  FOR UPDATE
  USING (
    org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid)
  );

CREATE TABLE IF NOT EXISTS public.org_rto_types (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text
);

ALTER TABLE public.org_rto_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY org_isolation_select ON public.org_rto_types
  FOR SELECT
  USING (
    org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid)
  );

CREATE POLICY org_isolation_insert ON public.org_rto_types
  FOR INSERT
  WITH CHECK (
    org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid)
  );

CREATE POLICY org_isolation_update ON public.org_rto_types
  FOR UPDATE
  USING (
    org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid)
  );

CREATE TABLE IF NOT EXISTS public.org_rto_charges (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  rto_type_id uuid NOT NULL REFERENCES public.org_rto_types(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES public.org_variants(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL DEFAULT 0
);

ALTER TABLE public.org_rto_charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY org_isolation_select ON public.org_rto_charges
  FOR SELECT
  USING (
    org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid)
  );

CREATE POLICY org_isolation_insert ON public.org_rto_charges
  FOR INSERT
  WITH CHECK (
    org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid)
  );

CREATE POLICY org_isolation_update ON public.org_rto_charges
  FOR UPDATE
  USING (
    org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid)
  );

-- Document checklist tables
CREATE TABLE IF NOT EXISTS public.document_types (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  key text UNIQUE NOT NULL,
  label text NOT NULL,
  description text
);

ALTER TABLE public.document_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY authenticated_select_document_types ON public.document_types
  FOR SELECT
  TO authenticated
  USING (true);

CREATE TABLE IF NOT EXISTS public.org_document_checklist (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  document_type text NOT NULL REFERENCES public.document_types(key),
  stage text NOT NULL,
  is_mandatory boolean NOT NULL DEFAULT false,
  UNIQUE (org_id, document_type, stage),
  CONSTRAINT org_document_checklist_stage_check CHECK (stage IN ('booking', 'billing', 'delivery'))
);

ALTER TABLE public.org_document_checklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY org_isolation_select ON public.org_document_checklist
  FOR SELECT
  USING (
    org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid)
  );

CREATE POLICY org_isolation_insert ON public.org_document_checklist
  FOR INSERT
  WITH CHECK (
    org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid)
  );

CREATE POLICY org_isolation_update ON public.org_document_checklist
  FOR UPDATE
  USING (
    org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid)
  );

-- Seed role templates
INSERT INTO public.org_role_templates (key, label, description)
VALUES
  ('standard_dealer', 'Standard Dealer', 'Most dealerships with standard hierarchy'),
  ('small_dealer', 'Small Dealer', 'Single location dealerships with compact teams'),
  ('blank', 'Blank', 'Start from scratch and build your own role model')
ON CONFLICT (key) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description;

INSERT INTO public.org_role_template_roles (template_key, role_name, is_default)
VALUES
  ('standard_dealer', 'Org Admin', true),
  ('standard_dealer', 'Sales Manager', false),
  ('standard_dealer', 'DSE', false),
  ('standard_dealer', 'Ops Executive', false),
  ('standard_dealer', 'Accounts', false),
  ('standard_dealer', 'Reception', false),
  ('small_dealer', 'Admin', true),
  ('small_dealer', 'Salesperson', false),
  ('small_dealer', 'Ops', false),
  ('blank', 'Org Admin', true)
ON CONFLICT DO NOTHING;

-- Seed sample master variants
INSERT INTO public.vehicles_master (make, model, variant, fuel_type, transmission, colour_code, colour_name)
VALUES
  ('Maruti Suzuki', 'Swift', 'VXi', 'Petrol', 'Manual', '#C0C0C0', 'Silky Silver'),
  ('Hyundai', 'Creta', 'SX', 'Diesel', 'Automatic', '#1E293B', 'Titan Gray'),
  ('Tata', 'Nexon', 'XZ+', 'CNG', 'Manual', '#DC2626', 'Flame Red'),
  ('Mahindra', 'XUV700', 'AX7', 'Diesel', 'Automatic', '#111827', 'Midnight Black'),
  ('MG', 'ZS EV', 'Excite', 'Electric', 'Automatic', '#F8FAFC', 'Arctic White')
ON CONFLICT DO NOTHING;

-- Seed platform document catalogue
INSERT INTO public.document_types (key, label, description)
VALUES
  ('pan', 'PAN', 'Permanent Account Number card'),
  ('aadhaar', 'Aadhaar', 'Aadhaar identity proof'),
  ('booking_receipt', 'Booking Receipt', 'Customer booking receipt'),
  ('form_29', 'Form 29', 'Transfer of ownership form 29'),
  ('form_30', 'Form 30', 'Transfer of ownership form 30'),
  ('noc', 'NOC', 'No objection certificate'),
  ('insurance_policy', 'Insurance Policy', 'Vehicle insurance policy copy'),
  ('rto_receipt', 'RTO Receipt', 'RTO processing receipt'),
  ('bank_sanction_letter', 'Bank Sanction Letter', 'Sanction letter from financing bank')
ON CONFLICT (key) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description;
