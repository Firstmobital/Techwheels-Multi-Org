import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type HookPayload = {
  user?: { id?: string };
  user_id?: string;
  record?: { id?: string };
  claims?: Record<string, unknown>;
  [key: string]: unknown;
};

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

Deno.serve(async (req) => {
  try {
    const payload = (await req.json()) as HookPayload;
    const userId = payload.user?.id ?? payload.user_id ?? payload.record?.id;

    // Return unchanged claims when the hook is called for users without employee rows.
    if (!userId) {
      return new Response(JSON.stringify({ claims: payload.claims ?? {} }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const { data: employee, error } = await admin
      .from("employees")
      .select("org_id, role_id, location_ids")
      .eq("auth_user_id", userId)
      .maybeSingle();

    if (error || !employee) {
      return new Response(JSON.stringify({ claims: payload.claims ?? {} }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const claims = {
      ...(payload.claims ?? {}),
      org_id: employee.org_id,
      role_id: employee.role_id,
      location_ids: employee.location_ids ?? [],
    };

    return new Response(JSON.stringify({ claims }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (_err) {
    return new Response(JSON.stringify({ claims: {} }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
});
