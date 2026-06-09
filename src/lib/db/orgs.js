import { getSupabaseClient } from "../supabase";

export async function getOrg() {
  const client = getSupabaseClient();
  const { data, error } = await client.from("orgs").select("*").maybeSingle();

  if (error) throw error;
  return data;
}

export async function updateOrg(orgId, updates) {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("orgs")
    .update(updates)
    .eq("id", orgId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function getOrgTheme() {
  const client = getSupabaseClient();
  const { data, error } = await client.from("org_theme").select("*").maybeSingle();

  if (error) throw error;
  return data;
}

export async function upsertOrgTheme(payload) {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("org_theme")
    .upsert(payload, { onConflict: "org_id" })
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getOrgLocations() {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("org_locations")
    .select("id, name, city, state")
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}
