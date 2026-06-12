// Mints a Twilio Voice access token for the browser softphone.
// Requires Supabase secrets: TWILIO_ACCOUNT_SID, TWILIO_API_KEY_SID,
// TWILIO_API_KEY_SECRET, TWILIO_TWIML_APP_SID (and TWILIO_CALLER_ID used by
// the twilio-voice TwiML function). Auth: Supabase JWT + workspace membership.
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

function b64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

async function signJwtHS256(
  header: Record<string, unknown>,
  payload: Record<string, unknown>,
  secret: string,
): Promise<string> {
  const enc = new TextEncoder();
  const head = b64url(enc.encode(JSON.stringify(header)));
  const body = b64url(enc.encode(JSON.stringify(payload)));
  const data = `${head}.${body}`;
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
  return `${data}.${b64url(sig)}`;
}

const TOKEN_TTL_SECONDS = 3600;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ ok: false, error: "Missing authorization" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return json({ ok: false, error: "Unauthorized" }, 401);
  }

  let workspaceId: string | undefined;
  try {
    const body = await req.json();
    workspaceId = typeof body?.workspaceId === "string" ? body.workspaceId : undefined;
  } catch {
    // fallthrough — validated below
  }
  if (!workspaceId) return json({ ok: false, error: "workspaceId required" }, 400);

  // Membership check with the caller's own RLS context.
  const { data: membership, error: memberError } = await supabase
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (memberError || !membership) {
    return json({ ok: false, error: "Not a member of this workspace" }, 403);
  }

  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const apiKeySid = Deno.env.get("TWILIO_API_KEY_SID");
  const apiKeySecret = Deno.env.get("TWILIO_API_KEY_SECRET");
  const twimlAppSid = Deno.env.get("TWILIO_TWIML_APP_SID");

  if (!accountSid || !apiKeySid || !apiKeySecret || !twimlAppSid) {
    // 200 + code so the client can show a friendly setup notice.
    return json({ ok: false, code: "not_configured", error: "Twilio is not configured" });
  }

  // Twilio identities allow alphanumerics and underscores.
  const identity = `user_${user.id.replaceAll("-", "_")}`;
  const now = Math.floor(Date.now() / 1000);

  const token = await signJwtHS256(
    { typ: "JWT", alg: "HS256", cty: "twilio-fpa;v=1" },
    {
      jti: `${apiKeySid}-${now}`,
      iss: apiKeySid,
      sub: accountSid,
      iat: now,
      exp: now + TOKEN_TTL_SECONDS,
      grants: {
        identity,
        voice: {
          outgoing: { application_sid: twimlAppSid },
          incoming: { allow: false },
        },
      },
    },
    apiKeySecret,
  );

  return json({ ok: true, token, identity, ttl: TOKEN_TTL_SECONDS });
});
