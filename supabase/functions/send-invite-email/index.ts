import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type InvitePayload = {
  email: string;
  token: string;
};

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const appUrl = Deno.env.get("APP_URL") ?? "http://localhost:5173";
const resendApiKey = Deno.env.get("RESEND_API_KEY");
const resendFrom = Deno.env.get("RESEND_FROM_EMAIL") ?? "TechWheels <onboarding@techwheels.local>";

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function htmlBody(args: { dealership: string; role: string; inviter: string; inviteLink: string; expiresAt: string }) {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #0f172a;">
      <h2 style="margin: 0 0 8px;">You are invited to ${args.dealership}</h2>
      <p style="margin: 0 0 12px;">${args.inviter} invited you to join as <strong>${args.role}</strong>.</p>
      <p style="margin: 0 0 14px;">Click below to accept your invite:</p>
      <p style="margin: 0 0 16px;"><a href="${args.inviteLink}" style="background:#2563EB;color:#fff;padding:10px 14px;border-radius:8px;text-decoration:none;">Accept Invite</a></p>
      <p style="margin: 0 0 6px;">Invite link:</p>
      <p style="margin: 0 0 16px;"><a href="${args.inviteLink}">${args.inviteLink}</a></p>
      <p style="margin: 0; color: #64748b;">Expires on ${new Date(args.expiresAt).toLocaleString()}.</p>
    </div>
  `;
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
    if (!payload?.email || !payload?.token) {
      return new Response(JSON.stringify({ error: "email and token are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { data: invite, error: inviteError } = await admin
      .from("employee_invites")
      .select("id, email, expires_at, accepted_at, org_id, role_id, orgs(name), org_roles(name), inviter:employees!employee_invites_invited_by_fkey(id)")
      .eq("token", payload.token)
      .maybeSingle();

    if (inviteError || !invite) {
      return new Response(JSON.stringify({ error: "Invite not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (invite.accepted_at) {
      return new Response(JSON.stringify({ error: "Invite already accepted" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (new Date(invite.expires_at).getTime() < Date.now()) {
      return new Response(JSON.stringify({ error: "Invite expired" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const inviteLink = `${appUrl.replace(/\/$/, "")}/accept-invite?token=${encodeURIComponent(payload.token)}`;
    const orgName = invite.orgs?.name ?? "your dealership";
    const roleName = invite.org_roles?.name ?? "Team Member";
    const inviterName = "Your administrator";

    const body = htmlBody({
      dealership: orgName,
      role: roleName,
      inviter: inviterName,
      inviteLink,
      expiresAt: invite.expires_at,
    });

    if (resendApiKey) {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: resendFrom,
          to: [payload.email],
          subject: `Invitation to join ${orgName}`,
          html: body,
        }),
      });

      if (!response.ok) {
        const detail = await response.text();
        return new Response(JSON.stringify({ error: "Email provider failed", detail, inviteLink }), {
          status: 502,
          headers: { "Content-Type": "application/json" },
        });
      }
    } else {
      console.log("send-invite-email: RESEND_API_KEY missing, email send skipped", {
        email: payload.email,
        inviteLink,
      });
    }

    return new Response(JSON.stringify({ ok: true, inviteLink }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Failed to process invite email", detail: error instanceof Error ? error.message : String(error) }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
