import type { Call, CallScore } from "@/shared/lib/types";

/** One of the 10 scored parameters (Layer 3). */
export interface ParamScore {
  score: number;
  suggestion: string;
}

/** Deterministic metrics computed by the pipeline (Layer 1+). */
export interface CallMetrics {
  talk_ratio_pct: number | null;
  questions_per_min: number | null;
  longest_monologue_sec: number | null;
  fillers_per_min: number | null;
  words_per_min: number | null;
  ring_seconds: number | null;
}

export interface Layer3Parameters {
  scores: Record<string, ParamScore>;
  metrics?: CallMetrics;
}

export interface DeepMoment {
  at: string;
  quote: string;
  comment: string;
}

export interface Layer4Parameters {
  strengths?: string[];
  focus_areas?: string[];
  moments?: DeepMoment[];
  next_call_opener?: string;
}

export interface TranscriptSegment {
  speaker: "rep" | "prospect" | "mixed";
  start: number;
  end: number;
  text: string;
}

export type CallWithScores = Call & {
  call_scores: CallScore[];
  contact: { id: string; first_name: string; last_name: string | null } | null;
};

/** Display metadata for the 10 scored parameters, in scorecard order. */
export const SCORE_PARAMS: { key: string; label: string }[] = [
  { key: "talk_ratio", label: "Talk ratio" },
  { key: "question_rate", label: "Question rate" },
  { key: "longest_monologue", label: "Longest monologue" },
  { key: "filler_words", label: "Filler words" },
  { key: "pace", label: "Speaking pace" },
  { key: "opening_structure", label: "Opening & agenda" },
  { key: "discovery_depth", label: "Discovery depth" },
  { key: "objection_handling", label: "Objection handling" },
  { key: "next_step_clarity", label: "Next-step clarity" },
  { key: "tone_energy", label: "Tone & energy" },
];

export function scoreFor(call: CallWithScores, layer: number): CallScore | null {
  return call.call_scores.find((s) => s.layer === layer) ?? null;
}

/** Average of the 10 parameter scores, one decimal — null until scored. */
export function overallScore(score: CallScore | null): number | null {
  if (!score) return null;
  const params = (score.parameters as unknown as Layer3Parameters | null)?.scores ?? {};
  const values = Object.values(params)
    .map((p) => p.score)
    .filter((n) => Number.isFinite(n));
  if (values.length === 0) return null;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

export function scoreTone(score: number): "good" | "ok" | "low" {
  if (score >= 4) return "good";
  if (score >= 3) return "ok";
  return "low";
}

export function transcriptSegments(call: Call): TranscriptSegment[] {
  const data = call.transcript_json as { segments?: TranscriptSegment[] } | null;
  return data?.segments ?? [];
}

export function contactNameOf(call: CallWithScores): string {
  if (!call.contact) return call.to_number;
  return `${call.contact.first_name} ${call.contact.last_name ?? ""}`.trim();
}

export function formatSeconds(total: number): string {
  const m = Math.floor(total / 60);
  const s = Math.round(total % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Whether the pipeline can still produce a score for this call. */
export function isScorable(call: CallWithScores): boolean {
  return (
    !!call.recording_url &&
    (call.duration ?? 0) >= 120 &&
    call.outcome !== "No Answer" &&
    !scoreFor(call, 3)
  );
}

export const TRANSCRIPT_STATUS_LABEL: Record<string, string | null> = {
  none: null,
  pending: "Queued",
  processing: "Analyzing…",
  done: null,
  failed: "Analysis failed",
  skipped: "Skipped",
};
