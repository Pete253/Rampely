import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useBookings, type BookingRecord } from "../hooks/useBookings";
import { BookingForm } from "./BookingForm";
import { BookingRow } from "./BookingRow";

interface Props {
  dealId?: string;
  contactId?: string;
  /** Prefill the contact selector when logging from a deal with a known contact. */
  defaultContactId?: string | null;
}

/** Bookings list + quick log for a deal or contact record page. */
export function EntityBookingsTab({ dealId, contactId, defaultContactId }: Props) {
  const { bookings, loading, error, create, setOutcome, reschedule, remove } = useBookings({
    dealId,
    contactId,
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<BookingRecord | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1 h-4 w-4" /> Log booking
        </Button>
      </div>

      {loading ? (
        <Skeleton className="h-32 w-full" />
      ) : error ? (
        <p className="rounded-md border border-dashed border-danger/30 p-8 text-center text-sm text-danger">
          Failed to load bookings: {error}
        </p>
      ) : bookings.length === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          No bookings on this record yet. Log a booked meeting to track its outcome.
        </p>
      ) : (
        <div className="rounded-md border bg-card">
          {bookings.map((b) => (
            <BookingRow
              key={b.id}
              booking={b}
              onRegisterOutcome={setOutcome}
              onReschedule={setEditing}
              onDelete={remove}
              showLinks={false}
            />
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log booking</DialogTitle>
          </DialogHeader>
          <BookingForm
            initial={{ contact_id: contactId ?? defaultContactId, deal_id: dealId }}
            lockContact={!!contactId}
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
