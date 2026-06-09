import { getSupabaseClient } from "../supabase";

export async function hasPermission(roleId, contextKey) {
  if (!roleId || !contextKey) return false;

  const client = getSupabaseClient();
  const { data, error } = await client
    .from("org_role_permissions")
    .select("permission_id, permissions!inner(context)")
    .eq("role_id", roleId)
    .eq("permissions.context", contextKey)
    .limit(1);

  if (error) return false;
  return Boolean(data?.length);
}
