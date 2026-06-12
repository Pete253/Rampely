import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface DisplayProps {
  score: number;
  className?: string;
}

/** Read-only 1–5 quality score. */
export function QualityStars({ score, className }: DisplayProps) {
  return (
    <div className={cn("flex items-center gap-0.5", className)} title={`Quality ${score}/5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn("h-3 w-3", n <= score ? "fill-warning text-warning" : "text-white/20")}
        />
      ))}
    </div>
  );
}

interface PickerProps {
  value: number | null;
  onChange: (score: number | null) => void;
}

/** Interactive 1–5 picker; clicking the active star clears it. */
export function QualityStarsPicker({ value, onChange }: PickerProps) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`Quality ${n} of 5`}
          onClick={() => onChange(value === n ? null : n)}
          className="rounded-sm p-0.5 transition-transform hover:scale-110"
        >
          <Star
            className={cn(
              "h-5 w-5 transition-colors",
              value != null && n <= value
                ? "fill-warning text-warning"
                : "text-white/25 hover:text-white/50",
            )}
          />
        </button>
      ))}
    </div>
  );
}
