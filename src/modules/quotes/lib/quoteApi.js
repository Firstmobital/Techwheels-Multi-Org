import { getSupabaseClient } from "../../../lib/supabase";

export async function getQuoteBuilderBootstrap() {
  const client = getSupabaseClient();

  const [variantsRes, rtoTypesRes, accessoriesRes, schemesRes, insuranceCompaniesRes, insuranceAddonsRes, configRes, chargesRes] =
    await Promise.all([
      client.from("org_variants").select("id, master_variant_id, display_name, ndp, esp, is_active, vehicles_master(make, model, variant, colour_name, colour_code)").eq("is_active", true),
      client.from("org_rto_types").select("id, name, description"),
      client.from("org_accessories").select("id, name, part_number, price").eq("is_active", true),
      client.from("org_schemes").select("id, name, amount, applicable_variants, valid_from, valid_to").eq("is_active", true),
      client.from("org_insurance_companies").select("id, name").eq("is_active", true),
      client.from("org_insurance_addons").select("id, name, price").eq("is_active", true),
      client.from("org_config").select("key, value").in("key", ["quote_validity_days"]),
      client.from("org_charges").select("charge_key, amount").in("charge_key", ["tcs_threshold"]),
    ]);

  if (variantsRes.error) throw variantsRes.error;
  if (rtoTypesRes.error) throw rtoTypesRes.error;
  if (accessoriesRes.error) throw accessoriesRes.error;
  if (schemesRes.error) throw schemesRes.error;
  if (insuranceCompaniesRes.error) throw insuranceCompaniesRes.error;
  if (insuranceAddonsRes.error) throw insuranceAddonsRes.error;
  if (configRes.error) throw configRes.error;
  if (chargesRes.error) throw chargesRes.error;

  const validityDays = Number(configRes.data?.find((item) => item.key === "quote_validity_days")?.value || 30);
  const tcsThreshold = Number(chargesRes.data?.find((item) => item.charge_key === "tcs_threshold")?.amount || 1000000);

  return {
    variants: variantsRes.data || [],
    rtoTypes: rtoTypesRes.data || [],
    accessories: accessoriesRes.data || [],
    schemes: schemesRes.data || [],
    insuranceCompanies: insuranceCompaniesRes.data || [],
    insuranceAddons: insuranceAddonsRes.data || [],
    validityDays,
    tcsThreshold,
  };
}

export async function getRtoChargeForVariant(rtoTypeId, variantId) {
  if (!rtoTypeId || !variantId) return 0;
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("org_rto_charges")
    .select("amount")
    .eq("rto_type_id", rtoTypeId)
    .eq("variant_id", variantId)
    .maybeSingle();

  if (error) return 0;
  return Number(data?.amount || 0);
}

export async function getInsuranceRatesForVariant(variantId) {
  if (!variantId) return [];
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("org_insurance_rates")
    .select("id, insurance_company_id, tp_rate, od_rate_percent, idv_percent")
    .eq("variant_id", variantId);

  if (error) throw error;
  return data || [];
}

export async function fetchQuoteList() {
  const client = getSupabaseClient();
  const [quotesRes, profilesRes, variantsRes] = await Promise.all([
    client.from("quotes").select("id, customer_name, customer_phone, total_amount, status, created_by, valid_until, created_at, variant_id, version").order("created_at", { ascending: false }),
    client.from("employee_profiles").select("employee_id, full_name"),
    client.from("org_variants").select("id, display_name"),
  ]);

  if (quotesRes.error) throw quotesRes.error;
  if (profilesRes.error) throw profilesRes.error;
  if (variantsRes.error) throw variantsRes.error;

  const profileMap = new Map((profilesRes.data || []).map((p) => [p.employee_id, p.full_name]));
  const variantMap = new Map((variantsRes.data || []).map((v) => [v.id, v.display_name]));

  return (quotesRes.data || []).map((quote) => ({
    ...quote,
    created_by_name: profileMap.get(quote.created_by) || "Unknown",
    vehicle_label: variantMap.get(quote.variant_id) || "-",
  }));
}

export async function fetchQuoteDetail(quoteId) {
  const client = getSupabaseClient();
  const [quoteRes, lineItemsRes, profilesRes, variantsRes] = await Promise.all([
    client.from("quotes").select("*").eq("id", quoteId).maybeSingle(),
    client.from("quote_line_items").select("*").eq("quote_id", quoteId),
    client.from("employee_profiles").select("employee_id, full_name"),
    client.from("org_variants").select("id, display_name"),
  ]);

  if (quoteRes.error) throw quoteRes.error;
  if (!quoteRes.data) return null;
  if (lineItemsRes.error) throw lineItemsRes.error;
  if (profilesRes.error) throw profilesRes.error;
  if (variantsRes.error) throw variantsRes.error;

  const profileMap = new Map((profilesRes.data || []).map((p) => [p.employee_id, p.full_name]));
  const variantMap = new Map((variantsRes.data || []).map((v) => [v.id, v.display_name]));

  return {
    ...quoteRes.data,
    created_by_name: profileMap.get(quoteRes.data.created_by) || "Unknown",
    vehicle_label: variantMap.get(quoteRes.data.variant_id) || "-",
    line_items: lineItemsRes.data || [],
  };
}

