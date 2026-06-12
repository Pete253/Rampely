import { useMemo, useState } from "react";
import { Loader2, PhoneCall, PhoneMissed, PhoneOutgoing } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/shared/hooks/useWorkspace";
import { useCalls } from "../hooks/useCalls";
import {
  TRANSCRIPT_STATUS_LABEL,
  contactNameOf,
  formatSeconds,
  overallScore,
  scoreFor,
  type CallWithScores,
} from "../lib/call-scoring";
import { CallDetailSheet, ScorePill } from "./CallDetailSheet";

export function CallsView() {
  const { role } = useWorkspace();
  const isAdmin = role === "owner" || role === "admin";
  const [scope, setScope] = useState<"mine" | "all">("mine");
  const { calls, loading, error, analyze } = useCalls(scope);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = calls.find((c) => c.id === selectedId) ?? null;

  const stats = useMemo(() => {
    const connected = calls.filter((c) => (c.duration ?? 0) >= 120);
    const scored = calls
      .map((c) => overallScore(scoreFor(c, 3)))
      .filter((n): n is number => n !== null);
    return {
      total: calls.length,
      connected: connected.length,
      avgScore:
        scored.length > 0
          ? Math.round((scored.reduce((a, b) => a + b, 0) / scored.length) * 10) / 10
          : null,
    };
  }, [calls]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-[-0.03em]">Calls</h1>
          <p className="text-sm text-muted-foreground">
            Every call you make is logged, transcribed and scored with concrete coaching.
          </p>
        </div>
        {isAdmin && (
          <Tabs value={scope} onValueChange={(v) => setScope(v as "mine" | "all")}>
            <TabsList>
              <TabsTrigger value="mine">My calls</TabsTrigger>
              <TabsTrigger value="all">Team</TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={PhoneOutgoing} label="Recent calls" value={String(stats.total)} />
        <StatCard icon={PhoneCall} label="Connected > 2 min" value={String(stats.connected)} />
        <StatCard
          icon={PhoneMissed}
          label="Avg score"
          value={stats.avgScore !== null ? stats.avgScore.toFixed(1) : "—"}
        />
      </div>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : error ? (
        <p className="rounded-md border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
          Failed to load calls: {error}
        </p>
      ) : calls.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <PhoneCall className="mx-auto h-8 w-8 text-white/20" />
          <p className="mt-3 text-sm font-semibold text-white/70">No calls yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Hit the phone icon on any contact or deal to start calling. Connected calls over 2
            minutes are transcribed and scored automatically.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-white/6 rounded-lg border bg-card">
          {calls.map((call) => (
            <CallRow key={call.id} call={call} onClick={() => setSelectedId(call.id)} />
          ))}
        </div>
      )}

      <CallDetailSheet call={selected} onClose={() => setSelectedId(null)} onAnalyze={analyze} />
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof PhoneCall;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15">
          <Icon className="h-4 w-4 text-primary-light" />
        </div>
        <div>
          <div className="text-xl font-extrabold tabular-nums tracking-[-0.02em]">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function CallRow({ call, onClick }: { call: CallWithScores; onClick: () => void }) {
  const score = overallScore(scoreFor(call, 3));
  const inFlight = ["pending", "processing"].includes(call.transcript_status);
  const statusLabel = TRANSCRIPT_STATUS_LABEL[call.transcript_status];
  const when = new Date(call.created_at);

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-4 p-3.5 text-left transition-colors hover:bg-white/[0.03]"
    >
      <div className="hidden w-24 shrink-0 sm:block">
        <div className="text-sm font-semibold tabular-nums text-white/80">
          {when.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
        <div className="text-xs text-muted-foreground">{when.toLocaleDateString()}</div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{contactNameOf(call)}</div>
        <div className="truncate text-xs text-muted-foreground">{call.to_number}</div>
      </div>
      <div className="hidden w-16 shrink-0 text-sm tabular-nums text-white/60 md:block">
        {call.duration ? formatSeconds(call.duration) : "—"}
      </div>
      <div className="hidden shrink-0 sm:block">
        {call.outcome && <Badge variant="secondary">{call.outcome}</Badge>}
      </div>
      <div className="flex w-24 shrink-0 items-center justify-end">
        {score !== null ? (
          <ScorePill value={score} />
        ) : inFlight ? (
          <span className="flex items-center gap-1.5 text-xs text-white/45">
            <Loader2 className="h-3 w-3 animate-spin" /> {statusLabel}
          </span>
        ) : (
          <span
            className={cn(
              "text-xs",
              call.transcript_status === "failed" ? "text-danger" : "text-white/30",
            )}
          >
            {statusLabel ?? "—"}
          </span>
        )}
      </div>
    </button>
  );
}
