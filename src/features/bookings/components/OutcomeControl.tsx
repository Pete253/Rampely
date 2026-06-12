import { useState } from "react";
import { toast } from "sonner";
import { Check, X, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { BookingOutcome } from "@/shared/lib/types";
import { QualityStarsPicker } from "./QualityStars";

interface Props {
  onRegister: (outcome: BookingOutcome, qualityScore?: number | null) => Promise<void>;
}

/**
 * One-click outcome registration for a pending booking.
 * "Held" opens a small quality-score step (optional, 1–5).
 */
export function OutcomeControl({ onRegister }: Props) {
  const [heldOpen, setHeldOpen] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const register = async (outcome: BookingOutcome, qualityScore?: number | null) => {
    setBusy(true);
    try {
      await onRegister(outcome, qualityScore);
      toast.success(
        outcome === "held"
          ? "Outcome registered: held"
          : outcome === "no_show"
            ? "Outcome registered: no-show"
            : "Booking cancelled",
      );
      setHeldOpen(false);
      setScore(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to register outcome");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <Popover open={heldOpen} onOpenChange={setHeldOpen}>
        <PopoverTrigger asChild>
          <Button
            size="sm"
            variant="secondary"
            disabled={busy}
            className="h-7 gap-1 px-2.5 text-success hover:bg-success/15"
          >
            <Check className="h-3.5 w-3.5" /> Held
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-60 space-y-3 p-4">
          <div>
            <div className="text-sm font-bold">How was the meeting?</div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Optional quality score — was it the right fit?
            </p>
          </div>
          <QualityStarsPicker value={score} onChange={setScore} />
          <Button
            size="sm"
            className="w-full"
            disabled={busy}
            onClick={() => void register("held", score)}
          >
            {score ? `Save · ${score}/5` : "Save without score"}
          </Button>
        </PopoverContent>
      </Popover>
      <Button
        size="sm"
        variant="secondary"
        disabled={busy}
        onClick={() => void register("no_show")}
        className="h-7 gap-1 px-2.5 text-danger hover:bg-danger/15"
      >
        <X className="h-3.5 w-3.5" /> No-show
      </Button>
      <Button
        size="sm"
        variant="secondary"
        disabled={busy}
        onClick={() => void register("cancelled")}
        className="h-7 gap-1 px-2.5 text-white/60 hover:bg-white/12"
      >
        <Ban className="h-3.5 w-3.5" /> Cancelled
      </Button>
    </div>
  );
}
