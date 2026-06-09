import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type ValidatePayload = {
  action: "validate";
  token: string;
};

type AcceptPayload = {
  action: "accept";
  token: string;
  fullName: string;
  password: string;
};

type InvitePayload = ValidatePayload | AcceptPayload;

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function getInvite(token: string) {
  const { data, error } = await admin
    .from("employee_invites")
    .select("id, org_id, email, role_id, location_ids, invited_by, accepted_at, expires_at, orgs(name), org_roles(name)")
    .eq("token", token)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

function inviteValidationError(invite: any) {
  if (!invite) return "Invalid invite token.";
  if (invite.accepted_at) return "This invite was already accepted.";
  if (new Date(invite.expires_at).getTime() < Date.now()) return "This invite has expired.";
  return null;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const payload = (await req.json()) as InvitePayload;

    if (!payload?.token || !payload?.action) {
      return new Response(JSON.stringify({ error: "action and token are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const invite = await getInvite(payload.token);
    const validationMessage = inviteValidationError(invite);

    if (validationMessage) {
      return new Response(JSON.stringify({ valid: false, error: validationMessage }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (payload.action === "validate") {
      return new Response(
        JSON.stringify({
          valid: true,
          invite: {
            email: invite.email,
            orgName: invite.orgs?.name ?? "TechWheels",
            roleName: invite.org_roles?.name ?? "Team Member",
            expiresAt: invite.expires_at,
          },
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    if (!payload.fullName || !payload.password || payload.password.length < 8) {
      return new Response(JSON.stringify({ error: "fullName and password(min 8) are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { data: userRes, error: createUserError } = await admin.auth.admin.createUser({
      email: invite.email,
      password: payload.password,
      email_confirm: true,
      user_metadata: { full_name: payload.fullName },
    });

    if (createUserError || !userRes.user) {
      return new Response(JSON.stringify({ error: createUserError?.message ?? "Failed to create user" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { data: employee, error: employeeError } = await admin
      .from("employees")
      .insert({
        org_id: invite.org_id,
        auth_user_id: userRes.user.id,
        role_id: invite.role_id,
        location_ids: invite.location_ids ?? [],
        invited_by: invite.invited_by,
      })
      .select("id")
      .single();

    if (employeeError || !employee) {
      await admin.auth.admin.deleteUser(userRes.user.id);
      return new Response(JSON.stringify({ error: employeeError?.message ?? "Failed to create employee" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { error: profileError } = await admin.from("employee_profiles").insert({
      employee_id: employee.id,
      full_name: payload.fullName,
      personal_email: invite.email,
    });

    if (profileError) {
      return new Response(JSON.stringify({ error: profileError.message }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    await admin
      .from("employee_invites")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", invite.id);

    return new Response(JSON.stringify({ ok: true, email: invite.email }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Unexpected error", detail: error instanceof Error ? error.message : String(error) }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
