// TwiML endpoint for outbound calls from the browser softphone.
// Configured as the Voice URL of the TwiML App (TWILIO_TWIML_APP_SID).
// Public endpoint — authenticity is enforced via X-Twilio-Signature.
// Secrets: TWILIO_AUTH_TOKEN (signature validation), TWILIO_CALLER_ID.

function xml(body: string, status = 200) {
  return new Response(body, { status, headers: { "Content-Type": "text/xml" } });
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

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

export async function validateTwilioRequest(
  req: Request,
  params: Record<string, string>,
  authToken: string,
): Promise<boolean> {
  const signature = req.headers.get("X-Twilio-Signature");
  if (!signature) return false;
  // Edge runtime may report http internally; Twilio always signs the https URL.
  const candidates = [req.url, req.url.replace(/^http:/, "https:")];
  for (const url of candidates) {
    if ((await twilioSignature(url, params, authToken)) === signature) return true;
  }
  return false;
}

const E164 = /^\+[1-9]\d{5,14}$/;

Deno.serve(async (req) => {
  if (req.method !== "POST") return xml("<Response/>", 405);

  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const callerId = Deno.env.get("TWILIO_CALLER_ID");
  if (!authToken || !callerId) {
    console.error("twilio-voice: TWILIO_AUTH_TOKEN / TWILIO_CALLER_ID not configured");
    return xml("<Response><Say>Dialer is not configured.</Say></Response>");
  }

  const form = await req.formData();
  const params: Record<string, string> = {};
  for (const [k, v] of form.entries()) {
    if (typeof v === "string") params[k] = v;
  }

  if (!(await validateTwilioRequest(req, params, authToken))) {
    console.error("twilio-voice: invalid Twilio signature");
    return new Response("Forbidden", { status: 403 });
  }

  const to = params["To"] ?? "";
  if (!E164.test(to)) {
    return xml("<Response><Say>Invalid destination number.</Say></Response>");
  }

  const record = params["Record"] === "true";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const statusUrl = `${supabaseUrl}/functions/v1/twilio-status`;

  // Dual-channel recording from answer when the rep enabled it (consent mode
  // is enforced in the app UI per country-features.recordingConsentMode).
  const recordAttrs = record
    ? ` record="record-from-answer-dual" recordingStatusCallback="${escapeXml(statusUrl)}" recordingStatusCallbackEvent="completed"`
    : "";

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial callerId="${escapeXml(callerId)}" answerOnBridge="true"${recordAttrs}>
    <Number statusCallback="${escapeXml(statusUrl)}" statusCallbackEvent="initiated ringing answered completed">${escapeXml(to)}</Number>
  </Dial>
</Response>`;

  return xml(twiml);
});
