import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Plus, Settings } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DealForm } from "./DealForm";
import { formatDKK, totalValue, weightedValue } from "../lib/pipeline-utils";
import type { Pipeline, PipelineStage } from "@/shared/lib/types";
import type { DealWithRelations, CreateDealInput } from "../hooks/useDeals";

interface Props {
  pipelines: Pipeline[];
  selectedPipelineId: string;
  onSelectPipeline: (id: string) => void;
  stages: PipelineStage[];
  stagesByPipeline: Record<string, PipelineStage[]>;
  deals: DealWithRelations[];
  onCreateDeal: (input: CreateDealInput) => Promise<unknown>;
  createOpen?: boolean;
  onCreateOpenChange?: (open: boolean) => void;
}

export function PipelineHeader({
  pipelines,
  selectedPipelineId,
  onSelectPipeline,
  stages,
  stagesByPipeline,
  deals,
  onCreateDeal,
  createOpen,
  onCreateOpenChange,
}: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const addOpen = createOpen ?? internalOpen;
  const setAddOpen = (v: boolean) => {
    if (onCreateOpenChange) onCreateOpenChange(v);
    else setInternalOpen(v);
  };

  const openDeals = deals.filter((d) => {
    const stage = stages.find((s) => s.id === d.stage_id);
    return !stage || stage.stage_type === "open";
  });
  const total = totalValue(openDeals);
  const weighted = weightedValue(openDeals, stages);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Select value={selectedPipelineId} onValueChange={onSelectPipeline}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Select pipeline" />
          </SelectTrigger>
          <SelectContent>
            {pipelines.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
                {p.is_default ? " (default)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button asChild variant="outline" size="sm">
          <Link to="/pipeline/settings" search={{ pipelineId: "", owner: [], minValue: undefined, maxValue: undefined }}>
            <Settings className="mr-1 h-4 w-4" /> Settings
          </Link>
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-4 text-sm">
          <Stat label="Open" value={String(openDeals.length)} />
          <Stat label="Total" value={formatDKK(total)} />
          <Stat label="Weighted" value={formatDKK(weighted)} />
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <Button size="sm" onClick={() => setAddOpen(true)} disabled={!selectedPipelineId}>
            <Plus className="mr-1 h-4 w-4" /> Add Deal
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Deal</DialogTitle>
            </DialogHeader>
            <DealForm
              pipelines={pipelines}
              stagesByPipeline={stagesByPipeline}
              defaultPipelineId={selectedPipelineId}
              onCancel={() => setAddOpen(false)}
              onSubmit={async (values) => {
                try {
                  await onCreateDeal({
                    title: values.title,
                    value: values.value,
                    pipeline_id: values.pipeline_id,
                    stage_id: values.stage_id,
                    company_id: values.company_id ?? null,
                    contact_id: values.contact_id ?? null,
                    expected_close_date: values.expected_close_date
                      ? values.expected_close_date.toISOString().slice(0, 10)
                      : null,
                    description: values.description ?? null,
                  });
                  toast.success("Deal created");
                  setAddOpen(false);
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Failed to create deal");
                }
              }}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-right">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}
