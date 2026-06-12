import { useState } from "react";
import { Loader2, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  SCORE_PARAMS,
  contactNameOf,
  formatSeconds,
  isScorable,
  overallScore,
  scoreFor,
  scoreTone,
  transcriptSegments,
  type CallMetrics,
  type CallWithScores,
  type Layer3Parameters,
  type Layer4Parameters,
  type ParamScore,
} from "../lib/call-scoring";

interface Props {
  call: CallWithScores | null;
  onClose: () => void;
  onAnalyze: (callId: string, layer: 3 | 4) => Promise<void>;
}

export function CallDetailSheet({ call, onClose, onAnalyze }: Props) {
  const [running, setRunning] = useState<3 | 4 | null>(null);

  if (!call) return null;

  const layer3 = scoreFor(call, 3);
  const layer4 = scoreFor(call, 4);
  const params = (layer3?.parameters as unknown as Layer3Parameters | null) ?? null;
  const deep = (layer4?.parameters as unknown as Layer4Parameters | null) ?? null;
  const segments = transcriptSegments(call);
  const overall = overallScore(layer3);
  const inFlight = ["pending", "processing"].includes(call.transcript_status);

  const run = async (layer: 3 | 4) => {
    setRunning(layer);
    try {
      await onAnalyze(call.id, layer);
      toast.success(layer === 4 ? "Deep analysis ready" : "Call scored");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setRunning(null);
    }
  };

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2.5">
            {contactNameOf(call)}
            {overall !== null && <ScorePill value={overall} />}
          </SheetTitle>
          <SheetDescription>
            {new Date(call.created_at).toLocaleString()} · {call.to_number}
            {call.duration ? ` · ${formatSeconds(call.duration)}` : ""}
            {call.outcome ? ` · ${call.outcome}` : ""}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-4 pb-8">
          {/* Pipeline state / actions */}
          {inFlight ? (
            <div className="flex items-center gap-2 rounded-[10px] bg-white/5 p-3 text-sm text-white/60">
              <Loader2 className="h-4 w-4 animate-spin text-primary-light" />
              Transcribing and scoring this call — usually done within a few minutes.
            </div>
          ) : !layer3 && isScorable(call) ? (
            <div className="flex items-center justify-between gap-3 rounded-[10px] bg-white/5 p-3">
              <p className="text-sm text-white/60">
                {call.transcript_status === "failed"
                  ? "The last analysis attempt failed."
                  : "This call hasn't been scored yet."}
              </p>
              <Button size="sm" disabled={running !== null} onClick={() => void run(3)}>
                {running === 3 ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-1 h-4 w-4" />
                )}
                Score now
              </Button>
            </div>
          ) : !layer3 ? (
            <p className="rounded-[10px] bg-white/5 p-3 text-sm text-white/50">
              Only connected calls over 2 minutes with a recording are scored.
            </p>
          ) : null}

          {/* Summary + metrics */}
          {layer3?.summary && (
            <section className="space-y-2">
              <h3 className="overline-label text-white/50">Coach summary</h3>
              <p className="text-sm leading-relaxed text-white/80">{layer3.summary}</p>
            </section>
          )}
          {params?.metrics && <MetricsRow metrics={params.metrics} />}

          {/* Scorecard */}
          {params && Object.keys(params.scores).length > 0 && (
            <section className="space-y-3">
              <h3 className="overline-label text-white/50">Scorecard</h3>
              <div className="space-y-2.5">
                {SCORE_PARAMS.map(({ key, label }) => {
                  const p = params.scores[key];
                  if (!p) return null;
                  return <ScoreRow key={key} label={label} param={p} />;
                })}
              </div>
            </section>
          )}

          {/* Deep analysis (Layer 4) */}
          {deep ? (
            <DeepAnalysis deep={deep} summary={layer4?.summary ?? null} />
          ) : call.transcript_status === "done" ? (
            <section className="space-y-2">
              <h3 className="overline-label text-white/50">Deep analysis</h3>
              <div className="flex items-center justify-between gap-3 rounded-[10px] bg-white/5 p-3">
                <p className="text-sm text-white/60">
                  A senior-coach style review of this specific call: key moments, quotes and a
                  suggested opener for the follow-up.
                </p>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={running !== null}
                  onClick={() => void run(4)}
                >
                  {running === 4 ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <Wand2 className="mr-1 h-4 w-4" />
                  )}
                  Run
                </Button>
              </div>
            </section>
          ) : null}

          {/* Transcript */}
          {segments.length > 0 && (
            <section className="space-y-2">
              <h3 className="overline-label text-white/50">Transcript</h3>
              <div className="space-y-2.5 rounded-[10px] bg-white/[0.03] p-3">
                {segments.map((s, i) => (
                  <div key={i} className="flex gap-2.5 text-sm">
                    <span className="w-10 shrink-0 pt-0.5 text-[11px] tabular-nums text-white/30">
                      {formatSeconds(s.start)}
                    </span>
                    <div className="min-w-0">
                      <span
                        className={cn(
                          "mr-1.5 text-xs font-bold",
                          s.speaker === "rep" ? "text-primary-light" : "text-white/50",
                        )}
                      >
                        {s.speaker === "rep"
                          ? "You"
                          : s.speaker === "prospect"
                            ? "Prospect"
                            : "Speaker"}
                      </span>
                      <span className="leading-relaxed text-white/75">{s.text}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {call.notes && (
            <section className="space-y-2">
              <h3 className="overline-label text-white/50">Your notes</h3>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/70">
                {call.notes}
              </p>
            </section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function ScorePill({ value }: { value: number }) {
  const tone = scoreTone(value);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold tabular-nums",
        tone === "good" && "bg-success/15 text-success",
        tone === "ok" && "bg-warning/15 text-warning",
        tone === "low" && "bg-danger/15 text-danger",
      )}
    >
      {value.toFixed(1)}
    </span>
  );
}

function ScoreRow({ label, param }: { label: string; param: ParamScore }) {
  const tone = scoreTone(param.score);
  return (
    <div className="rounded-[10px] bg-white/5 p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-white/85">{label}</span>
        <div className="flex items-center gap-1" aria-label={`${param.score} of 5`}>
          {[1, 2, 3, 4, 5].map((n) => (
            <span
              key={n}
              className={cn(
                "h-1.5 w-4 rounded-full",
                n <= param.score
                  ? tone === "good"
                    ? "bg-success"
                    : tone === "ok"
                      ? "bg-warning"
                      : "bg-danger"
                  : "bg-white/10",
              )}
            />
          ))}
        </div>
      </div>
      {param.suggestion && (
        <p className="mt-1.5 text-xs leading-relaxed text-white/55">{param.suggestion}</p>
      )}
    </div>
  );
}

function MetricsRow({ metrics }: { metrics: CallMetrics }) {
  const items: { label: string; value: string }[] = [];
  if (metrics.talk_ratio_pct !== null)
    items.push({ label: "Your talk time", value: `${metrics.talk_ratio_pct}%` });
  if (metrics.questions_per_min !== null)
    items.push({ label: "Questions/min", value: String(metrics.questions_per_min) });
  if (metrics.longest_monologue_sec !== null)
    items.push({ label: "Longest monologue", value: formatSeconds(metrics.longest_monologue_sec) });
  if (metrics.words_per_min !== null)
    items.push({ label: "Pace", value: `${metrics.words_per_min} wpm` });
  if (metrics.fillers_per_min !== null)
    items.push({ label: "Fillers/min", value: String(metrics.fillers_per_min) });
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((it) => (
        <div key={it.label} className="rounded-[10px] bg-white/5 px-3 py-2">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-white/40">
            {it.label}
          </div>
          <div className="text-sm font-bold tabular-nums text-white/85">{it.value}</div>
        </div>
      ))}
    </div>
  );
}

function DeepAnalysis({ deep, summary }: { deep: Layer4Parameters; summary: string | null }) {
  return (
    <section className="space-y-3">
      <h3 className="overline-label text-white/50">Deep analysis</h3>
      {summary && <p className="text-sm leading-relaxed text-white/80">{summary}</p>}
      {(deep.strengths?.length ?? 0) > 0 && (
        <div className="rounded-[10px] bg-success/8 p-3">
          <div className="mb-1.5 text-xs font-bold text-success">What worked</div>
          <ul className="space-y-1 text-sm leading-relaxed text-white/75">
            {deep.strengths?.map((s, i) => (
              <li key={i}>· {s}</li>
            ))}
          </ul>
        </div>
      )}
      {(deep.focus_areas?.length ?? 0) > 0 && (
        <div className="rounded-[10px] bg-warning/8 p-3">
          <div className="mb-1.5 text-xs font-bold text-warning">Focus next</div>
          <ul className="space-y-1 text-sm leading-relaxed text-white/75">
            {deep.focus_areas?.map((s, i) => (
              <li key={i}>· {s}</li>
            ))}
          </ul>
        </div>
      )}
      {(deep.moments?.length ?? 0) > 0 && (
        <div className="space-y-2">
          {deep.moments?.map((m, i) => (
            <div key={i} className="rounded-[10px] bg-white/5 p-3">
              <div className="text-[11px] font-semibold tabular-nums text-white/40">{m.at}</div>
              <blockquote className="mt-1 border-l-2 border-primary/40 pl-2.5 text-sm italic text-white/70">
                “{m.quote}”
              </blockquote>
              <p className="mt-1.5 text-xs leading-relaxed text-white/55">{m.comment}</p>
            </div>
          ))}
        </div>
      )}
      {deep.next_call_opener && (
        <div className="rounded-[10px] border border-primary/25 bg-primary/10 p-3">
          <div className="mb-1 text-xs font-bold text-primary-light">Try this opener next time</div>
          <p className="text-sm leading-relaxed text-white/80">{deep.next_call_opener}</p>
        </div>
      )}
    </section>
  );
}
