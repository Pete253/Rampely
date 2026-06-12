import { useState, type FormEvent } from "react";
import { addDays, format, set } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ContactSelector } from "@/features/pipeline/components/ContactSelector";
import { DealSelector } from "@/features/calendar/components/DealSelector";
import type { BookingRecord, CreateBookingInput } from "../hooks/useBookings";

function toLocalInput(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

/** Default meeting slot: tomorrow at 10:00. */
function defaultHeldAt(): string {
  return toLocalInput(set(addDays(new Date(), 1), { hours: 10, minutes: 0 }));
}

interface Props {
  /** Prefills for the selectors (e.g. from a deal or contact page). */
  initial?: { contact_id?: string | null; deal_id?: string | null };
  /** Lock the contact selector when booking from a contact record. */
  lockContact?: boolean;
  /** When set, the form edits time/notes of an existing booking (reschedule). */
  editing?: BookingRecord;
  onSubmit: (input: CreateBookingInput) => Promise<void>;
  onCancel: () => void;
}

export function BookingForm({ initial, lockContact, editing, onSubmit, onCancel }: Props) {
  const [contactId, setContactId] = useState<string | null>(
    editing?.contact_id ?? initial?.contact_id ?? null,
  );
  const [dealId, setDealId] = useState<string | null>(editing?.deal_id ?? initial?.deal_id ?? null);
  const [heldAt, setHeldAt] = useState(editing ? toLocalInput(editing.held_at) : defaultHeldAt());
  const [notes, setNotes] = useState(editing?.notes ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [contactError, setContactError] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!contactId) {
      setContactError(true);
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        contact_id: contactId,
        deal_id: dealId,
        held_at: new Date(heldAt).toISOString(),
        notes: notes.trim() || null,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-white/70">Contact *</label>
        <ContactSelector
          value={contactId}
          onChange={(id) => {
            setContactId(id);
            if (id) setContactError(false);
          }}
          disabled={!!editing || lockContact}
        />
        {contactError && <p className="text-xs text-danger">Pick a contact for the meeting.</p>}
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-white/70">Deal</label>
        <DealSelector value={dealId} onChange={setDealId} disabled={!!editing} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="booking-held-at" className="text-xs font-semibold text-white/70">
          When *
        </label>
        <Input
          id="booking-held-at"
          type="datetime-local"
          required
          value={heldAt}
          onChange={(e) => setHeldAt(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="booking-notes" className="text-xs font-semibold text-white/70">
          Notes
        </label>
        <Textarea
          id="booking-notes"
          placeholder="Agenda, context, what to prepare…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting
            ? editing
              ? "Saving…"
              : "Logging…"
            : editing
              ? "Save changes"
              : "Log booking"}
        </Button>
      </div>
    </form>
  );
}
