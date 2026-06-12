// Call intelligence pipeline (Phase 2b) — transcription + AI call scoring.
//
// Four layers with explicit cost gates (master build prompt §5/2b):
//   Layer 1 (free):  metadata already on the calls row — no AI involved.
//   Layer 2:         Whisper transcription. Gate: > 2 min, connected, ≤ 25 min
//                    (Whisper's 25 MB file limit at 8 kHz mono PCM).
//   Layer 3 (batch): Claude Haiku scores 10 parameters from the transcript +
//                    deterministic metrics computed here. Stored in call_scores.
//   Layer 4 (user):  deep analysis of a single call with a larger model.
//
// Unit-economics gate: when the workspace's average cost per scored call this
// month exceeds workspaces.ai_cost_cap_dkk, the automatic pipeline falls back
// to Layer 1 (skips). User-initiated Layer 4 is exempt — it is an explicit
// per-call decision and shows up in the spend dashboard either way.
//
// Invoked by: twilio-status (service role, fire-and-forget on recording
// completed) and the app ("Score now" / "Deep analysis", user JWT).
// Secrets: OPENAI_API_KEY, ANTHROPIC_API_KEY, TWILIO_ACCOUNT_SID,
// TWILIO_AUTH_TOKEN (recording download).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

const MIN_SCORE_SECONDS = 120; // doc gate: only calls > 2 min
const MAX_TRANSCRIBE_SECONDS = 1500; // 25 min ≈ Whisper's 25 MB limit per channel
const SCORING_MODEL = "claude-haiku-4-5-20251001";
const DEEP_MODEL = "claude-sonnet-4-6";
// Unit-economics bookkeeping only (not invoicing) — a fixed rate keeps the
// numbers comparable month over month.
const USD_TO_DKK = 7.0;
const WHISPER_USD_PER_MINUTE = 0.006;
// USD per million tokens.
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  [SCORING_MODEL]: { input: 1, output: 5 },
  [DEEP_MODEL]: { input: 3, output: 15 },
};

