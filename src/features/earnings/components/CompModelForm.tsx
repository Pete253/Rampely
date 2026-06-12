import { useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CompModel } from "@/shared/lib/types";
import { parseBonusTiers, type BonusTier } from "../lib/earnings-utils";
import type { CompModelInput } from "../hooks/useCompModels";

interface Props {
  /** Current effective model, used to prefill. */
  current: CompModel | null;
  currencyLabel: string;
  onSubmit: (input: CompModelInput) => Promise<void>;
  onCancel: () => void;
}

interface TierDraft {
  threshold: string;
  bonus: string;
}

export function CompModelForm({ current, currencyLabel, onSubmit, onCancel }: Props) {
  const [baseSalary, setBaseSalary] = useState(String(current?.base_salary ?? 0));
  const [rate, setRate] = useState(String(current?.per_booking_rate ?? 0));
  const [tiers, setTiers] = useState<TierDraft[]>(
    parseBonusTiers(current?.bonus_tiers ?? []).map((t) => ({
      threshold: String(t.threshold),
      bonus: String(t.bonus),
    })),
  );
  const [submitting, setSubmitting] = useState(false);

  const updateTier = (i: number, patch: Partial<TierDraft>) => {
    setTiers((prev) => prev.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parsedTiers: BonusTier[] = [];
    for (const t of tiers) {
      const threshold = Number(t.threshold);
      const bonus = Number(t.bonus);
      if (Number.isFinite(threshold) && threshold > 0 && Number.isFinite(bonus) && bonus >= 0) {
        parsedTiers.push({ threshold, bonus });
      }
    }
    parsedTiers.sort((a, b) => a.threshold - b.threshold);

    setSubmitting(true);
    try {
      await onSubmit({
        base_salary: Math.max(0, Number(baseSalary) || 0),
        per_booking_rate: Math.max(0, Number(rate) || 0),
        bonus_tiers: parsedTiers,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label htmlFor="comp-base" className="text-xs font-semibold text-white/70">
            Base salary / month ({currencyLabel})
          </label>
          <Input
            id="comp-base"
            type="number"
            min={0}
            step="any"
            required
            value={baseSalary}
            onChange={(e) => setBaseSalary(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="comp-rate" className="text-xs font-semibold text-white/70">
            Per held booking ({currencyLabel})
          </label>
          <Input
            id="comp-rate"
            type="number"
            min={0}
            step="any"
            required
            value={rate}
            onChange={(e) => setRate(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold text-white/70">Monthly bonus tiers</div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => setTiers((prev) => [...prev, { threshold: "", bonus: "" }])}
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> Add tier
          </Button>
        </div>
        {tiers.length === 0 ? (
          <p className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
            No bonus tiers — commission only. Add a tier like "20 bookings → +2,500".
          </p>
        ) : (
          <div className="space-y-2">
            {tiers.map((t, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  placeholder="Bookings"
                  aria-label="Bookings threshold"
                  value={t.threshold}
                  onChange={(e) => updateTier(i, { threshold: e.target.value })}
                  className="w-28"
                />
                <span className="text-xs text-white/40">held bookings →</span>
                <Input
                  type="number"
                  min={0}
                  step="any"
                  placeholder="Bonus"
                  aria-label="Bonus amount"
                  value={t.bonus}
                  onChange={(e) => updateTier(i, { bonus: e.target.value })}
                  className="w-32"
                />
                <span className="text-xs text-white/40">{currencyLabel} bonus</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="ml-auto h-8 w-8 text-white/40 hover:text-danger"
                  aria-label="Remove tier"
                  onClick={() => setTiers((prev) => prev.filter((_, idx) => idx !== i))}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <p className="text-xs text-white/40">
              The highest reached tier pays — tiers are not cumulative.
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : "Save model"}
        </Button>
      </div>
    </form>
  );
}