export async function saveQuote({ orgId, employeeId, payload, status = "draft", quoteId = null, pdfUrl = null, whatsappSentAt = null }) {
  const client = getSupabaseClient();
  const validUntil = new Date(Date.now() + payload.meta.validity_days * 24 * 60 * 60 * 1000).toISOString();

  const row = {
    ...(quoteId ? { id: quoteId } : {}),
    org_id: orgId,
    location_id: payload.meta.location_id || null,
    created_by: employeeId,
    customer_name: payload.customer.name,
    customer_phone: payload.customer.phone,
    customer_email: payload.customer.email || null,
    variant_id: payload.vehicle.variant_id || null,
    colour: payload.vehicle.colour || null,
    rto_type_id: payload.rto.rto_type_id || null,
    insurance_company_id: payload.insurance.insurance_company_id || null,
    insurance_addon_ids: payload.insurance.addon_ids || [],
    selected_accessory_ids: payload.accessories.ids || [],
    selected_scheme_ids: payload.schemes.ids || [],
    esp_snapshot: Number(payload.vehicle.esp || 0),
    total_amount: Number(payload.totals.total || 0),
    status,
    valid_until: validUntil,
    pdf_url: pdfUrl || null,
    whatsapp_sent_at: whatsappSentAt || null,
    version: Number(payload.meta.version || 1),
  };

  const { data, error } = await client.from("quotes").upsert(row).select("*").single();
  if (error) throw error;

  return data;
}

export async function replaceQuoteLineItems({ orgId, quoteId, lineItems }) {
  const client = getSupabaseClient();
  const { error: deleteError } = await client.from("quote_line_items").delete().eq("quote_id", quoteId);
  if (deleteError) throw deleteError;

  const payload = lineItems.map((item) => ({
    org_id: orgId,
    quote_id: quoteId,
    line_type: item.line_type,
    label: item.label,
    amount: Number(item.amount || 0),
    is_deduction: Boolean(item.is_deduction),
  }));

  if (!payload.length) return [];
  const { data, error } = await client.from("quote_line_items").insert(payload).select("*");
  if (error) throw error;
  return data || [];
}

export async function getOrgQuoteTemplate() {
  const client = getSupabaseClient();
  const { data, error } = await client.from("org_quote_pdf_template").select("*").maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertOrgQuoteTemplate(payload) {
  const client = getSupabaseClient();
  const { data: orgRow, error: orgError } = await client.from("orgs").select("id").limit(1).single();
  if (orgError) throw orgError;

  const { data, error } = await client
    .from("org_quote_pdf_template")
    .upsert({ ...payload, org_id: orgRow.id }, { onConflict: "org_id" })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function getWhatsappTemplate() {
  const client = getSupabaseClient();
  const { data, error } = await client.from("org_whatsapp_template").select("*").maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertWhatsappTemplate(templateBody) {
  const client = getSupabaseClient();
  const { data: orgRow, error: orgError } = await client.from("orgs").select("id").limit(1).single();
  if (orgError) throw orgError;

  const { data, error } = await client
    .from("org_whatsapp_template")
    .upsert({ org_id: orgRow.id, template_body: templateBody }, { onConflict: "org_id" })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function callGenerateQuotePdf(payload) {
  const client = getSupabaseClient();
  const { data, error } = await client.functions.invoke("generate-quote-pdf", { body: payload });
  if (error) throw error;
  return data;
}

export async function updateQuoteWhatsappSent(quoteId) {
  const client = getSupabaseClient();
  const { error } = await client
    .from("quotes")
    .update({ whatsapp_sent_at: new Date().toISOString() })
    .eq("id", quoteId);
  if (error) throw error;
}

export async function cloneQuoteForRequote(quote) {
  const client = getSupabaseClient();
  const { data: sourceQuote, error: sourceQuoteError } = await client
    .from("quotes")
    .select("*")
    .eq("id", quote.id)
    .single();
  if (sourceQuoteError) throw sourceQuoteError;

  const { data, error } = await client
    .from("quotes")
    .insert({
      org_id: sourceQuote.org_id,
      location_id: sourceQuote.location_id,
      created_by: sourceQuote.created_by,
      customer_name: sourceQuote.customer_name,
      customer_phone: sourceQuote.customer_phone,
      customer_email: sourceQuote.customer_email,
      variant_id: sourceQuote.variant_id,
      colour: sourceQuote.colour,
      rto_type_id: sourceQuote.rto_type_id,
      insurance_company_id: sourceQuote.insurance_company_id,
      insurance_addon_ids: sourceQuote.insurance_addon_ids,
      selected_accessory_ids: sourceQuote.selected_accessory_ids,
      selected_scheme_ids: sourceQuote.selected_scheme_ids,
      esp_snapshot: sourceQuote.esp_snapshot,
      total_amount: sourceQuote.total_amount,
      status: "draft",
      valid_until: sourceQuote.valid_until,
      pdf_url: null,
      whatsapp_sent_at: null,
      version: Number(sourceQuote.version || 1) + 1,
    })
    .select("*")
    .single();

  if (error) throw error;

  const { data: sourceLines, error: sourceLinesError } = await client
    .from("quote_line_items")
    .select("line_type, label, amount, is_deduction")
    .eq("quote_id", sourceQuote.id);
  if (sourceLinesError) throw sourceLinesError;

  if ((sourceLines || []).length > 0) {
    const { error: insertLineError } = await client.from("quote_line_items").insert(
      sourceLines.map((line) => ({
        org_id: sourceQuote.org_id,
        quote_id: data.id,
        line_type: line.line_type,
        label: line.label,
        amount: line.amount,
        is_deduction: line.is_deduction,
      }))
    );
    if (insertLineError) throw insertLineError;
  }

  return data;
}

export async function updateQuoteStatus(quoteId, status) {
  const client = getSupabaseClient();
  const { error } = await client.from("quotes").update({ status }).eq("id", quoteId);
  if (error) throw error;
}
