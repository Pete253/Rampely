import { useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { RANGE_PRESETS, type RangePreset } from "../lib/reporting-utils";

interface Props {
  preset: RangePreset;
  customFrom?: string;
  customTo?: string;
  onChange: (next: { preset: RangePreset; from?: string; to?: string }) => void;
}

export function DateRangeSelector({ preset, customFrom, customTo, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<{ from?: Date; to?: Date }>({
    from: customFrom ? new Date(customFrom) : undefined,
    to: customTo ? new Date(customTo) : undefined,
  });

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {RANGE_PRESETS.filter((p) => p.value !== "custom").map((p) => (
        <Button
          key={p.value}
          size="sm"
          variant={preset === p.value ? "default" : "ghost"}
          onClick={() => onChange({ preset: p.value })}
          className="h-8"
        >
          {p.label}
        </Button>
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            size="sm"
            variant={preset === "custom" ? "default" : "ghost"}
            className={cn("h-8 gap-1.5")}
          >
            <CalendarIcon className="h-3.5 w-3.5" />
            {preset === "custom" && customFrom && customTo
              ? `${format(new Date(customFrom), "dd MMM")} – ${format(new Date(customTo), "dd MMM")}`
              : "Custom"}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-auto p-3">
          <Calendar
            mode="range"
            selected={range as { from: Date; to?: Date }}
            onSelect={(r) => {
              setRange({ from: r?.from, to: r?.to });
              if (r?.from && r?.to) {
                onChange({
                  preset: "custom",
                  from: r.from.toISOString(),
                  to: r.to.toISOString(),
                });
                setOpen(false);
              }
            }}
            numberOfMonths={2}
            weekStartsOn={1}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
