import { useState } from "react";
import { ChevronDown, ChevronRight, History } from "lucide-react";
import { differenceInCalendarDays, format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDealStageHistory } from "../hooks/useDealStageHistory";

interface Props {
  dealId: string;
}

export function DealStageHistory({ dealId }: Props) {
  const [open, setOpen] = useState(false);
  const { entries, loading } = useDealStageHistory(dealId);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            Stage history
            {!loading && entries.length > 0 && (
              <span className="text-xs font-normal text-muted-foreground">
                ({entries.length} stage{entries.length === 1 ? "" : "s"})
              </span>
            )}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            {open ? "Hide" : "Show"}
          </Button>
        </CardTitle>
      </CardHeader>
      {open && (
        <CardContent>
          {loading ? (
            <Skeleton className="h-16 w-full" />
          ) : entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No stage history yet.</p>
          ) : (
            <div className="overflow-x-auto pb-2">
              <ol className="flex min-w-max items-start gap-0">
                {entries.map((e, i) => {
                  const start = new Date(e.entered_at);
                  const end = e.exited_at ? new Date(e.exited_at) : new Date();
                  const days = Math.max(0, differenceInCalendarDays(end, start));
                  const isLast = i === entries.length - 1;
                  return (
                    <li key={e.id} className="flex items-start">
                      <div className="flex w-32 flex-col items-center text-center">
                        <div
                          className="h-3 w-3 rounded-full ring-4 ring-background"
                          style={{ backgroundColor: e.stage?.color ?? "var(--muted)" }}
                        />
                        <div className="mt-2 text-xs font-medium">{e.stage?.name ?? "Unknown"}</div>
                        <div className="mt-0.5 text-[11px] text-muted-foreground">
                          {days}d {!e.exited_at && "(current)"}
                        </div>
                        <div className="mt-0.5 text-[10px] text-muted-foreground">
                          {format(start, "MMM d")}
                        </div>
                      </div>
                      {!isLast && (
                        <div className="mt-1.5 h-0.5 w-12 bg-border" aria-hidden="true" />
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
