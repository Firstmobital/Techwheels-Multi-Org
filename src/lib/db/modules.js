import { getSupabaseClient } from "../supabase";

export async function getOrgModules() {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("org_modules")
    .select("module_key, enabled");

  if (error) throw error;
  return data ?? [];
}

export function hasModule(orgModules, moduleKey) {
  return (orgModules ?? []).some(
    (moduleItem) => moduleItem.module_key === moduleKey && moduleItem.enabled !== false
  );
}
