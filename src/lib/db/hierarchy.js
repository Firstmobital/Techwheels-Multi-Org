import { getSupabaseClient } from "../supabase";

const ACTION_TYPES = [
  { key: "reversal", label: "Booking reversal" },
  { key: "discount_override", label: "Discount override" },
  { key: "cancellation", label: "Booking cancellation" },
  { key: "stage_bypass", label: "Ops stage bypass" },
];

const RIGHTS = ["view", "edit", "approve", "export"];

export async function getHierarchyBootstrap() {
  const client = getSupabaseClient();
  const [employeesRes, profilesRes, rolesRes, nodesRes] = await Promise.all([
    client.from("employees").select("id, role_id, location_ids, created_at"),
    client.from("employee_profiles").select("employee_id, full_name"),
    client.from("org_roles").select("id, name, description, is_default"),
    client.from("org_chart_nodes").select("id, org_id, employee_id, parent_node_id, canvas_x, canvas_y"),
  ]);

  if (employeesRes.error) throw employeesRes.error;
  if (profilesRes.error) throw profilesRes.error;
  if (rolesRes.error) throw rolesRes.error;
  if (nodesRes.error) throw nodesRes.error;

  const roleMap = new Map((rolesRes.data || []).map((role) => [role.id, role]));
  const profileMap = new Map((profilesRes.data || []).map((profile) => [profile.employee_id, profile]));

  const employees = (employeesRes.data || []).map((employee) => ({
    ...employee,
    full_name: profileMap.get(employee.id)?.full_name || "Unnamed Employee",
    role_name: roleMap.get(employee.role_id)?.name || "No Role",
  }));

  return {
    employees,
    roles: rolesRes.data || [],
    nodes: nodesRes.data || [],
  };
}

export async function saveNodePosition(nodeId, x, y) {
  const client = getSupabaseClient();
  const { error } = await client.from("org_chart_nodes").update({ canvas_x: x, canvas_y: y }).eq("id", nodeId);
  if (error) throw error;
}

export async function updateParentNode(nodeId, parentNodeId) {
  const client = getSupabaseClient();
  const { error } = await client
    .from("org_chart_nodes")
    .update({ parent_node_id: parentNodeId || null })
    .eq("id", nodeId);
  if (error) throw error;
}

