import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Check, FileText } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { DealDetailData } from "../hooks/useDeal";
import type { Deal } from "@/shared/lib/types";

interface Props {
  deal: DealDetailData;
  onUpdate: (patch: Partial<Deal>) => Promise<void>;
}

function SavedHint({ visible }: { visible: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[11px] text-emerald-600 transition-opacity",
        visible ? "opacity-100" : "opacity-0",
      )}
    >
      <Check className="h-3 w-3" />
      Saved
    </span>
  );
}

export function DealDetailsCard({ deal, onUpdate }: Props) {
  const [value, setValue] = useState(String(deal.value ?? 0));
  const [currency, setCurrency] = useState(deal.currency ?? "DKK");
  const [description, setDescription] = useState(deal.description ?? "");
  const [date, setDate] = useState<Date | undefined>(
    deal.expected_close_date ? new Date(deal.expected_close_date) : undefined,
  );
  const [savedField, setSavedField] = useState<string | null>(null);
  const savedTimer = useRef<number | null>(null);

  useEffect(() => {
    setValue(String(deal.value ?? 0));
    setCurrency(deal.currency ?? "DKK");
    setDescription(deal.description ?? "");
    setDate(deal.expected_close_date ? new Date(deal.expected_close_date) : undefined);
  }, [deal.id, deal.value, deal.currency, deal.description, deal.expected_close_date]);

  function flashSaved(field: string) {
    setSavedField(field);
    if (savedTimer.current) window.clearTimeout(savedTimer.current);
    savedTimer.current = window.setTimeout(() => setSavedField(null), 1500);
  }

  async function persist(field: string, patch: Partial<Deal>) {
    try {
      await onUpdate(patch);
      flashSaved(field);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <FileText className="h-4 w-4 text-muted-foreground" />
          Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2 space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">Value</label>
              <SavedHint visible={savedField === "value"} />
            </div>
            <Input
              type="number"
              min={0}
              step={1000}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onBlur={() => {
                const num = Number(value);
                if (!Number.isFinite(num) || num === Number(deal.value ?? 0)) return;
                void persist("value", { value: num });
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              }}
            />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">Currency</label>
              <SavedHint visible={savedField === "currency"} />
            </div>
            <Input
              value={currency}
              maxLength={6}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              onBlur={() => {
                if (currency && currency !== deal.currency) {
                  void persist("currency", { currency });
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              }}
            />
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-muted-foreground">Expected close</label>
            <SavedHint visible={savedField === "expected_close_date"} />
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "w-full justify-start font-normal",
                  !date && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => {
                  setDate(d);
                  const iso = d ? d.toISOString().slice(0, 10) : null;
                  if (iso !== deal.expected_close_date) {
                    void persist("expected_close_date", { expected_close_date: iso });
                  }
                }}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          {date && (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-1 text-xs text-muted-foreground"
                onClick={() => {
                  setDate(undefined);
                  void persist("expected_close_date", { expected_close_date: null });
                }}
              >
                Clear date
              </Button>
              <Link
                to="/calendar"
                search={{
                  view: "day",
                  date: date.toISOString().slice(0, 10),
                }}
                className="text-[11px] text-primary hover:underline"
              >
                View on calendar →
              </Link>
            </div>
          )}
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-muted-foreground">Description</label>
            <SavedHint visible={savedField === "description"} />
          </div>
          <Textarea
            rows={4}
            value={description}
            placeholder="Notes about this deal…"
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => {
              if (description !== (deal.description ?? "")) {
                void persist("description", { description: description || null });
              }
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
