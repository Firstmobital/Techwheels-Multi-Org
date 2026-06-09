-- Migration 006: Quote builder and templates

CREATE TABLE IF NOT EXISTS public.org_insurance_companies (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_active boolean DEFAULT true
);

ALTER TABLE public.org_insurance_companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY org_isolation_select ON public.org_insurance_companies
  FOR SELECT USING (org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid));
CREATE POLICY org_isolation_insert ON public.org_insurance_companies
  FOR INSERT WITH CHECK (org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid));
CREATE POLICY org_isolation_update ON public.org_insurance_companies
  FOR UPDATE USING (org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid));

CREATE TABLE IF NOT EXISTS public.org_insurance_rates (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  insurance_company_id uuid NOT NULL REFERENCES public.org_insurance_companies(id) ON DELETE CASCADE,
  variant_id uuid NOT NULL REFERENCES public.org_variants(id) ON DELETE CASCADE,
  tp_rate numeric(8,4),
  od_rate_percent numeric(6,4),
  idv_percent numeric(6,4),
  UNIQUE (org_id, insurance_company_id, variant_id)
);

ALTER TABLE public.org_insurance_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY org_isolation_select ON public.org_insurance_rates
  FOR SELECT USING (org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid));
CREATE POLICY org_isolation_insert ON public.org_insurance_rates
  FOR INSERT WITH CHECK (org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid));
CREATE POLICY org_isolation_update ON public.org_insurance_rates
  FOR UPDATE USING (org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid));

CREATE TABLE IF NOT EXISTS public.org_insurance_addons (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  name text NOT NULL,
  price numeric(10,2),
  is_active boolean DEFAULT true
);

ALTER TABLE public.org_insurance_addons ENABLE ROW LEVEL SECURITY;

CREATE POLICY org_isolation_select ON public.org_insurance_addons
  FOR SELECT USING (org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid));
CREATE POLICY org_isolation_insert ON public.org_insurance_addons
  FOR INSERT WITH CHECK (org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid));
CREATE POLICY org_isolation_update ON public.org_insurance_addons
  FOR UPDATE USING (org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid));

CREATE TABLE IF NOT EXISTS public.quotes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.org_locations(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_email text,
  variant_id uuid REFERENCES public.org_variants(id) ON DELETE SET NULL,
  colour text,
  rto_type_id uuid REFERENCES public.org_rto_types(id) ON DELETE SET NULL,
  insurance_company_id uuid REFERENCES public.org_insurance_companies(id) ON DELETE SET NULL,
  insurance_addon_ids uuid[] DEFAULT '{}',
  selected_accessory_ids uuid[] DEFAULT '{}',
  selected_scheme_ids uuid[] DEFAULT '{}',
  esp_snapshot numeric(12,2),
  total_amount numeric(12,2),
  status text DEFAULT 'draft',
  valid_until timestamptz,
  pdf_url text,
  whatsapp_sent_at timestamptz,
  version int DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT quotes_status_check CHECK (status IN ('draft', 'sent', 'expired', 'converted'))
);

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY org_isolation_select ON public.quotes
  FOR SELECT USING (org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid));
CREATE POLICY org_isolation_insert ON public.quotes
  FOR INSERT WITH CHECK (org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid));
CREATE POLICY org_isolation_update ON public.quotes
  FOR UPDATE USING (org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid));

DROP TRIGGER IF EXISTS set_quotes_updated_at ON public.quotes;
CREATE TRIGGER set_quotes_updated_at
BEFORE UPDATE ON public.quotes
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.quote_line_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  line_type text,
  label text,
  amount numeric(12,2),
  is_deduction boolean DEFAULT false
);

ALTER TABLE public.quote_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY org_isolation_select ON public.quote_line_items
  FOR SELECT USING (org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid));
CREATE POLICY org_isolation_insert ON public.quote_line_items
  FOR INSERT WITH CHECK (org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid));
CREATE POLICY org_isolation_update ON public.quote_line_items
  FOR UPDATE USING (org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid));

CREATE TABLE IF NOT EXISTS public.org_quote_pdf_template (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL UNIQUE REFERENCES public.orgs(id) ON DELETE CASCADE,
  show_ndp boolean DEFAULT false,
  show_esp boolean DEFAULT true,
  show_rto boolean DEFAULT true,
  show_insurance boolean DEFAULT true,
  show_accessories boolean DEFAULT true,
  show_schemes boolean DEFAULT true,
  field_labels jsonb DEFAULT '{}'::jsonb,
  footer_text text,
  terms_text text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.org_quote_pdf_template ENABLE ROW LEVEL SECURITY;

CREATE POLICY org_isolation_select ON public.org_quote_pdf_template
  FOR SELECT USING (org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid));
CREATE POLICY org_isolation_insert ON public.org_quote_pdf_template
  FOR INSERT WITH CHECK (org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid));
CREATE POLICY org_isolation_update ON public.org_quote_pdf_template
  FOR UPDATE USING (org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid));

DROP TRIGGER IF EXISTS set_org_quote_pdf_template_updated_at ON public.org_quote_pdf_template;
CREATE TRIGGER set_org_quote_pdf_template_updated_at
BEFORE UPDATE ON public.org_quote_pdf_template
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.org_whatsapp_template (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL UNIQUE REFERENCES public.orgs(id) ON DELETE CASCADE,
  template_body text NOT NULL DEFAULT 'Hi {customer_name}, here is your quote for {car_model} {variant}. Total on-road price: ₹{total_price}. Valid until {validity_date}. - {salesperson_name}, {org_name}',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.org_whatsapp_template ENABLE ROW LEVEL SECURITY;

CREATE POLICY org_isolation_select ON public.org_whatsapp_template
  FOR SELECT USING (org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid));
CREATE POLICY org_isolation_insert ON public.org_whatsapp_template
  FOR INSERT WITH CHECK (org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid));
CREATE POLICY org_isolation_update ON public.org_whatsapp_template
  FOR UPDATE USING (org_id = (SELECT (auth.jwt() ->> 'org_id')::uuid));

DROP TRIGGER IF EXISTS set_org_whatsapp_template_updated_at ON public.org_whatsapp_template;
CREATE TRIGGER set_org_whatsapp_template_updated_at
BEFORE UPDATE ON public.org_whatsapp_template
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();
