import { useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/shared/components/EmptyState";
import { useWorkspace } from "@/shared/hooks/useWorkspace";
import { useCountryFeatures } from "@/shared/hooks/useCountryFeatures";
import { useEarnings } from "../hooks/useEarnings";
import { makeMoneyFormatter } from "../lib/earnings-utils";

export function EarningsView() {
  const navigate = useNavigate();
  const { role } = useWorkspace();
  const { locale, currency } = useCountryFeatures();
  const { model, earnings, loading, error, refresh } = useEarnings();
  const money = makeMoneyFormatter(locale, currency);
  const isAdmin = role === "owner" || role === "admin";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-[-0.03em]">Earnings</h1>
          <p className="text-sm text-muted-foreground">
            Your pay this month, live from your bookings.
          </p>
        </div>
        <div className="overline-label text-white/50">{format(new Date(), "MMMM yyyy")}</div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : error ? (
        <div className="space-y-3 rounded-lg border border-dashed border-danger/30 p-12 text-center">
          <p className="text-sm text-danger">Failed to load earnings: {error}</p>
          <Button size="sm" variant="outline" onClick={() => void refresh()}>
            Retry
          </Button>
        </div>
      ) : !model || !earnings ? (
        <EmptyState
          icon={Wallet}
          title="No compensation model yet"
          description={
            isAdmin
              ? "Set a base salary, per-booking rate and bonus tiers to see live earnings."
              : "Ask a workspace admin to set up your compensation model in Settings."
          }
          action={
            isAdmin
              ? { label: "Set up compensation", onClick: () => void navigate({ to: "/settings" }) }
              : null
          }
        />
      ) : (
        <>
          {/* Headline cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <HeadlineCard
              label="Confirmed commission"
              value={money(earnings.confirmedCommission + earnings.confirmedBonus)}
              sub={`${earnings.heldCount} held booking${earnings.heldCount === 1 ? "" : "s"}`}
            />
            <HeadlineCard
              label="On the books"
              value={money(earnings.onBooksCommission + earnings.onBooksBonus)}
              sub={`${earnings.pendingCount} pending outcome${earnings.pendingCount === 1 ? "" : "s"}`}
            />
            <HeadlineCard
              label="Month-end forecast"
              value={money(earnings.forecastTotal)}
              sub={`incl. base · ${earnings.forecastCount} bookings at current pace`}
              emphasis
            />
          </div>

          {/* Bonus tier progress */}
          {earnings.tiers.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Bonus progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {earnings.next ? (
                  <>
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="text-sm text-white/75">
                        <span className="font-extrabold text-foreground">
                          {earnings.toNextTier}
                        </span>{" "}
                        more held booking{earnings.toNextTier === 1 ? "" : "s"} unlocks{" "}
                        <span className="font-bold text-primary-light">
                          +{money(earnings.next.bonus)}
                        </span>
                      </div>
                      <div className="text-xs text-white/40">
                        {earnings.heldCount} / {earnings.next.threshold}
                      </div>
                    </div>
                    <ProgressBar value={earnings.heldCount} max={earnings.next.threshold} />
                    {earnings.pendingCount > 0 && (
                      <p className="text-xs text-white/40">
                        {earnings.pendingCount} pending booking
                        {earnings.pendingCount === 1 ? "" : "s"} could get you there — register
                        outcomes as meetings happen.
                      </p>
                    )}
                  </>
                ) : (
                  <div className="text-sm font-semibold text-success">
                    Top tier reached — +{money(earnings.confirmedBonus)} bonus this month.
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Breakdown */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">This month's breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-white/7 text-sm">
                <BreakdownRow label="Base salary" value={money(earnings.baseSalary)} />
                <BreakdownRow
                  label={`Commission — ${earnings.heldCount} held × ${money(earnings.perBookingRate)}`}
                  value={money(earnings.confirmedCommission)}
                />
                {earnings.confirmedBonus > 0 && (
                  <BreakdownRow label="Bonus tier reached" value={money(earnings.confirmedBonus)} />
                )}
                <BreakdownRow
                  label={`Pending — ${earnings.pendingCount} booking${earnings.pendingCount === 1 ? "" : "s"} awaiting outcome`}
                  value={money(earnings.pendingCount * earnings.perBookingRate)}
                  muted
                />
                {earnings.lostCount > 0 && (
                  <BreakdownRow
                    label={`Lost to no-shows / cancellations`}
                    value={`${earnings.lostCount} booking${earnings.lostCount === 1 ? "" : "s"}`}
                    muted
                  />
                )}
                <div className="flex items-center justify-between py-3">
                  <div className="font-bold">Confirmed total</div>
                  <div className="text-base font-extrabold tracking-[-0.02em] text-primary-light">
                    {money(
                      earnings.baseSalary + earnings.confirmedCommission + earnings.confirmedBonus,
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function HeadlineCard({
  label,
  value,
  sub,
  emphasis,
}: {
  label: string;
  value: string;
  sub: string;
  emphasis?: boolean;
}) {
  return (
    <Card className={emphasis ? "border-primary/25 bg-primary/12" : undefined}>
      <CardContent className="p-4">
        <div className={`overline-label ${emphasis ? "text-primary-light" : "text-white/50"}`}>
          {label}
        </div>
        <div className="mt-1 text-2xl font-extrabold tracking-[-0.03em]">{value}</div>
        <div className="mt-0.5 text-xs text-white/40">{sub}</div>
      </CardContent>
    </Card>
  );
}

/** Forecast bar per the design system: 8px track, primary fill, 4px radius. */
function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
  return (
    <div className="h-2 w-full rounded-[4px] bg-white/7">
      <div
        className="h-full rounded-[4px] bg-primary transition-all duration-200"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function BreakdownRow({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className={muted ? "text-white/40" : "text-white/75"}>{label}</div>
      <div className={muted ? "font-semibold text-white/40" : "font-semibold"}>{value}</div>
    </div>
  );
}
