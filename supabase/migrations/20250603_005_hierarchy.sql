-- Migration 005: Reporting hierarchy and approvals

CREATE TABLE IF NOT EXISTS public.org_chart_nodes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  parent_node_id uuid REFERENCES public.org_chart_nodes(id) ON DELETE SET NULL,
  canvas_x double precision NOT NULL DEFAULT 0,
  canvas_y double precision NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE (org_id, employee_id)
);

ALTER TABLE public.org_chart_nodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY org_isolation_select ON public.org_chart_nodes
  FOR SELECT
  USING (
    org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid)
  );

CREATE POLICY org_isolation_insert ON public.org_chart_nodes
  FOR INSERT
  WITH CHECK (
    org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid)
  );

CREATE POLICY org_isolation_update ON public.org_chart_nodes
  FOR UPDATE
  USING (
    org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid)
  );

CREATE TABLE IF NOT EXISTS public.approval_chain_config (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  required_role_id uuid REFERENCES public.org_roles(id) ON DELETE SET NULL,
  can_skip_levels boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE (org_id, action_type)
);

ALTER TABLE public.approval_chain_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY org_isolation_select ON public.approval_chain_config
  FOR SELECT
  USING (
    org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid)
  );

CREATE POLICY org_isolation_insert ON public.approval_chain_config
  FOR INSERT
  WITH CHECK (
    org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid)
  );

CREATE POLICY org_isolation_update ON public.approval_chain_config
  FOR UPDATE
  USING (
    org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid)
  );

CREATE TABLE IF NOT EXISTS public.approval_requests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  requested_by uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  target_id uuid,
  target_type text,
  status text NOT NULL DEFAULT 'pending',
  approver_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  decided_by uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  comment text,
  created_at timestamptz DEFAULT now(),
  decided_at timestamptz,
  CONSTRAINT approval_requests_status_check CHECK (status IN ('pending', 'approved', 'rejected'))
);

ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY org_isolation_select ON public.approval_requests
  FOR SELECT
  USING (
    org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid)
  );

CREATE POLICY org_isolation_insert ON public.approval_requests
  FOR INSERT
  WITH CHECK (
    org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid)
  );

CREATE POLICY org_isolation_update ON public.approval_requests
  FOR UPDATE
  USING (
    org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid)
  );

CREATE OR REPLACE FUNCTION public.route_approval_request()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  config_row RECORD;
  current_node_id uuid;
  current_parent_node_id uuid;
  current_employee_id uuid;
  current_employee_role uuid;
  depth_count int := 0;
BEGIN
  IF NEW.approver_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT *
  INTO config_row
  FROM public.approval_chain_config
  WHERE org_id = NEW.org_id
    AND action_type = NEW.action_type
  LIMIT 1;

  IF config_row.required_role_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id, parent_node_id
  INTO current_node_id, current_parent_node_id
  FROM public.org_chart_nodes
  WHERE org_id = NEW.org_id
    AND employee_id = NEW.requested_by
  LIMIT 1;

  IF current_node_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF config_row.can_skip_levels = false THEN
    -- Phase 1 behavior: route to first parent up the chain with required role.
    current_node_id := current_parent_node_id;
  END IF;

  WHILE current_node_id IS NOT NULL AND depth_count < 50 LOOP
    SELECT employee_id, parent_node_id
    INTO current_employee_id, current_parent_node_id
    FROM public.org_chart_nodes
    WHERE id = current_node_id
      AND org_id = NEW.org_id
    LIMIT 1;

    IF current_employee_id IS NULL THEN
      EXIT;
    END IF;

    SELECT role_id
    INTO current_employee_role
    FROM public.employees
    WHERE id = current_employee_id
      AND org_id = NEW.org_id
    LIMIT 1;

    IF current_employee_role = config_row.required_role_id THEN
      NEW.approver_id := current_employee_id;
      EXIT;
    END IF;

    current_node_id := current_parent_node_id;
    depth_count := depth_count + 1;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_route_approval_request ON public.approval_requests;

CREATE TRIGGER trg_route_approval_request
BEFORE INSERT ON public.approval_requests
FOR EACH ROW
EXECUTE FUNCTION public.route_approval_request();
