// Status + recording webhook for Twilio calls. Idempotent: status updates
// never downgrade a call's lifecycle stage, and replaying any event yields
// the same row state. Public endpoint guarded by X-Twilio-Signature.
// Secrets: TWILIO_AUTH_TOKEN; uses the service role to bypass RLS.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

async function twilioSignature(url: string, params: Record<string, string>, authToken: string) {
  let data = url;
  for (const key of Object.keys(params).sort()) data += key + params[key];
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(authToken),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
  let bin = "";
  for (const b of sig) bin += String.fromCharCode(b);
  return btoa(bin);
}

async function validateTwilioRequest(
  req: Request,
  params: Record<string, string>,
  authToken: string,
): Promise<boolean> {
  const signature = req.headers.get("X-Twilio-Signature");
  if (!signature) return false;
  const candidates = [req.url, req.url.replace(/^http:/, "https:")];
  for (const url of candidates) {
    if ((await twilioSignature(url, params, authToken)) === signature) return true;
  }
  return false;
}

// Lifecycle rank — a webhook may arrive out of order; never move backwards.
const STATUS_RANK: Record<string, number> = {
  queued: 0,
  initiated: 0,
  ringing: 1,
  "in-progress": 2,
  completed: 3,
  busy: 3,
  failed: 3,
  "no-answer": 3,
  canceled: 3,
};

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  if (!authToken) {
    console.error("twilio-status: TWILIO_AUTH_TOKEN not configured");
    return new Response("Not configured", { status: 500 });
  }

  const form = await req.formData();
  const params: Record<string, string> = {};
  for (const [k, v] of form.entries()) {
    if (typeof v === "string") params[k] = v;
  }

  if (!(await validateTwilioRequest(req, params, authToken))) {
    console.error("twilio-status: invalid Twilio signature");
    return new Response("Forbidden", { status: 403 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // The browser leg's CallSid is stored on the row. Child-leg callbacks
  // carry it as ParentCallSid; recording callbacks carry it as CallSid.
  const sids = [params["ParentCallSid"], params["CallSid"]].filter((s): s is string => !!s);
  if (sids.length === 0) return new Response("OK");

  let row: { id: string; status: string } | null = null;
  for (const sid of sids) {
    const { data } = await supabase
      .from("calls")
      .select("id, status")
      .eq("twilio_call_sid", sid)
      .maybeSingle();
    if (data) {
      row = data;
      break;
    }
  }
  if (!row) {
    // Unknown call (e.g. row not created yet) — ack so Twilio doesn't retry forever.
    console.warn("twilio-status: no call row for", sids.join(", "));
    return new Response("OK");
  }

  const patch: Record<string, unknown> = {};

  if (params["RecordingUrl"]) {
    patch.recording_url = params["RecordingUrl"];
  }

  const status = params["CallStatus"];
  if (status && STATUS_RANK[status] !== undefined) {
    const currentRank = STATUS_RANK[row.status] ?? 0;
    if (STATUS_RANK[status] >= currentRank) {
      patch.status = status;
    }
  }

  const duration = Number(params["CallDuration"]);
  if (status === "completed" && Number.isFinite(duration)) {
    patch.duration = duration;
  }

  if (Object.keys(patch).length > 0) {
    const { error } = await supabase.from("calls").update(patch).eq("id", row.id);
    if (error) {
      console.error("twilio-status: update failed", error);
      return new Response("Update failed", { status: 500 });
    }
  }

  return new Response("OK");
});
