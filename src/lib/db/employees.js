import { getSupabaseClient } from "../supabase";

export async function getEmployee(authUserId) {
  if (!authUserId) return null;

  const client = getSupabaseClient();
  const { data, error } = await client
    .from("employees")
    .select("*")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getEmployeeDetails(authUserId) {
  const employee = await getEmployee(authUserId);
  if (!employee) return null;

  const client = getSupabaseClient();

  const [{ data: profile }, { data: role }] = await Promise.all([
    client.from("employee_profiles").select("full_name").eq("employee_id", employee.id).maybeSingle(),
    employee.role_id
      ? client.from("org_roles").select("name").eq("id", employee.role_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return {
    ...employee,
    full_name: profile?.full_name ?? null,
    role_name: role?.name ?? null,
  };
}

export async function inviteEmployee(payload) {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("employees")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