export async function addEmployeeToChart({ employeeId, x, y }) {
  const client = getSupabaseClient();
  const { data: emp, error: empError } = await client.from("employees").select("org_id").eq("id", employeeId).single();
  if (empError) throw empError;

  const { data, error } = await client
    .from("org_chart_nodes")
    .insert({ org_id: emp.org_id, employee_id: employeeId, canvas_x: x, canvas_y: y })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function removeNodeFromChart(nodeId) {
  const client = getSupabaseClient();
  const { error } = await client.from("org_chart_nodes").delete().eq("id", nodeId);
  if (error) throw error;
}

export async function saveLayout(nodes) {
  const client = getSupabaseClient();
  const payload = nodes.map((node) => ({
    id: node.id,
    canvas_x: node.position.x,
    canvas_y: node.position.y,
  }));

  for (const row of payload) {
    const { error } = await client
      .from("org_chart_nodes")
      .update({ canvas_x: row.canvas_x, canvas_y: row.canvas_y })
      .eq("id", row.id);

    if (error) throw error;
  }
}

export async function getApprovalChainConfig() {
  const client = getSupabaseClient();
  const [rowsRes, rolesRes] = await Promise.all([
    client.from("approval_chain_config").select("id, action_type, required_role_id, can_skip_levels"),
    client.from("org_roles").select("id, name").order("name"),
  ]);

  if (rowsRes.error) throw rowsRes.error;
  if (rolesRes.error) throw rolesRes.error;

  const map = new Map((rowsRes.data || []).map((row) => [row.action_type, row]));
  const rows = ACTION_TYPES.map((action) => ({
    action_type: action.key,
    action_label: action.label,
    required_role_id: map.get(action.key)?.required_role_id || "",
    can_skip_levels: map.get(action.key)?.can_skip_levels || false,
  }));

  return { rows, roles: rolesRes.data || [] };
}

export async function upsertApprovalChainRow(actionType, requiredRoleId, canSkipLevels) {
  const client = getSupabaseClient();
  const { data: orgRow, error: orgError } = await client.from("orgs").select("id").limit(1).single();
  if (orgError) throw orgError;

  const { error } = await client.from("approval_chain_config").upsert(
    {
      org_id: orgRow.id,
      action_type: actionType,
      required_role_id: requiredRoleId || null,
      can_skip_levels: Boolean(canSkipLevels),
    },
    { onConflict: "org_id,action_type" }
  );

  if (error) throw error;
}

export async function getAccessStudioData() {
  const client = getSupabaseClient();
  const [employeesRes, profilesRes, rolesRes, permissionsRes, rightsRes, rolePermRes, rolePermRightRes, modulesRes] =
    await Promise.all([
      client.from("employees").select("id, role_id, location_ids"),
      client.from("employee_profiles").select("employee_id, full_name"),
      client.from("org_roles").select("id, name"),
      client.from("permissions").select("id, context, label, module_key").order("context"),
      client.from("rights").select("id, name").in("name", RIGHTS),
      client.from("org_role_permissions").select("id, role_id, permission_id"),
      client.from("org_role_permission_rights").select("role_permission_id, right_id"),
      client.from("org_modules").select("module_key, enabled"),
    ]);

  if (employeesRes.error) throw employeesRes.error;
  if (profilesRes.error) throw profilesRes.error;
  if (rolesRes.error) throw rolesRes.error;
  if (permissionsRes.error) throw permissionsRes.error;
  if (rightsRes.error) throw rightsRes.error;
  if (rolePermRes.error) throw rolePermRes.error;
  if (rolePermRightRes.error) throw rolePermRightRes.error;
  if (modulesRes.error) throw modulesRes.error;

  const profileMap = new Map((profilesRes.data || []).map((row) => [row.employee_id, row.full_name]));
  const roleMap = new Map((rolesRes.data || []).map((row) => [row.id, row.name]));
  const rightIdToName = new Map((rightsRes.data || []).map((row) => [row.id, row.name]));
  const enabledModules = new Set((modulesRes.data || []).filter((m) => m.enabled).map((m) => m.module_key));

  const employees = (employeesRes.data || []).map((row) => ({
    ...row,
    full_name: profileMap.get(row.id) || "Unnamed",
    role_name: roleMap.get(row.role_id) || "No role",
  }));

  const permissions = (permissionsRes.data || []).filter((permission) => {
    if (!permission.module_key) return true;
    return enabledModules.has(permission.module_key);
  });

  const rolePermissionMap = new Map();
  (rolePermRes.data || []).forEach((row) => {
    rolePermissionMap.set(`${row.role_id}:${row.permission_id}`, row.id);
  });

  const rolePermissionRights = new Set();
  (rolePermRightRes.data || []).forEach((row) => {
    const rightName = rightIdToName.get(row.right_id);
    if (rightName) rolePermissionRights.add(`${row.role_permission_id}:${rightName}`);
  });

  return {
    employees,
    roles: rolesRes.data || [],
    permissions,
    rights: rightsRes.data || [],
    rolePermissionMap,
    rolePermissionRights,
  };
}

export async function updateEmployeeRole(employeeId, roleId) {
  const client = getSupabaseClient();
  const { error } = await client.from("employees").update({ role_id: roleId }).eq("id", employeeId);
  if (error) throw error;
}

export async function setRolePermissionRight({ roleId, permissionId, rightId, enabled }) {
  const client = getSupabaseClient();

  const { data: orgRow, error: orgError } = await client.from("orgs").select("id").limit(1).single();
  if (orgError) throw orgError;

  const { data: rolePerm, error: rolePermError } = await client
    .from("org_role_permissions")
    .upsert(
      {
        org_id: orgRow.id,
        role_id: roleId,
        permission_id: permissionId,
      },
      { onConflict: "role_id,permission_id" }
    )
    .select("id")
    .single();

  if (rolePermError) throw rolePermError;

  if (enabled) {
    const { error } = await client.from("org_role_permission_rights").upsert(
      {
        org_id: orgRow.id,
        role_permission_id: rolePerm.id,
        right_id: rightId,
      },
      { onConflict: "role_permission_id,right_id" }
    );

    if (error) throw error;
  } else {
    const { error } = await client
      .from("org_role_permission_rights")
      .delete()
      .eq("role_permission_id", rolePerm.id)
      .eq("right_id", rightId);

    if (error) throw error;
  }
}

export async function getRolesManagementData() {
  const client = getSupabaseClient();
  const [rolesRes, employeesRes, rolePermRes, rolePermRightsRes] = await Promise.all([
    client.from("org_roles").select("id, org_id, name, description, is_default").order("created_at", { ascending: true }),
    client.from("employees").select("id, role_id"),
    client.from("org_role_permissions").select("id, org_id, role_id, permission_id"),
    client.from("org_role_permission_rights").select("id, org_id, role_permission_id, right_id"),
  ]);

  if (rolesRes.error) throw rolesRes.error;
  if (employeesRes.error) throw employeesRes.error;
  if (rolePermRes.error) throw rolePermRes.error;
  if (rolePermRightsRes.error) throw rolePermRightsRes.error;

  const roleCounts = new Map();
  (employeesRes.data || []).forEach((employee) => {
    roleCounts.set(employee.role_id, (roleCounts.get(employee.role_id) || 0) + 1);
  });

  return {
    roles: (rolesRes.data || []).map((role) => ({
      ...role,
      employee_count: roleCounts.get(role.id) || 0,
    })),
    rolePermissions: rolePermRes.data || [],
    rolePermissionRights: rolePermRightsRes.data || [],
  };
}

export async function addRole(orgId, name, description) {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("org_roles")
    .insert({ org_id: orgId, name, description: description || null })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateRole(roleId, updates) {
  const client = getSupabaseClient();
  const { error } = await client.from("org_roles").update(updates).eq("id", roleId);
  if (error) throw error;
}

export async function setDefaultRole(role) {
  const client = getSupabaseClient();
  const { error: clearError } = await client.from("org_roles").update({ is_default: false }).eq("org_id", role.org_id);
  if (clearError) throw clearError;
  const { error } = await client.from("org_roles").update({ is_default: true }).eq("id", role.id);
  if (error) throw error;
}

export async function deleteRole(roleId) {
  const client = getSupabaseClient();
  const { error } = await client.from("org_roles").delete().eq("id", roleId);
  if (error) throw error;
}

export async function cloneRole(role, rolePermissions, rolePermissionRights) {
  const client = getSupabaseClient();
  const { data: newRole, error: newRoleError } = await client
    .from("org_roles")
    .insert({
      org_id: role.org_id,
      name: `${role.name} (copy)`,
      description: role.description,
      is_default: false,
    })
    .select("*")
    .single();

  if (newRoleError) throw newRoleError;

  const sourcePerms = rolePermissions.filter((item) => item.role_id === role.id);
  const sourcePermIds = new Set(sourcePerms.map((item) => item.id));

  if (sourcePerms.length) {
    const { data: clonedPerms, error: permsError } = await client
      .from("org_role_permissions")
      .insert(
        sourcePerms.map((item) => ({
          org_id: item.org_id,
          role_id: newRole.id,
          permission_id: item.permission_id,
        }))
      )
      .select("id, permission_id");

    if (permsError) throw permsError;

    const mapNewPermId = new Map((clonedPerms || []).map((item) => [item.permission_id, item.id]));
    const rightsToClone = rolePermissionRights.filter((item) => {
      const sourceRolePerm = sourcePerms.find((perm) => perm.id === item.role_permission_id);
      return Boolean(sourceRolePerm && mapNewPermId.get(sourceRolePerm.permission_id));
    });

    if (rightsToClone.length) {
      const payload = rightsToClone
        .map((item) => {
          const sourceRolePerm = sourcePerms.find((perm) => perm.id === item.role_permission_id);
          if (!sourceRolePerm) return null;
          const newRolePermId = mapNewPermId.get(sourceRolePerm.permission_id);
          if (!newRolePermId) return null;
          return {
            org_id: role.org_id,
            role_permission_id: newRolePermId,
            right_id: item.right_id,
          };
        })
        .filter(Boolean);

      if (payload.length) {
        const { error } = await client.from("org_role_permission_rights").insert(payload);
        if (error) throw error;
      }
    }
  }

  return { ...newRole, source_permission_ids: [...sourcePermIds] };
}

export async function getApprovalsData(employeeId) {
  const client = getSupabaseClient();
  const [awaitingRes, mineRes, profilesRes] = await Promise.all([
    client
      .from("approval_requests")
      .select("id, action_type, target_type, target_id, status, requested_by, approver_id, comment, created_at")
      .eq("approver_id", employeeId)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    client
      .from("approval_requests")
      .select("id, action_type, target_type, target_id, status, requested_by, approver_id, decided_by, comment, created_at, decided_at")
      .eq("requested_by", employeeId)
      .order("created_at", { ascending: false }),
    client.from("employee_profiles").select("employee_id, full_name"),
  ]);

  if (awaitingRes.error) throw awaitingRes.error;
  if (mineRes.error) throw mineRes.error;
  if (profilesRes.error) throw profilesRes.error;

  const profileMap = new Map((profilesRes.data || []).map((item) => [item.employee_id, item.full_name]));

  return {
    awaiting: (awaitingRes.data || []).map((row) => ({
      ...row,
      requested_by_name: profileMap.get(row.requested_by) || "Unknown",
    })),
    mine: (mineRes.data || []).map((row) => ({
      ...row,
      approver_name: profileMap.get(row.approver_id) || "Unassigned",
    })),
  };
}

export async function decideApproval({ requestId, decision, comment, decidedBy }) {
  const client = getSupabaseClient();
  const next = decision === "approve" ? "approved" : "rejected";
  const { error } = await client
    .from("approval_requests")
    .update({
      status: next,
      decided_by: decidedBy,
      decided_at: new Date().toISOString(),
      comment: comment || null,
    })
    .eq("id", requestId);

  if (error) throw error;
}
