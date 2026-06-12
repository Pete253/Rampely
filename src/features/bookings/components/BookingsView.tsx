import { useMemo, useState } from "react";
import { CalendarCheck, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/shared/components/EmptyState";
import { useBookings, type BookingRecord } from "../hooks/useBookings";
import { bookingStatus, computeBookingStats } from "../lib/booking-utils";
import { BookingForm } from "./BookingForm";
import { BookingRow } from "./BookingRow";

export function BookingsView() {
  const { bookings, loading, error, refresh, create, setOutcome, reschedule, remove } =
    useBookings();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<BookingRecord | null>(null);

  const groups = useMemo(() => {
    const needsOutcome: BookingRecord[] = [];
    const upcoming: BookingRecord[] = [];
    const history: BookingRecord[] = [];
    for (const b of bookings) {
      const status = bookingStatus(b);
      if (status === "needs_outcome") needsOutcome.push(b);
      else if (status === "upcoming") upcoming.push(b);
      else history.push(b);
    }
    // Soonest first where action is pending; most recent first in history.
    needsOutcome.sort((a, b) => a.held_at.localeCompare(b.held_at));
    upcoming.sort((a, b) => a.held_at.localeCompare(b.held_at));
    return { needsOutcome, upcoming, history };
  }, [bookings]);

  const stats = useMemo(() => computeBookingStats(bookings), [bookings]);

  const rowProps = {
    onRegisterOutcome: setOutcome,
    onReschedule: setEditing,
    onDelete: remove,
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-[-0.03em]">Bookings</h1>
          <p className="text-sm text-muted-foreground">Booked meetings and their outcomes.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1 h-4 w-4" /> Log booking
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Booked this week" value={loading ? null : String(stats.bookedThisWeek)} />
        <StatCard
          label="Awaiting outcome"
          value={loading ? null : String(stats.awaitingOutcome)}
          highlight={stats.awaitingOutcome > 0}
        />
        <StatCard
          label="Held rate"
          value={
            loading ? null : stats.heldRate == null ? "—" : `${Math.round(stats.heldRate * 100)}%`
          }
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : error ? (
        <div className="space-y-3 rounded-lg border border-dashed border-danger/30 p-12 text-center">
          <p className="text-sm text-danger">Failed to load bookings: {error}</p>
          <Button size="sm" variant="outline" onClick={() => void refresh()}>
            Retry
          </Button>
        </div>
      ) : bookings.length === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          title="No bookings yet"
          description="Log your first booked meeting and register its outcome once it has happened."
          action={{ label: "Log your first booking", onClick: () => setCreateOpen(true) }}
        />
      ) : (
        <div className="space-y-5">
          {groups.needsOutcome.length > 0 && (
            <Section title="Needs outcome" count={groups.needsOutcome.length}>
              {groups.needsOutcome.map((b) => (
                <BookingRow key={b.id} booking={b} {...rowProps} />
              ))}
            </Section>
          )}
          {groups.upcoming.length > 0 && (
            <Section title="Upcoming" count={groups.upcoming.length}>
              {groups.upcoming.map((b) => (
                <BookingRow key={b.id} booking={b} {...rowProps} />
              ))}
            </Section>
          )}
          {groups.history.length > 0 && (
            <Section title="History" count={groups.history.length}>
              {groups.history.map((b) => (
                <BookingRow key={b.id} booking={b} {...rowProps} />
              ))}
            </Section>
          )}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log booking</DialogTitle>
          </DialogHeader>
          <BookingForm
            onSubmit={async (input) => {
              try {
                await create(input);
                toast.success("Booking logged");
                setCreateOpen(false);
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Failed to log booking");
              }
            }}
            onCancel={() => setCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule booking</DialogTitle>
          </DialogHeader>
          {editing && (
            <BookingForm
              editing={editing}
              onSubmit={async (input) => {
                try {
                  await reschedule(editing.id, input.held_at, input.notes);
                  toast.success("Booking updated");
                  setEditing(null);
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Failed to update booking");
                }
              }}
              onCancel={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | null;
  highlight?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="overline-label text-white/50">{label}</div>
        {value == null ? (
          <Skeleton className="mt-2 h-8 w-16" />
        ) : (
          <div
            className={`mt-1 text-2xl font-extrabold tracking-[-0.03em] ${highlight ? "text-warning" : ""}`}
          >
            {value}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <h2 className="overline-label text-white/50">{title}</h2>
        <span className="text-xs font-semibold text-white/40">{count}</span>
      </div>
      <div className="rounded-lg border bg-card">{children}</div>
    </div>
  );
}
