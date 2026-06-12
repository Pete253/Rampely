import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/shared/lib/supabase";
import { useAuth } from "@/shared/hooks/useAuth";
import { useWorkspace } from "@/shared/hooks/useWorkspace";
import type { Booking, BookingOutcome } from "@/shared/lib/types";

export interface BookingOwner {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export interface BookingRecord extends Booking {
  contact: { id: string; first_name: string; last_name: string | null } | null;
  deal: { id: string; title: string } | null;
  owner: BookingOwner | null;
}

export interface CreateBookingInput {
  contact_id: string;
  deal_id?: string | null;
  held_at: string; // ISO timestamp
  notes?: string | null;
}

export interface BookingFilters {
  dealId?: string;
  contactId?: string;
}

const SELECT = "*, contact:contacts(id, first_name, last_name), deal:deals(id, title)";

// booked_by references auth.users (no FK to profiles), so owners are
// hydrated separately — same pattern as deal owners in useDeals.
const PROFILE_CACHE = new Map<string, BookingOwner>();

async function hydrateOwners(rows: BookingRecord[]): Promise<BookingRecord[]> {
  const missing = Array.from(
    new Set(rows.map((r) => r.booked_by).filter((id) => !PROFILE_CACHE.has(id))),
  );
  if (missing.length > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", missing);
    for (const p of data ?? []) PROFILE_CACHE.set(p.id, p);
  }
  return rows.map((r) => ({ ...r, owner: PROFILE_CACHE.get(r.booked_by) ?? null }));
}

export function useBookings({ dealId, contactId }: BookingFilters = {}) {
  const { user } = useAuth();
  const { workspace } = useWorkspace();
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!workspace) return;
    setLoading(true);
    setError(null);
    let q = supabase
      .from("bookings")
      .select(SELECT)
      .eq("workspace_id", workspace.id)
      .order("held_at", { ascending: false });
    if (dealId) q = q.eq("deal_id", dealId);
    if (contactId) q = q.eq("contact_id", contactId);

    const { data, error: err } = await q;
    if (err) {
      console.error("Failed to load bookings", err);
      setError(err.message);
      setBookings([]);
    } else {
      const rows = await hydrateOwners((data ?? []) as unknown as BookingRecord[]);
      setBookings(rows);
    }
    setLoading(false);
  }, [workspace, dealId, contactId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const create = useCallback(
    async (input: CreateBookingInput) => {
      if (!workspace || !user) throw new Error("Not ready");
      const { error: err } = await supabase.from("bookings").insert({
        workspace_id: workspace.id,
        contact_id: input.contact_id,
        deal_id: input.deal_id ?? null,
        held_at: input.held_at,
        notes: input.notes ?? null,
        booked_by: user.id,
      });
      if (err) throw err;
      await refresh();
    },
    [workspace, user, refresh],
  );

  const setOutcome = useCallback(
    async (id: string, outcome: BookingOutcome, qualityScore?: number | null) => {
      const { error: err } = await supabase
        .from("bookings")
        .update({ outcome, quality_score: outcome === "held" ? (qualityScore ?? null) : null })
        .eq("id", id);
      if (err) throw err;
      await refresh();
    },
    [refresh],
  );

  /** Move a pending booking to a new time (clears nothing — outcome stays pending). */
  const reschedule = useCallback(
    async (id: string, heldAt: string, notes?: string | null) => {
      const patch: { held_at: string; notes?: string | null } = { held_at: heldAt };
      if (notes !== undefined) patch.notes = notes;
      const { error: err } = await supabase.from("bookings").update(patch).eq("id", id);
      if (err) throw err;
      await refresh();
    },
    [refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      const { error: err } = await supabase.from("bookings").delete().eq("id", id);
      if (err) throw err;
      await refresh();
    },
    [refresh],
  );

  return { bookings, loading, error, refresh, create, setOutcome, reschedule, remove };
}
