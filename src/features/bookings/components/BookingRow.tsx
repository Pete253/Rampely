import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { format, formatDistanceToNow } from "date-fns";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import type { BookingOutcome } from "@/shared/lib/types";
import type { BookingRecord } from "../hooks/useBookings";
import { bookingStatus, STATUS_META } from "../lib/booking-utils";
import { OutcomeControl } from "./OutcomeControl";
import { QualityStars } from "./QualityStars";

interface Props {
  booking: BookingRecord;
  onRegisterOutcome: (
    id: string,
    outcome: BookingOutcome,
    qualityScore?: number | null,
  ) => Promise<void>;
  onReschedule: (booking: BookingRecord) => void;
  onDelete: (id: string) => Promise<void>;
  /** Hide contact/deal links when rendered inside that record's page. */
  showLinks?: boolean;
}

export function BookingRow({
  booking,
  onRegisterOutcome,
  onReschedule,
  onDelete,
  showLinks = true,
}: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const status = bookingStatus(booking);
  const meta = STATUS_META[status];
  const pending = !booking.outcome;
  const heldAt = new Date(booking.held_at);

  const contactName = booking.contact
    ? `${booking.contact.first_name} ${booking.contact.last_name ?? ""}`.trim()
    : "Unknown contact";
  const ownerInitials =
    booking.owner?.full_name
      ?.split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ?? "?";

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b px-4 py-3 last:border-b-0">
      {/* When */}
      <div className="w-40 shrink-0">
        <div className="text-[13px] font-bold text-foreground">
          {format(heldAt, "EEE d MMM, HH:mm")}
        </div>
        <div className="text-[11px] text-white/40">
          {formatDistanceToNow(heldAt, { addSuffix: true })}
        </div>
      </div>

      {/* Who / what */}
      <div className="min-w-0 flex-1">
        {showLinks && booking.contact ? (
          <Link
            to="/contacts/$id"
            params={{ id: booking.contact.id }}
            className="block truncate text-[13px] font-semibold text-foreground hover:underline"
          >
            {contactName}
          </Link>
        ) : (
          <div className="truncate text-[13px] font-semibold text-foreground">{contactName}</div>
        )}
        {booking.deal &&
          (showLinks ? (
            <Link
              to="/deals/$id"
              params={{ id: booking.deal.id }}
              className="block truncate text-xs text-blue-3 hover:underline"
            >
              {booking.deal.title}
            </Link>
          ) : (
            <div className="truncate text-xs text-white/40">{booking.deal.title}</div>
          ))}
        {booking.notes && <div className="truncate text-xs text-white/40">{booking.notes}</div>}
      </div>

      {/* Status / outcome */}
      <div className="flex items-center gap-3">
        {pending ? (
          status === "needs_outcome" ? (
            <OutcomeControl onRegister={(o, q) => onRegisterOutcome(booking.id, o, q)} />
          ) : (
            <span
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-[11px] font-bold",
                meta.badgeClass,
              )}
            >
              {meta.label}
            </span>
          )
        ) : (
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-[11px] font-bold",
                meta.badgeClass,
              )}
            >
              {meta.label}
            </span>
            {booking.outcome === "held" && booking.quality_score != null && (
              <QualityStars score={booking.quality_score} />
            )}
          </div>
        )}

        <Avatar className="h-6 w-6" title={booking.owner?.full_name ?? undefined}>
          {booking.owner?.avatar_url && <AvatarImage src={booking.owner.avatar_url} />}
          <AvatarFallback className="bg-primary text-[10px] font-bold text-primary-foreground">
            {ownerInitials}
          </AvatarFallback>
        </Avatar>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {pending && (
              <DropdownMenuItem onSelect={() => onReschedule(booking)}>
                <Pencil className="mr-2 h-3.5 w-3.5" /> Reschedule / edit
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => setConfirmOpen(true)}
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this booking?</AlertDialogTitle>
            <AlertDialogDescription>
              The booking with {contactName} on {format(heldAt, "d MMM, HH:mm")} will be removed.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                void onDelete(booking.id)
                  .then(() => toast.success("Booking deleted"))
                  .catch((e) =>
                    toast.error(e instanceof Error ? e.message : "Failed to delete booking"),
                  );
                setConfirmOpen(false);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
