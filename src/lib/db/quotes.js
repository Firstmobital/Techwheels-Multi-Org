import { getSupabaseClient } from "../supabase";

function isMissingTable(error) {
  return error?.code === "42P01";
}

function applyLocationScope(query, locationIds, scoped) {
  if (scoped && Array.isArray(locationIds) && locationIds.length) {
    return query.in("location_id", locationIds);
  }

  return query;
}

export async function getDashboardStats({ locationIds = [], scopedToLocation = false } = {}) {
  const client = getSupabaseClient();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  try {
    let totalMonthly = client
      .from("quotes")
      .select("id", { count: "exact", head: true })
      .gte("created_at", monthStart);

    let converted = client
      .from("quotes")
      .select("id", { count: "exact", head: true })
      .eq("status", "converted")
      .gte("created_at", monthStart);

    let active = client
      .from("quotes")
      .select("id", { count: "exact", head: true })
      .in("status", ["draft", "sent"])
      .gt("valid_until", now.toISOString());

    let expiringSoon = client
      .from("quotes")
      .select("id", { count: "exact", head: true })
      .eq("status", "sent")
      .gte("valid_until", now.toISOString())
      .lte("valid_until", weekAhead);

    totalMonthly = applyLocationScope(totalMonthly, locationIds, scopedToLocation);
    converted = applyLocationScope(converted, locationIds, scopedToLocation);
    active = applyLocationScope(active, locationIds, scopedToLocation);
    expiringSoon = applyLocationScope(expiringSoon, locationIds, scopedToLocation);

    const [m, c, a, e] = await Promise.all([totalMonthly, converted, active, expiringSoon]);

    return {
      quotesThisMonth: m.count ?? 0,
      converted: c.count ?? 0,
      activeQuotes: a.count ?? 0,
      expiringSoon: e.count ?? 0,
    };
  } catch (error) {
    if (isMissingTable(error)) {
      return { quotesThisMonth: 0, converted: 0, activeQuotes: 0, expiringSoon: 0 };
    }

    return { quotesThisMonth: 0, converted: 0, activeQuotes: 0, expiringSoon: 0 };
  }
}

export async function getRecentQuotes({ locationIds = [], scopedToLocation = false, limit = 10 } = {}) {
  const client = getSupabaseClient();

  try {
    let query = client
      .from("quotes")
      .select("id, customer_name, vehicle_name, total_amount, status, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    query = applyLocationScope(query, locationIds, scopedToLocation);

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  } catch (_error) {
    return [];
  }
}

export async function getActiveQuoteCount({ locationIds = [], scopedToLocation = false } = {}) {
  const client = getSupabaseClient();

  try {
    let query = client
      .from("quotes")
      .select("id", { head: true, count: "exact" })
      .in("status", ["draft", "sent"])
      .gt("valid_until", new Date().toISOString());

    query = applyLocationScope(query, locationIds, scopedToLocation);

    const { count, error } = await query;
    if (error) throw error;
    return count ?? 0;
  } catch (_error) {
    return 0;
  }
}

export async function getOpenLeadsCount() {
  return 0;
}

export async function getPendingApprovalsCount(approverId) {
  const client = getSupabaseClient();

  try {
    let query = client
      .from("approval_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");

    if (approverId) {
      query = query.eq("approver_id", approverId);
    }

    const { count, error } = await query;

    if (error) throw error;
    return count ?? 0;
  } catch (_error) {
    return 0;
  }
}