interface Segment {
  speaker: "rep" | "prospect" | "mixed";
  start: number;
  end: number;
  text: string;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

/** Role claim of the (platform-verified) JWT — distinguishes service vs user. */
function jwtRole(authHeader: string): string | null {
  try {
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const payload = JSON.parse(atob(token.split(".")[1].replaceAll("-", "+").replaceAll("_", "/")));
    return typeof payload.role === "string" ? payload.role : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// WAV handling — Twilio dual-channel recordings are 8 kHz RIFF/WAV with the
// rep (parent leg) on channel 0 and the prospect on channel 1. The edge
// runtime has no ffmpeg, but de-interleaving PCM is trivial, and that gives
// Whisper one clean mono file per speaker — perfect attribution without a
// diarization model.
// ---------------------------------------------------------------------------

function mulawToPcm16(u: number): number {
  u = ~u & 0xff;
  const sign = u & 0x80;
  const exponent = (u >> 4) & 0x07;
  const mantissa = u & 0x0f;
  let sample = (((mantissa << 3) + 0x84) << exponent) - 0x84;
  if (sign) sample = -sample;
  return Math.max(-32768, Math.min(32767, sample));
}

function splitWavChannels(buf: ArrayBuffer): { sampleRate: number; channels: Int16Array[] } {
  const view = new DataView(buf);
  if (buf.byteLength < 44 || view.getUint32(0, false) !== 0x52494646 /* RIFF */) {
    throw new Error("Not a RIFF/WAV file");
  }
  let offset = 12;
  let format = 0;
  let numChannels = 0;
  let sampleRate = 8000;
  let bitsPerSample = 16;
  let dataOffset = -1;
  let dataSize = 0;
  while (offset + 8 <= buf.byteLength) {
    const id = view.getUint32(offset, false);
    const size = view.getUint32(offset + 4, true);
    if (id === 0x666d7420 /* fmt  */) {
      format = view.getUint16(offset + 8, true);
      numChannels = view.getUint16(offset + 10, true);
      sampleRate = view.getUint32(offset + 12, true);
      bitsPerSample = view.getUint16(offset + 22, true);
    } else if (id === 0x64617461 /* data */) {
      dataOffset = offset + 8;
      dataSize = Math.min(size, buf.byteLength - dataOffset);
    }
    offset += 8 + size + (size % 2);
  }
  if (dataOffset < 0 || numChannels < 1) throw new Error("Malformed WAV file");

  const channels: Int16Array[] = [];
  if (format === 1 && bitsPerSample === 16) {
    const frames = Math.floor(dataSize / (2 * numChannels));
    for (let c = 0; c < numChannels; c++) channels.push(new Int16Array(frames));
    for (let f = 0; f < frames; f++) {
      for (let c = 0; c < numChannels; c++) {
        channels[c][f] = view.getInt16(dataOffset + (f * numChannels + c) * 2, true);
      }
    }
  } else if (format === 7 && bitsPerSample === 8) {
    // μ-law — Twilio serves some recordings this way.
    const frames = Math.floor(dataSize / numChannels);
    for (let c = 0; c < numChannels; c++) channels.push(new Int16Array(frames));
    for (let f = 0; f < frames; f++) {
      for (let c = 0; c < numChannels; c++) {
        channels[c][f] = mulawToPcm16(view.getUint8(dataOffset + f * numChannels + c));
      }
    }
  } else {
    throw new Error(`Unsupported WAV encoding (format ${format}, ${bitsPerSample}-bit)`);
  }
  return { sampleRate, channels };
}

function monoWav(samples: Int16Array, sampleRate: number): Uint8Array {
  const dataSize = samples.length * 2;
  const out = new ArrayBuffer(44 + dataSize);
  const view = new DataView(out);
  const writeStr = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);
  new Int16Array(out, 44).set(samples);
  return new Uint8Array(out);
}

// ---------------------------------------------------------------------------
// Transcription (Layer 2)
// ---------------------------------------------------------------------------

interface WhisperResult {
  language?: string;
  segments?: { start: number; end: number; text: string }[];
}

async function whisper(wav: Uint8Array, apiKey: string): Promise<WhisperResult> {
  const form = new FormData();
  form.append("file", new Blob([wav.buffer as ArrayBuffer], { type: "audio/wav" }), "audio.wav");
  form.append("model", "whisper-1");
  form.append("response_format", "verbose_json");
  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  if (!res.ok) {
    throw new Error(`Whisper failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
  }
  return await res.json();
}

async function transcribeRecording(
  recordingUrl: string,
): Promise<{ language: string | null; segments: Segment[]; whisperMinutes: number }> {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!accountSid || !authToken) throw new Error("Twilio credentials not configured");
  if (!openaiKey) throw new Error("OPENAI_API_KEY not configured");

  const res = await fetch(`${recordingUrl}.wav`, {
    headers: { Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}` },
  });
  if (!res.ok) throw new Error(`Recording download failed (${res.status})`);
  const { sampleRate, channels } = splitWavChannels(await res.arrayBuffer());

  const speakerFor = (idx: number): Segment["speaker"] =>
    channels.length < 2 ? "mixed" : idx === 0 ? "rep" : "prospect";

  const results = await Promise.all(
    channels.map((ch) => whisper(monoWav(ch, sampleRate), openaiKey)),
  );

  const segments: Segment[] = [];
  results.forEach((r, idx) => {
    for (const s of r.segments ?? []) {
      const text = s.text.trim();
      if (text) segments.push({ speaker: speakerFor(idx), start: s.start, end: s.end, text });
    }
  });
  segments.sort((a, b) => a.start - b.start);

  const audioMinutes = channels.length * (channels[0].length / sampleRate / 60);
  return { language: results[0]?.language ?? null, segments, whisperMinutes: audioMinutes };
}

function transcriptText(segments: Segment[]): string {
  const label = { rep: "Rep", prospect: "Prospect", mixed: "Speaker" } as const;
  return segments
    .map((s) => {
      const m = Math.floor(s.start / 60);
      const sec = Math.floor(s.start % 60);
      return `[${m}:${String(sec).padStart(2, "0")}] ${label[s.speaker]}: ${s.text}`;
    })
    .join("\n");
}

// ---------------------------------------------------------------------------
// Deterministic metrics — computed in code so the model grades against ground
// truth instead of estimating numbers from text.
// ---------------------------------------------------------------------------

const FILLER_WORDS = [
  "øh",
  "øhm",
  "hmm",
  "altså",
  "ligesom",
  "um",
  "uh",
  "erm",
  "you know",
  "i mean",
];

function computeMetrics(segments: Segment[], ringSeconds: number | null) {
  const rep = segments.filter((s) => s.speaker === "rep");
  const prospect = segments.filter((s) => s.speaker === "prospect");
  const talkSec = (list: Segment[]) => list.reduce((sum, s) => sum + (s.end - s.start), 0);
  const repSec = talkSec(rep);
  const prospectSec = talkSec(prospect);
  const repMin = repSec / 60;
  const repText = rep.map((s) => s.text).join(" ");
  const repWords = repText.split(/\s+/).filter(Boolean).length;

  let fillerCount = 0;
  const lower = repText.toLowerCase();
  for (const f of FILLER_WORDS) {
    fillerCount += lower.split(f).length - 1;
  }

  // Longest stretch of rep speech without the prospect getting a word in.
  let longestMonologueSec: number | null = null;
  if (rep.length > 0 && prospect.length > 0) {
    let runStart: number | null = null;
    let runEnd = 0;
    longestMonologueSec = 0;
    for (const s of segments) {
      if (s.speaker === "rep") {
        if (runStart === null) runStart = s.start;
        runEnd = s.end;
      } else if (runStart !== null) {
        longestMonologueSec = Math.max(longestMonologueSec, runEnd - runStart);
        runStart = null;
      }
    }
    if (runStart !== null) longestMonologueSec = Math.max(longestMonologueSec, runEnd - runStart);
    longestMonologueSec = Math.round(longestMonologueSec);
  }

  const round1 = (n: number) => Math.round(n * 10) / 10;
  return {
    talk_ratio_pct:
      repSec + prospectSec > 0 ? Math.round((repSec / (repSec + prospectSec)) * 100) : null,
    questions_per_min: repMin > 0.5 ? round1((repText.match(/\?/g)?.length ?? 0) / repMin) : null,
    longest_monologue_sec: longestMonologueSec,
    fillers_per_min: repMin > 0.5 ? round1(fillerCount / repMin) : null,
    words_per_min: repMin > 0.5 ? Math.round(repWords / repMin) : null,
    ring_seconds: ringSeconds,
  };
}

// ---------------------------------------------------------------------------
// Scoring (Layers 3 + 4) via the Anthropic API
// ---------------------------------------------------------------------------

const SCORE_PARAMS = [
  "talk_ratio",
  "question_rate",
  "longest_monologue",
  "filler_words",
  "pace",
  "opening_structure",
  "discovery_depth",
  "objection_handling",
  "next_step_clarity",
  "tone_energy",
] as const;

interface ClaudeResult {
  parsed: Record<string, unknown>;
  promptTokens: number;
  completionTokens: number;
  costDkk: number;
}

async function askClaude(model: string, system: string, prompt: string): Promise<ClaudeResult> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 3000,
      system,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) {
    throw new Error(`Anthropic API failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
  }
  const data = await res.json();
  const text: string = (data.content ?? [])
    .filter((b: { type: string }) => b.type === "text")
    .map((b: { text: string }) => b.text)
    .join("");

  // The prompts demand bare JSON; tolerate stray prose or code fences anyway.
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Model returned no JSON object");
  const parsed = JSON.parse(text.slice(start, end + 1));

  const pricing = MODEL_PRICING[model] ?? { input: 3, output: 15 };
  const promptTokens: number = data.usage?.input_tokens ?? 0;
  const completionTokens: number = data.usage?.output_tokens ?? 0;
  const costDkk =
    ((promptTokens / 1e6) * pricing.input + (completionTokens / 1e6) * pricing.output) * USD_TO_DKK;
  return { parsed, promptTokens, completionTokens, costDkk };
}

function scoringPrompt(
  transcript: string,
  metrics: ReturnType<typeof computeMetrics>,
  durationSec: number,
  outcome: string | null,
): { system: string; prompt: string } {
  const system =
    "You are an experienced B2B sales coach reviewing a cold/sales call by a sales rep " +
    '(labelled "Rep") talking to a prospect (labelled "Prospect"). You give honest, ' +
    "specific, encouraging feedback. Respond with a single JSON object and nothing else. " +
    "Write all suggestions and the summary in the same language as the call.";
  const prompt = `Score this sales call on exactly these 10 parameters:
${SCORE_PARAMS.map((p) => `- ${p}`).join("\n")}

For each parameter give an integer score 1-5 (5 = excellent) and ONE concrete,
actionable improvement suggestion (1-2 sentences, referencing what actually
happened on the call). Also write a 2-3 sentence overall summary.

Pre-computed metrics (ground truth — use them for the quantitative parameters):
${JSON.stringify({ ...metrics, duration_sec: durationSec, outcome }, null, 2)}

Respond with JSON of this exact shape:
{"summary": "...", "parameters": {${SCORE_PARAMS.map((p) => `"${p}": {"score": 1, "suggestion": "..."}`).join(", ")}}}

Transcript:
${transcript}`;
  return { system, prompt };
}

function deepPrompt(
  transcript: string,
  outcome: string | null,
): { system: string; prompt: string } {
  const system =
    "You are a senior sales coach doing a deep one-on-one call review with a sales rep " +
    '(labelled "Rep"). Be specific and quote the call. Respond with a single JSON object ' +
    "and nothing else, in the same language as the call.";
  const prompt = `Do a deep coaching analysis of this call (rep-registered outcome: ${outcome ?? "none"}).

Respond with JSON of this exact shape:
{
  "summary": "3-4 sentence overall assessment",
  "strengths": ["2-3 specific things that worked, with why"],
  "focus_areas": ["1-2 highest-leverage things to improve"],
  "moments": [{"at": "m:ss", "quote": "short verbatim quote", "comment": "what happened and what to do instead"}],
  "next_call_opener": "a suggested opening line for the follow-up call"
}
Include 2-4 moments — the turning points of the call.

Transcript:
${transcript}`;
  return { system, prompt };
}

// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ ok: false, error: "Missing authorization" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  let callId: string | undefined;
  let layer = 3;
  let durationHint = 0;
  try {
    const body = await req.json();
    callId = typeof body?.callId === "string" ? body.callId : undefined;
    if (body?.layer === 4) layer = 4;
    if (typeof body?.durationHint === "number") durationHint = body.durationHint;
  } catch {
    // fallthrough — validated below
  }
  if (!callId) return json({ ok: false, error: "callId required" }, 400);

  const { data: call, error: callErr } = await admin
    .from("calls")
    .select(
      "id, workspace_id, user_id, status, outcome, duration, recording_url, transcript_json, transcript_status, answered_at, created_at",
    )
    .eq("id", callId)
    .maybeSingle();
  if (callErr || !call) return json({ ok: false, error: "Call not found" }, 404);

  // Service-role calls (twilio-status) are trusted; user calls must be the rep
  // on the call or a workspace owner/admin — mirrors the call_scores RLS.
  const isService = jwtRole(authHeader) === "service_role";
  if (!isService) {
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user) return json({ ok: false, error: "Unauthorized" }, 401);
    const { data: membership } = await userClient
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", call.workspace_id)
      .eq("user_id", user.id)
      .maybeSingle();
    const isAdmin = membership?.role === "owner" || membership?.role === "admin";
    if (!membership || (call.user_id !== user.id && !isAdmin)) {
      return json({ ok: false, error: "Not allowed" }, 403);
    }
  }

  if (!Deno.env.get("OPENAI_API_KEY") || !Deno.env.get("ANTHROPIC_API_KEY")) {
    return json({ ok: false, code: "not_configured", error: "AI keys are not configured" });
  }

  // The recording webhook can beat the final status callback that writes
  // calls.duration — the recording's own duration stands in until then.
  const duration = call.duration ?? durationHint;
  if (!call.recording_url) {
    return json({ ok: false, code: "no_recording", error: "Call has no recording" });
  }
  if (duration > MAX_TRANSCRIBE_SECONDS) {
    await admin.from("calls").update({ transcript_status: "skipped" }).eq("id", call.id);
    return json({ ok: false, code: "too_long", error: "Call exceeds 25 minutes" });
  }

  if (layer === 3) {
    // Layer 2/3 gates — connected for > 2 min (the doc's cost gate).
    if (duration < MIN_SCORE_SECONDS || call.outcome === "No Answer") {
      return json({ ok: false, code: "below_gate", error: "Call below the 2-minute scoring gate" });
    }

    // Unit-economics gate: month-to-date average cost per scored call vs cap.
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const [{ data: monthScores }, { data: ws }] = await Promise.all([
      admin
        .from("call_scores")
        .select("cost_dkk")
        .eq("workspace_id", call.workspace_id)
        .eq("layer", 3)
        .gte("created_at", monthStart.toISOString()),
      admin.from("workspaces").select("ai_cost_cap_dkk").eq("id", call.workspace_id).single(),
    ]);
    const scores = monthScores ?? [];
    if (scores.length > 0 && ws) {
      const avg = scores.reduce((s, r) => s + Number(r.cost_dkk), 0) / scores.length;
      if (avg > Number(ws.ai_cost_cap_dkk)) {
        await admin.from("calls").update({ transcript_status: "skipped" }).eq("id", call.id);
        return json({ ok: false, code: "cost_cap", error: "Workspace AI cost cap reached" });
      }
    }
  }

  try {
    // Layer 2 — transcribe unless a transcript already exists.
    let segments = (call.transcript_json as { segments?: Segment[] } | null)?.segments ?? null;
    let whisperCostDkk = 0;
    if (!segments || call.transcript_status !== "done") {
      // Concurrency lock: only one invocation moves a call into processing.
      const { data: locked } = await admin
        .from("calls")
        .update({ transcript_status: "processing" })
        .eq("id", call.id)
        .in("transcript_status", ["none", "pending", "failed", "skipped"])
        .select("id");
      if (!locked || locked.length === 0) {
        return json({ ok: true, code: "already_processing" });
      }

      const result = await transcribeRecording(call.recording_url);
      segments = result.segments;
      whisperCostDkk = result.whisperMinutes * WHISPER_USD_PER_MINUTE * USD_TO_DKK;
      await admin
        .from("calls")
        .update({
          transcript: transcriptText(segments),
          transcript_json: { language: result.language, segments },
          transcript_status: "done",
        })
        .eq("id", call.id);
    }

    const ringSeconds = call.answered_at
      ? Math.max(
          0,
          Math.round(
            (new Date(call.answered_at).getTime() - new Date(call.created_at).getTime()) / 1000,
          ),
        )
      : null;
    const metrics = computeMetrics(segments, ringSeconds);
    const text = transcriptText(segments);

    // Layer 3 or 4 — ask the model, upsert the score row (idempotent re-runs).
    const { system, prompt } =
      layer === 4
        ? deepPrompt(text, call.outcome)
        : scoringPrompt(text, metrics, duration, call.outcome);
    const result = await askClaude(layer === 4 ? DEEP_MODEL : SCORING_MODEL, system, prompt);

    const parameters =
      layer === 4
        ? { ...result.parsed, summary: undefined }
        : { scores: result.parsed.parameters ?? {}, metrics };
    const summary = typeof result.parsed.summary === "string" ? result.parsed.summary : null;

    const { error: upsertErr } = await admin.from("call_scores").upsert(
      {
        workspace_id: call.workspace_id,
        call_id: call.id,
        user_id: call.user_id,
        layer,
        parameters,
        summary,
        model: layer === 4 ? DEEP_MODEL : SCORING_MODEL,
        prompt_tokens: result.promptTokens,
        completion_tokens: result.completionTokens,
        cost_dkk: Math.round((result.costDkk + whisperCostDkk) * 10000) / 10000,
      },
      { onConflict: "call_id,layer" },
    );
    if (upsertErr) throw new Error(`Failed to store score: ${upsertErr.message}`);

    return json({ ok: true, layer, scored: true });
  } catch (e) {
    console.error("call-intelligence failed for", call.id, e);
    await admin.from("calls").update({ transcript_status: "failed" }).eq("id", call.id);
    return json({ ok: false, error: e instanceof Error ? e.message : "Processing failed" }, 500);
  }
});
