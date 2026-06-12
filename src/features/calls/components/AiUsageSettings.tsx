import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAiUsage } from "../hooks/useAiUsage";

const dkk = new Intl.NumberFormat("da-DK", {
  style: "currency",
  currency: "DKK",
  maximumFractionDigits: 2,
});

/**
 * Workspace AI spend dashboard + unit-economics cap (master build prompt
 * §5/2b): when the month's average cost per scored call exceeds the cap, the
 * pipeline stops transcribing and falls back to free metadata (Layer 1).
 */
export function AiUsageSettings() {
  const { stats, loading, capDkk, saveCap } = useAiUsage();
  const [cap, setCap] = useState(String(capDkk));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setCap(String(capDkk));
  }, [capDkk]);

  const capNumber = Number(cap.replace(",", "."));
  const capValid = Number.isFinite(capNumber) && capNumber > 0;
  const overCap =
    stats?.avgPerScoredCallDkk !== null && stats !== null && stats.avgPerScoredCallDkk > capDkk;

  async function handleSave() {
    if (!capValid) return;
    setSaving(true);
    try {
      await saveCap(Math.round(capNumber * 100) / 100);
      toast.success("Cost cap updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save cap");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>AI usage this month</CardTitle>
          <CardDescription>
            Transcription and call scoring costs for this workspace, logged per scored call.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading || !stats ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat label="Total spend" value={dkk.format(stats.monthSpendDkk)} />
              <Stat label="Scored calls" value={String(stats.scoredCalls)} />
              <Stat label="Deep analyses" value={String(stats.deepAnalyses)} />
              <Stat
                label="Avg / scored call"
                value={
                  stats.avgPerScoredCallDkk !== null ? dkk.format(stats.avgPerScoredCallDkk) : "—"
                }
                tone={overCap ? "danger" : undefined}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cost cap</CardTitle>
          <CardDescription>
            If the average AI cost per scored call goes above this cap, automatic transcription
            pauses for the rest of the month — calls still log duration and outcome as usual.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-xs space-y-2">
            <Label htmlFor="ai-cost-cap">Max average cost per scored call (DKK)</Label>
            <Input
              id="ai-cost-cap"
              inputMode="decimal"
              value={cap}
              onChange={(e) => setCap(e.target.value)}
            />
          </div>
          {overCap && (
            <p className="text-sm text-danger">
              The cap is currently exceeded — automatic scoring is paused this month.
            </p>
          )}
          <div className="flex justify-end">
            <Button
              onClick={() => void handleSave()}
              disabled={!capValid || saving || capNumber === capDkk}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "danger" }) {
  return (
    <div>
      <div
        className={
          tone === "danger"
            ? "text-xl font-extrabold tabular-nums tracking-[-0.02em] text-danger"
            : "text-xl font-extrabold tabular-nums tracking-[-0.02em]"
        }
      >
        {value}
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
