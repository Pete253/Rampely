import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useTeamLeaderboard, type LeaderboardRow } from "../hooks/useTeamLeaderboard";
import { formatDKK } from "../lib/reporting-utils";

type SortKey =
  | "deals_won"
  | "won_value"
  | "calls_logged"
  | "meetings_booked"
  | "tasks_completed"
  | "activity_score";

const COLUMNS: { key: SortKey; label: string; format?: (n: number) => string }[] = [
  { key: "deals_won", label: "Deals Won" },
  { key: "won_value", label: "Won Value", format: formatDKK },
  { key: "calls_logged", label: "Calls" },
  { key: "meetings_booked", label: "Meetings" },
  { key: "tasks_completed", label: "Tasks" },
  { key: "activity_score", label: "Score", format: (n) => n.toFixed(1) },
];

const MEDALS = ["🥇", "🥈", "🥉"];

interface Props {
  from: Date;
  to: Date;
}

export function TeamLeaderboard({ from, to }: Props) {
  const { data, loading, error, refetch } = useTeamLeaderboard({ from, to });
  const [sortKey, setSortKey] = useState<SortKey>("won_value");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sorted = useMemo(() => {
    const copy = [...data];
    copy.sort((a, b) => {
      const av = a[sortKey] as number;
      const bv = b[sortKey] as number;
      return sortDir === "desc" ? bv - av : av - bv;
    });
    return copy;
  }, [data, sortKey, sortDir]);

  function toggleSort(k: SortKey) {
    if (k === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("desc");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Team Leaderboard</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-48 w-full" />
        ) : error ? (
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between gap-2">
              <span>Failed to load leaderboard</span>
              <Button size="sm" variant="outline" onClick={refetch}>
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        ) : sorted.length === 0 ? (
          <div className="text-sm text-muted-foreground py-8 text-center">No team data</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>User</TableHead>
                {COLUMNS.map((c) => (
                  <TableHead key={c.key} className="text-right">
                    <button
                      onClick={() => toggleSort(c.key)}
                      className={cn(
                        "inline-flex items-center gap-1 hover:text-foreground transition-colors",
                        sortKey === c.key && "text-foreground font-medium",
                      )}
                    >
                      {c.label}
                      {sortKey === c.key && (sortDir === "desc" ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />)}
                    </button>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((row: LeaderboardRow, idx: number) => (
                <TableRow key={row.user_id}>
                  <TableCell className="font-medium">
                    {idx < 3 ? <span className="text-lg">{MEDALS[idx]}</span> : idx + 1}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        {row.avatar_url && <AvatarImage src={row.avatar_url} />}
                        <AvatarFallback className="text-xs">
                          {(row.full_name ?? "U").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{row.full_name ?? "Unknown"}</span>
                    </div>
                  </TableCell>
                  {COLUMNS.map((c) => {
                    const v = row[c.key] as number;
                    return (
                      <TableCell key={c.key} className="text-right tabular-nums">
                        {c.format ? c.format(v) : v.toLocaleString("da-DK")}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
