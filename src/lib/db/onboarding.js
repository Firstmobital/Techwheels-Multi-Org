import { getSupabaseClient } from "../supabase";

export const mandatorySteps = new Set([1, 3, 5, 7, 8, 9]);

export const onboardingSteps = [
  { id: 1, label: "Org basics", skippable: false },
  { id: 2, label: "Branding", skippable: true },
  { id: 3, label: "Role template", skippable: false },
  { id: 4, label: "Customise roles", skippable: true },
  { id: 5, label: "Locations", skippable: false },
  { id: 6, label: "Invite employees", skippable: true },
  { id: 7, label: "Vehicle catalogue", skippable: false },
  { id: 8, label: "Configure pricing", skippable: false },
  { id: 9, label: "Document checklist", skippable: false },
  { id: 10, label: "Choose modules", skippable: true },
];

function decodeClaims(accessToken) {
  if (!accessToken) return {};

  try {
    const payload = accessToken.split(".")[1];
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(normalized);
    return JSON.parse(decoded);
  } catch (_error) {
    return {};
  }
}

export function getOrgIdFromSession(session) {
  const claims = decodeClaims(session?.access_token);
  return claims.org_id || null;
}

export function createInviteToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export async function fetchOrgForOnboarding(orgId) {
  const client = getSupabaseClient();
  let query = client.from("orgs").select("*").limit(1);

  if (orgId) query = query.eq("id", orgId);

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveOrgBasics({ orgId, values }) {
  const client = getSupabaseClient();
  const payload = {
    ...(orgId ? { id: orgId } : {}),
    name: values.name,
    slug: values.slug || `${slugify(values.name)}-${Math.floor(Math.random() * 10000)}`,
    gst_number: values.gstNumber,
    primary_contact_name: values.contactName,
    primary_contact_phone: values.contactPhone,
    primary_contact_email: values.contactEmail,
    onboarding_step: 1,
  };

  const { data, error } = await client
    .from("orgs")
    .upsert(payload, { onConflict: "id" })
    .select("id, onboarding_step")
    .single();

  if (error) throw error;
  return data;
}

export async function updateOrgStep(orgId, stepNumber, complete = false) {
  if (!orgId) return null;

  const client = getSupabaseClient();
  const { data, error } = await client
    .from("orgs")
    .update({ onboarding_step: stepNumber, onboarding_complete: complete })
    .eq("id", orgId)
    .select("id, onboarding_step, onboarding_complete")
    .single();

  if (error) throw error;
  return data;
}

export async function saveBranding({ orgId, logoUrl, primaryColor, fontChoice }) {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("org_theme")
    .upsert(
      {
        org_id: orgId,
        logo_url: logoUrl || null,
        primary_color: primaryColor,
        font_choice: fontChoice,
      },
      { onConflict: "org_id" }
    )
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function uploadOrgLogo({ orgId, file }) {
  const client = getSupabaseClient();
  const extension = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `${orgId}/logo-${Date.now()}.${extension}`;

  const { error: uploadError } = await client.storage.from("org-assets").upload(path, file, {
    upsert: true,
    contentType: file.type,
  });

  if (uploadError) throw uploadError;

  const { data } = client.storage.from("org-assets").getPublicUrl(path);
  return data.publicUrl;
}

export async function listRoleTemplates() {
  const client = getSupabaseClient();
  const [{ data: templates, error: templatesError }, { data: roles, error: rolesError }] = await Promise.all([
    client.from("org_role_templates").select("key, label, description"),
    client.from("org_role_template_roles").select("template_key, role_name, is_default"),
  ]);

  if (templatesError) throw templatesError;
  if (rolesError) throw rolesError;

  const roleMap = (roles || []).reduce((acc, row) => {
    if (!acc[row.template_key]) acc[row.template_key] = [];
    acc[row.template_key].push(row);
    return acc;
  }, {});

  return (templates || []).map((template) => ({ ...template, roles: roleMap[template.key] || [] }));
}

export async function applyRoleTemplate({ orgId, templateKey }) {
  const client = getSupabaseClient();
  const { data: templateRoles, error: templateError } = await client
    .from("org_role_template_roles")
    .select("role_name, is_default")
    .eq("template_key", templateKey);

  if (templateError) throw templateError;

  await client.from("org_roles").delete().eq("org_id", orgId);

  const inserts = (templateRoles || []).map((item) => ({
    org_id: orgId,
    name: item.role_name,
    is_default: item.is_default,
  }));

  if (!inserts.length) return [];

  const { data, error } = await client.from("org_roles").insert(inserts).select("*");
  if (error) throw error;
  return data;
}

export async function listOrgRoles() {
  const client = getSupabaseClient();
  const { data, error } = await client.from("org_roles").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function saveOrgRoles({ orgId, roles }) {
  const client = getSupabaseClient();

  const payload = roles.map((role) => ({
    id: role.id,
    org_id: orgId,
    name: role.name,
    description: role.description || null,
    is_default: Boolean(role.is_default),
  }));

  const { data, error } = await client.from("org_roles").upsert(payload).select("*");
  if (error) throw error;
  return data || [];
}

export async function addOrgLocation({ orgId, location }) {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("org_locations")
    .insert({
      org_id: orgId,
      name: location.name,
      city: location.city,
      state: location.state,
      is_active: location.is_active,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function listOrgLocations() {
  const client = getSupabaseClient();
  const { data, error } = await client.from("org_locations").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function sendEmployeeInvite({ orgId, email, roleId, locationIds, invitedBy }) {
  const client = getSupabaseClient();
  const token = createInviteToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await client
    .from("employee_invites")
    .insert({
      org_id: orgId,
      email,
      role_id: roleId || null,
      location_ids: locationIds || [],
      token,
      invited_by: invitedBy || null,
      expires_at: expiresAt,
    })
    .select("*")
    .single();

  if (error) throw error;

  const { data: fnData, error: fnError } = await client.functions.invoke("send-invite-email", {
    body: { email, token },
  });

  if (fnError) {
    return { invite: data, inviteLink: `${window.location.origin}/accept-invite?token=${token}`, warning: fnError.message };
  }

  return { invite: data, inviteLink: fnData?.inviteLink || `${window.location.origin}/accept-invite?token=${token}` };
}

export async function listEmployeeInvites() {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("employee_invites")
    .select("id, email, token, accepted_at, expires_at, created_at, org_roles(name)")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function listMasterVehicles() {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("vehicles_master")
    .select("*")
    .order("make", { ascending: true })
    .order("model", { ascending: true })
    .order("variant", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function saveOrgVariants({ orgId, variants }) {
  const client = getSupabaseClient();
  const payload = variants.map((variant) => ({
    org_id: orgId,
    master_variant_id: variant.master_variant_id,
    display_name: variant.display_name,
    ndp: Number(variant.ndp || 0),
    esp: Number(variant.esp || 0),
    is_active: true,
  }));

  const { data, error } = await client
    .from("org_variants")
    .upsert(payload, { onConflict: "org_id,master_variant_id" })
    .select("*");

  if (error) throw error;
  return data || [];
}

export async function listOrgVariants() {
  const client = getSupabaseClient();
  const { data, error } = await client.from("org_variants").select("*");
  if (error) throw error;
  return data || [];
}

export async function savePricingConfig({ orgId, accessories, schemes, rtoTypes, rtoCharges, orgCharges }) {
  const client = getSupabaseClient();

  await client.from("org_accessories").delete().eq("org_id", orgId);
  await client.from("org_schemes").delete().eq("org_id", orgId);
  await client.from("org_rto_charges").delete().eq("org_id", orgId);
  await client.from("org_rto_types").delete().eq("org_id", orgId);

  if (accessories.length) {
    await client.from("org_accessories").insert(
      accessories.map((row) => ({
        org_id: orgId,
        name: row.name,
        price: Number(row.price || 0),
        part_number: row.part_number || null,
        is_active: true,
      }))
    );
  }

  if (schemes.length) {
    await client.from("org_schemes").insert(
      schemes.map((row) => ({
        org_id: orgId,
        name: row.name,
        amount: Number(row.amount || 0),
        applicable_variants: row.applicable_variants || [],
        valid_from: row.valid_from || null,
        valid_to: row.valid_to || null,
        is_active: true,
      }))
    );
  }

  let savedRtoTypes = [];
  if (rtoTypes.length) {
    const { data, error } = await client
      .from("org_rto_types")
      .insert(
        rtoTypes.map((row) => ({
          org_id: orgId,
          name: row.name,
          description: row.description || null,
        }))
      )
      .select("id, name");

    if (error) throw error;
    savedRtoTypes = data || [];
  }

  if (savedRtoTypes.length && rtoCharges.length) {
    await client.from("org_rto_charges").insert(
      rtoCharges
        .map((row) => {
          const match = savedRtoTypes.find((typeRow) => typeRow.name === row.rto_type_name);
          if (!match) return null;
          return {
            org_id: orgId,
            rto_type_id: match.id,
            variant_id: row.variant_id || null,
            amount: Number(row.amount || 0),
          };
        })
        .filter(Boolean)
    );
  }

  if (orgCharges.length) {
    await client.from("org_charges").upsert(
      orgCharges.map((row) => ({
        org_id: orgId,
        charge_key: row.charge_key,
        label: row.label,
        amount: Number(row.amount || 0),
      })),
      { onConflict: "org_id,charge_key" }
    );
  }

  return true;
}

export async function listDocumentTypes() {
  const client = getSupabaseClient();
  const { data, error } = await client.from("document_types").select("key, label").order("label");
  if (error) throw error;
  return data || [];
}

export async function saveDocumentChecklist({ orgId, entries }) {
  const client = getSupabaseClient();
  await client.from("org_document_checklist").delete().eq("org_id", orgId);

  if (!entries.length) return [];

  const { data, error } = await client
    .from("org_document_checklist")
    .insert(
      entries.map((row) => ({
        org_id: orgId,
        document_type: row.document_type,
        stage: row.stage,
        is_mandatory: Boolean(row.is_mandatory),
      }))
    )
    .select("*");

  if (error) throw error;
  return data || [];
}

export async function listModules() {
  const client = getSupabaseClient();
  const { data, error } = await client.from("modules").select("key, label, description, is_addon").order("label");
  if (error) throw error;
  return data || [];
}

export async function saveOrgModules({ orgId, modules }) {
  const client = getSupabaseClient();

  const payload = modules.map((row) => ({
    org_id: orgId,
    module_key: row.module_key,
    enabled: Boolean(row.enabled),
  }));

  const { data, error } = await client
    .from("org_modules")
    .upsert(payload, { onConflict: "org_id,module_key" })
    .select("*");

  if (error) throw error;
  return data || [];
}

export async function validateInviteToken(token) {
  const client = getSupabaseClient();
  const { data, error } = await client.functions.invoke("accept-invite", {
    body: { action: "validate", token },
  });

  if (error) throw error;
  return data;
}

export async function acceptInviteToken({ token, fullName, password }) {
  const client = getSupabaseClient();
  const { data, error } = await client.functions.invoke("accept-invite", {
    body: { action: "accept", token, fullName, password },
  });

  if (error) throw error;
  return data;
}
