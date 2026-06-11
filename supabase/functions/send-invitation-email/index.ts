import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const LOGO_URL =
  "https://qkrofverymlqzyoncslu.supabase.co/storage/v1/object/public/brand-assets/rampely-mark.png";

function buildEmailHtml(opts: {
  workspaceName: string;
  inviterName: string;
  role: string;
  message?: string | null;
  acceptUrl: string;
  expiryDate: string;
  logoUrl: string;
  variant: "first" | "resend" | "reinvite";
  sentOnDate: string;
}): string {
  const { workspaceName, inviterName, role, message, acceptUrl, expiryDate, logoUrl, variant, sentOnDate } = opts;
  const messageBlock = message
    ? `<div style="margin:0 0 24px;padding:16px 20px;background:#f8fafc;border-left:3px solid #6366f1;border-radius:6px;color:#334155;font-size:14px;line-height:1.6;font-style:italic;">"${escapeHtml(message)}"</div>`
    : "";
  const pillBlock =
    variant === "resend"
      ? `<div style="display:inline-block;margin:0 0 12px;padding:4px 10px;background:#fef3c7;color:#92400e;border-radius:9999px;font-size:11px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;">Reminder</div>`
      : variant === "reinvite"
        ? `<div style="display:inline-block;margin:0 0 12px;padding:4px 10px;background:#dbeafe;color:#1e40af;border-radius:9999px;font-size:11px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;">Re-invitation</div>`
        : "";
  const heading =
    variant === "resend"
      ? `Reminder: your invitation to ${escapeHtml(workspaceName)}`
      : variant === "reinvite"
        ? `You've been re-invited to ${escapeHtml(workspaceName)}`
        : `You've been invited to ${escapeHtml(workspaceName)}`;
  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
            <tr>
              <td align="center" style="padding:32px 40px 8px;">
                <img src="${logoUrl}" alt="Rampely" width="48" height="48" style="display:block;margin:0 auto;border:0;outline:none;text-decoration:none;" />
              </td>
            </tr>
            <tr>
              <td style="padding:24px 40px 8px;">
                ${pillBlock}
                <h1 style="margin:0 0 16px;font-size:22px;font-weight:600;color:#0f172a;line-height:1.3;letter-spacing:-0.01em;">
                  ${heading}
                </h1>
                <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#475569;">
                  ${escapeHtml(inviterName)} has invited you to join <strong>${escapeHtml(workspaceName)}</strong> on Rampely as a <strong>${escapeHtml(role)}</strong>.
                </p>
                ${messageBlock}
                <div style="margin:0 0 32px;">
                  <a href="${acceptUrl}" style="display:inline-block;padding:12px 24px;background:#4759E8;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">
                    Accept invitation
                  </a>
                </div>
                <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#94a3b8;">
                  This invitation expires on ${escapeHtml(expiryDate)}. If you didn't expect this email, you can safely ignore it.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 40px 32px;border-top:1px solid #f1f5f9;margin-top:16px;">
                <p style="margin:16px 0 0;font-size:12px;color:#94a3b8;text-align:center;">
                  Sent by Rampely · ${escapeHtml(sentOnDate)}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") ?? "Rampely <noreply@rampely.com>";

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SERVICE_ROLE_KEY) {
      return json({ ok: false, error: "server_misconfigured" }, 500);
    }
    if (!RESEND_API_KEY) {
      return json({ ok: false, error: "resend_not_configured" }, 500);
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ ok: false, error: "missing_auth" }, 401);
    }

    // Validate caller via the user-scoped client (RLS-bound).
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return json({ ok: false, error: "invalid_token" }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const invitationId = body?.invitationId as string | undefined;
    const isResend: boolean = body?.isResend === true;
    if (!invitationId) {
      return json({ ok: false, error: "missing_invitation_id" }, 400);
    }

    // RLS will only return the invitation if the caller is a member; we further
    // require owner/admin via the policy on insert/update. SELECT is allowed for members.
    const { data: invitation, error: invErr } = await userClient
      .from("workspace_invitations")
      .select("id, workspace_id, email, role, token, message, expires_at, invited_by")
      .eq("id", invitationId)
      .maybeSingle();

    if (invErr || !invitation) {
      return json({ ok: false, error: "invitation_not_found" }, 404);
    }

    // Service-role client to look up workspace and inviter profile reliably.
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: workspace } = await adminClient
      .from("workspaces")
      .select("name")
      .eq("id", invitation.workspace_id)
      .single();

    const { data: inviterProfile } = await adminClient
      .from("profiles")
      .select("full_name, email")
      .eq("id", invitation.invited_by)
      .single();

    // Detect re-invite: any prior accepted invitation for this email + workspace
    const { data: priorAccepted } = await adminClient
      .from("workspace_invitations")
      .select("id")
      .eq("workspace_id", invitation.workspace_id)
      .ilike("email", invitation.email)
      .not("accepted_at", "is", null)
      .limit(1);
    const isReInvite = (priorAccepted?.length ?? 0) > 0;
    const variant: "first" | "resend" | "reinvite" = isReInvite
      ? "reinvite"
      : isResend
        ? "resend"
        : "first";

    // Verify caller is owner/admin in that workspace (defense-in-depth).
    const { data: callerMembership } = await userClient
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", invitation.workspace_id)
      .eq("user_id", userData.user.id)
      .maybeSingle();
    if (!callerMembership || !["owner", "admin"].includes(callerMembership.role)) {
      return json({ ok: false, error: "insufficient_privilege" }, 403);
    }

    const origin =
      req.headers.get("Origin") ??
      req.headers.get("Referer")?.replace(/\/$/, "").split("/").slice(0, 3).join("/") ??
      Deno.env.get("APP_ORIGIN") ??
      "https://app.lovable.dev";

    const acceptUrl = `${origin}/invite/${invitation.token}`;
    const expiryDate = new Date(invitation.expires_at).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const now = new Date();
    const sentOnDate = now.toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    });
    const workspaceName = workspace?.name ?? "a workspace";
    const inviterName = inviterProfile?.full_name ?? inviterProfile?.email ?? "A teammate";
    const subject =
      variant === "reinvite"
        ? `You've been re-invited to ${workspaceName} on Rampely`
        : variant === "resend"
          ? `Reminder: You've been invited to ${workspaceName} on Rampely`
          : `${inviterName} invited you to ${workspaceName} on Rampely`;
    const html = buildEmailHtml({
      workspaceName,
      inviterName,
      role: invitation.role,
      message: invitation.message,
      acceptUrl,
      expiryDate,
      logoUrl: LOGO_URL,
      variant,
      sentOnDate,
    });

    const messageId = `<${invitationId}-${now.getTime()}@rampely.com>`;
    console.log("[send-invitation-email] sending", {
      invitationId,
      to: invitation.email,
      from: FROM_EMAIL,
      isResend,
      isReInvite,
      variant,
      subject,
      messageId,
      htmlLength: html.length,
    });

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [invitation.email],
        subject,
        html,
        headers: {
          "Message-ID": messageId,
        },
      }),
    });

    const result = await resp.json().catch(() => ({}));
    console.log("[send-invitation-email] resend response", {
      status: resp.status,
      ok: resp.ok,
      body: result,
    });
    if (!resp.ok) {
      console.error("[send-invitation-email] resend failed", { status: resp.status, body: result });
      return json({ ok: false, error: result?.message ?? "resend_failed", detail: result }, 502);
    }

    if (isResend) {
      const { data: current } = await adminClient
        .from("workspace_invitations")
        .select("resend_count")
        .eq("id", invitationId)
        .maybeSingle();
      const next = (current?.resend_count ?? 0) + 1;
      await adminClient
        .from("workspace_invitations")
        .update({ resend_count: next })
        .eq("id", invitationId);
    }

    return json({ ok: true, messageId: result?.id ?? null });
  } catch (err) {
    console.error("[send-invitation-email] unhandled error", err);
    return json({ ok: false, error: (err as Error).message ?? "unknown_error" }, 500);
  }
});