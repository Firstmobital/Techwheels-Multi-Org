-- Migration 003: Seed platform modules and Phase 1 permissions

INSERT INTO public.modules (key, label, description, base_price, is_addon)
VALUES
  ('core_crm', 'Core CRM', 'Core CRM (mandatory for all plans)', 0.00, false),
  ('stock', 'Stock Management', 'Stock Management (growth+)', 0.00, true),
  ('ops_billing', 'Operations & Billing', 'Operations & Billing (growth+)', 0.00, true),
  ('finance', 'Finance Module', 'Finance Module (growth+)', 0.00, true),
  ('reports', 'Reports Hub', 'Reports Hub (growth+)', 0.00, true)
ON CONFLICT (key) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  base_price = EXCLUDED.base_price,
  is_addon = EXCLUDED.is_addon;

INSERT INTO public.permissions (context, label, description, module_key)
VALUES
  ('crm.quotes', 'Quotes', 'Quote creation and management', 'core_crm'),
  ('crm.leads', 'Leads', 'Lead lifecycle management', 'core_crm'),
  ('crm.bookings', 'Bookings', 'Booking creation and updates', 'core_crm'),
  ('hr.employees', 'Employee management', 'Manage employee records', 'core_crm'),
  ('hr.onboarding', 'Employee onboarding pipeline', 'Run employee onboarding workflow', 'core_crm'),
  ('org.hierarchy', 'Org chart & reporting hierarchy', 'Configure organisation hierarchy', 'core_crm'),
  ('org.roles', 'Role management', 'Manage org-defined roles and permissions', 'core_crm'),
  ('org.approvals', 'Approval chain config', 'Configure approval chains and routings', 'core_crm'),
  ('config.schemes', 'Scheme management', 'Manage pricing and sales schemes', 'core_crm'),
  ('config.pricing', 'Pricing configuration', 'Manage pricing-related config', 'core_crm')
ON CONFLICT DO NOTHING;
