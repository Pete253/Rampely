import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/shared/lib/supabase";
import { useAuth } from "@/shared/hooks/useAuth";
import { useWorkspace } from "@/shared/hooks/useWorkspace";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { usePipelineStages } from "../hooks/usePipelines";
import type { PipelineStage } from "@/shared/lib/types";

interface Props {
  pipelineId: string;
  currentStage: PipelineStage | null;
  dealId: string;
  onChanged: () => void;
}

export function StageChangePopover({ pipelineId, currentStage, dealId, onChanged }: Props) {
  const { stages } = usePipelineStages(pipelineId);
  const { user } = useAuth();
  const { workspace } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function selectStage(stage: PipelineStage) {
    if (!currentStage || stage.id === currentStage.id || !workspace) {
      setOpen(false);
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase
        .from("deals")
        .update({ stage_id: stage.id })
        .eq("id", dealId)
        .eq("workspace_id", workspace.id);
      if (error) throw error;
      if (user) {
        await supabase.from("activities").insert({
          workspace_id: workspace.id,
          user_id: user.id,
          type: "note",
          subject: `Moved from ${currentStage.name} to ${stage.name}`,
          deal_id: dealId,
        });
      }
      toast.success(`Moved to ${stage.name}`);
      onChanged();
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to change stage");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2" disabled={busy}>
          <Badge
            variant="secondary"
            style={
              currentStage?.color
                ? {
                    backgroundColor: `${currentStage.color}20`,
                    color: currentStage.color,
                    borderColor: `${currentStage.color}40`,
                  }
                : undefined
            }
            className="border"
          >
            {currentStage?.name ?? "No stage"}
          </Badge>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-1">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground px-2 py-1">
          Change stage
        </div>
        <div className="flex flex-col">
          {stages.map((s) => (
            <button
              key={s.id}
              type="button"
              disabled={busy}
              onClick={() => void selectStage(s)}
              className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent disabled:opacity-50"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: s.color ?? "var(--muted)" }}
              />
              <span className="flex-1">{s.name}</span>
              <span className="text-xs text-muted-foreground">{s.probability}%</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
