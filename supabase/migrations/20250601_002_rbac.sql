-- Migration 002: RBAC tables, seeds for rights, and RLS

-- 1) permissions (platform-level)
CREATE TABLE IF NOT EXISTS public.permissions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  context text NOT NULL,
  label text NOT NULL,
  description text,
  module_key text REFERENCES public.modules(key)
);

ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY authenticated_select_permissions ON public.permissions
  FOR SELECT
  TO authenticated
  USING (true);

-- 2) rights (platform-level)
CREATE TABLE IF NOT EXISTS public.rights (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text UNIQUE NOT NULL
);

ALTER TABLE public.rights ENABLE ROW LEVEL SECURITY;

CREATE POLICY authenticated_select_rights ON public.rights
  FOR SELECT
  TO authenticated
  USING (true);

INSERT INTO public.rights (name)
VALUES ('view'), ('edit'), ('approve'), ('export')
ON CONFLICT (name) DO NOTHING;

-- 3) org_roles
CREATE TABLE IF NOT EXISTS public.org_roles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.org_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY org_isolation_select ON public.org_roles
  FOR SELECT
  USING (
    org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid)
  );

CREATE POLICY org_isolation_insert ON public.org_roles
  FOR INSERT
  WITH CHECK (
    org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid)
  );

CREATE POLICY org_isolation_update ON public.org_roles
  FOR UPDATE
  USING (
    org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid)
  );

-- 4) org_role_permissions
CREATE TABLE IF NOT EXISTS public.org_role_permissions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.org_roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES public.permissions(id),
  UNIQUE (role_id, permission_id)
);

ALTER TABLE public.org_role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY org_isolation_select ON public.org_role_permissions
  FOR SELECT
  USING (
    org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid)
  );

CREATE POLICY org_isolation_insert ON public.org_role_permissions
  FOR INSERT
  WITH CHECK (
    org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid)
  );

CREATE POLICY org_isolation_update ON public.org_role_permissions
  FOR UPDATE
  USING (
    org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid)
  );

-- 5) org_role_permission_rights
CREATE TABLE IF NOT EXISTS public.org_role_permission_rights (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  role_permission_id uuid NOT NULL REFERENCES public.org_role_permissions(id) ON DELETE CASCADE,
  right_id uuid NOT NULL REFERENCES public.rights(id),
  UNIQUE (role_permission_id, right_id)
);

ALTER TABLE public.org_role_permission_rights ENABLE ROW LEVEL SECURITY;

CREATE POLICY org_isolation_select ON public.org_role_permission_rights
  FOR SELECT
  USING (
    org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid)
  );

CREATE POLICY org_isolation_insert ON public.org_role_permission_rights
  FOR INSERT
  WITH CHECK (
    org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid)
  );

CREATE POLICY org_isolation_update ON public.org_role_permission_rights
  FOR UPDATE
  USING (
    org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid)
  );

-- 6) employees
CREATE TABLE IF NOT EXISTS public.employees (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  auth_user_id uuid UNIQUE REFERENCES auth.users(id),
  role_id uuid REFERENCES public.org_roles(id),
  location_ids uuid[] DEFAULT '{}',
  onboarding_stage text DEFAULT 'hr',
  invited_by uuid REFERENCES public.employees(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT employees_onboarding_stage_check CHECK (
    onboarding_stage IN ('hr', 'it', 'security', 'accounts', 'manager', 'complete')
  )
);

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY org_isolation_select ON public.employees
  FOR SELECT
  USING (
    org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid)
  );

CREATE POLICY org_isolation_insert ON public.employees
  FOR INSERT
  WITH CHECK (
    org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid)
  );

CREATE POLICY org_isolation_update ON public.employees
  FOR UPDATE
  USING (
    org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid)
  );

CREATE TRIGGER set_employees_updated_at
BEFORE UPDATE ON public.employees
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- 7) employee_profiles
CREATE TABLE IF NOT EXISTS public.employee_profiles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id uuid NOT NULL UNIQUE REFERENCES public.employees(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text,
  personal_email text,
  dob date,
  address text
);

ALTER TABLE public.employee_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY org_isolation_select ON public.employee_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.employees e
      WHERE e.id = employee_id
        AND e.org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid)
    )
  );

CREATE POLICY org_isolation_insert ON public.employee_profiles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.employees e
      WHERE e.id = employee_id
        AND e.org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid)
    )
  );

CREATE POLICY org_isolation_update ON public.employee_profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.employees e
      WHERE e.id = employee_id
        AND e.org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid)
    )
  );
