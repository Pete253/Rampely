import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/shared/hooks/useWorkspace";
import { formatDKK } from "../lib/reporting-utils";
import { format } from "date-fns";

export type DrillDown =
  | { kind: "deals"; stageId: string; stageName: string }
  | { kind: "activities"; type: string; from: string; to: string };

interface Props {
  drilldown: DrillDown;
  onClear: () => void;
}

export function DrillDownList({ drilldown, onClear }: Props) {
  const { workspace } = useWorkspace();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    if (!workspace) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      if (drilldown.kind === "deals") {
        const { data } = await supabase
          .from("deals")
          .select("id, title, value, status, updated_at, company_id, companies(name)")
          .eq("workspace_id", workspace.id)
          .eq("stage_id", drilldown.stageId)
          .order("value", { ascending: false })
          .limit(100);
        if (!cancelled) setRows(data ?? []);
      } else {
        const { data } = await supabase
          .from("activities")
          .select("id, type, subject, body, created_at, deal_id, contact_id, company_id")
          .eq("workspace_id", workspace.id)
          .eq("type", drilldown.type as "call" | "email" | "meeting" | "note" | "task")
          .gte("created_at", drilldown.from)
          .lt("created_at", drilldown.to)
          .order("created_at", { ascending: false })
          .limit(100);
        if (!cancelled) setRows(data ?? []);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [workspace, drilldown]);

  const filterLabel =
    drilldown.kind === "deals"
      ? `Stage: ${drilldown.stageName}`
      : `Activity type: ${drilldown.type}`;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <CardTitle className="text-base">Drill-down</CardTitle>
          <Badge variant="secondary" className="gap-1.5">
            {filterLabel}
            <button onClick={onClear} aria-label="Clear filter">
              <X className="h-3 w-3" />
            </button>
          </Badge>
        </div>
        <Button size="sm" variant="ghost" onClick={onClear}>
          Clear
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-32 w-full" />
        ) : rows.length === 0 ? (
          <div className="text-sm text-muted-foreground py-8 text-center">No matching records</div>
        ) : drilldown.kind === "deals" ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Company</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const company = (r.companies as { name?: string } | null)?.name;
                return (
                  <TableRow key={String(r.id)}>
                    <TableCell>
                      <Link
                        to="/deals/$id"
                        params={{ id: String(r.id) }}
                        className="font-medium hover:underline"
                      >
                        {String(r.title)}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{company ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatDKK(Number(r.value ?? 0))}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{String(r.status)}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={String(r.id)}>
                  <TableCell>
                    <Badge variant="outline">{String(r.type)}</Badge>
                  </TableCell>
                  <TableCell>{String(r.subject ?? r.body ?? "—").slice(0, 80)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(String(r.created_at)), "dd MMM yyyy, HH:mm")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
