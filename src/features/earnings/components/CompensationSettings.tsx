import { useState } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCountryFeatures } from "@/shared/hooks/useCountryFeatures";
import { useWorkspaceMembers } from "@/features/team/hooks/useWorkspaceMembers";
import type { CompModel } from "@/shared/lib/types";
import { makeMoneyFormatter, parseBonusTiers } from "../lib/earnings-utils";
import { useCompModels } from "../hooks/useCompModels";
import { CompModelForm } from "./CompModelForm";

interface EditTarget {
  userId: string | null;
  name: string;
}

/** Admin-only settings: workspace default + per-member compensation models. */
export function CompensationSettings() {
  const { locale, currency } = useCountryFeatures();
  const { members, loading: membersLoading } = useWorkspaceMembers();
  const { loading, error, effectiveFor, save } = useCompModels();
  const [editing, setEditing] = useState<EditTarget | null>(null);
  const money = makeMoneyFormatter(locale, currency);

  const renderModel = (model: CompModel | null) => {
    if (!model) return <span className="text-white/40">Uses default</span>;
    const tiers = parseBonusTiers(model.bonus_tiers);
    return (
      <div className="text-[13px]">
        <span className="font-semibold">{money(Number(model.base_salary))}</span>
        <span className="text-white/40"> + </span>
        <span className="font-semibold text-primary-light">
          {money(Number(model.per_booking_rate))}
        </span>
        <span className="text-white/40">/booking</span>
        {tiers.length > 0 && (
          <span className="text-white/40">
            {" "}
            · {tiers.length} bonus tier{tiers.length === 1 ? "" : "s"}
          </span>
        )}
      </div>
    );
  };

  const defaultModel = effectiveFor(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Compensation</CardTitle>
        <CardDescription>
          Base salary, per-booking commission and bonus tiers. The workspace default applies to
          everyone without a personal model. Changes take effect from today; history is kept.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading || membersLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : error ? (
          <p className="rounded-md border border-dashed border-danger/30 p-8 text-center text-sm text-danger">
            Failed to load compensation models: {error}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Who</TableHead>
                <TableHead>Model</TableHead>
                <TableHead className="w-20 text-right">Edit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>
                  <div className="text-[13px] font-bold">Workspace default</div>
                  <div className="text-[11px] text-white/40">Applies when no personal model</div>
                </TableCell>
                <TableCell>
                  {defaultModel ? (
                    renderModel(defaultModel)
                  ) : (
                    <span className="text-white/40">Not set</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Edit workspace default model"
                    onClick={() => setEditing({ userId: null, name: "Workspace default" })}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
              {members.map((m) => {
                const name = m.profile?.full_name ?? m.profile?.email ?? "Unknown";
                const initials = name
                  .split(/\s+/)
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();
                return (
                  <TableRow key={m.user_id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="bg-primary text-[10px] font-bold text-primary-foreground">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="text-[13px] font-semibold">{name}</div>
                          <div className="text-[11px] capitalize text-white/40">{m.role}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{renderModel(effectiveFor(m.user_id))}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit model for ${name}`}
                        onClick={() => setEditing({ userId: m.user_id, name })}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Compensation — {editing?.name}</DialogTitle>
            </DialogHeader>
            {editing && (
              <CompModelForm
                current={effectiveFor(editing.userId)}
                currencyLabel={currency}
                onSubmit={async (input) => {
                  try {
                    await save(editing.userId, input);
                    toast.success("Compensation model saved");
                    setEditing(null);
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Failed to save model");
                  }
                }}
                onCancel={() => setEditing(null)}
              />
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
