import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/shared/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { usePipelines } from "../hooks/usePipelines";
import { StageEditor } from "./StageEditor";

export function PipelineSettings() {
  const { pipelines, loading, createPipeline, updatePipeline, deletePipeline } = usePipelines();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [seedDefaults, setSeedDefaults] = useState(true);

  useEffect(() => {
    if (!selectedId && pipelines.length > 0) {
      setSelectedId((pipelines.find((p) => p.is_default) ?? pipelines[0]).id);
    }
  }, [pipelines, selectedId]);

  async function handleCreate() {
    if (!newName.trim()) {
      toast.error("Name is required");
      return;
    }
    try {
      const p = await createPipeline(newName.trim(), seedDefaults);
      if (p) setSelectedId(p.id);
      setNewName("");
      setSeedDefaults(true);
      setCreateOpen(false);
      toast.success("Pipeline created");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Link
            to="/pipeline"
            search={{ pipelineId: "", owner: [], minValue: undefined, maxValue: undefined }}
            className="text-xs text-muted-foreground hover:underline inline-flex items-center gap-1"
          >
            <ArrowLeft className="h-3 w-3" /> Back to board
          </Link>
          <h1 className="text-2xl font-extrabold tracking-[-0.03em]">Pipeline Settings</h1>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> Create Pipeline
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New pipeline</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label htmlFor="pipeline-name">Name</Label>
                <Input
                  id="pipeline-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Sales Pipeline"
                />
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <div className="text-sm font-medium">Seed default stages</div>
                  <div className="text-xs text-muted-foreground">
                    Lead → Qualified → Proposal → Negotiation → Won / Lost
                  </div>
                </div>
                <Switch checked={seedDefaults} onCheckedChange={setSeedDefaults} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-2 rounded-lg border bg-card p-3">
          <div className="px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Pipelines
          </div>
          {loading ? (
            <Skeleton className="h-32 w-full" />
          ) : pipelines.length === 0 ? (
            <div className="px-2 py-4 text-sm text-muted-foreground">No pipelines yet.</div>
          ) : (
            <div className="space-y-1">
              {pipelines.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedId(p.id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm transition-colors",
                    selectedId === p.id ? "bg-accent text-accent-foreground" : "hover:bg-muted",
                  )}
                >
                  <span className="truncate">{p.name}</span>
                  {p.is_default && <Star className="h-3.5 w-3.5 text-warning" />}
                </button>
              ))}
            </div>
          )}
        </aside>

        <div className="space-y-6">
          {selectedId &&
            (() => {
              const p = pipelines.find((x) => x.id === selectedId);
              if (!p) return null;
              return (
                <>
                  <div className="rounded-lg border bg-card p-4 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <Label htmlFor={`name-${p.id}`} className="text-xs">
                          Pipeline name
                        </Label>
                        <Input
                          id={`name-${p.id}`}
                          defaultValue={p.name}
                          onBlur={async (e) => {
                            const v = e.target.value.trim();
                            if (v && v !== p.name) {
                              try {
                                await updatePipeline(p.id, { name: v });
                                toast.success("Pipeline renamed");
                              } catch (err) {
                                toast.error(err instanceof Error ? err.message : "Failed");
                              }
                            }
                          }}
                        />
                      </div>
                      <div className="flex items-center gap-2 self-end pb-1">
                        <Label className="text-xs">Default</Label>
                        <Switch
                          checked={p.is_default}
                          onCheckedChange={async (v) => {
                            if (!v) return; // can't unset default — set another to default
                            try {
                              await updatePipeline(p.id, { is_default: true });
                              toast.success("Default pipeline updated");
                            } catch (err) {
                              toast.error(err instanceof Error ? err.message : "Failed");
                            }
                          }}
                        />
                      </div>
                      <DeletePipelineDialog
                        pipeline={p}
                        onDeleted={() => {
                          const remaining = pipelines.filter((x) => x.id !== p.id);
                          setSelectedId(remaining[0]?.id ?? null);
                        }}
                        deletePipeline={deletePipeline}
                      />
                    </div>
                  </div>

                  <div className="rounded-lg border bg-card p-4">
                    <h3 className="mb-3 text-sm font-semibold">Stages</h3>
                    <StageEditor pipelineId={p.id} />
                  </div>
                </>
              );
            })()}
        </div>
      </div>
    </div>
  );
}

function DeletePipelineDialog({
  pipeline,
  onDeleted,
  deletePipeline,
}: {
  pipeline: { id: string; name: string; is_default: boolean };
  onDeleted: () => void;
  deletePipeline: (id: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setCount(null);
    void (async () => {
      const { count: c } = await supabase
        .from("deals")
        .select("id", { count: "exact", head: true })
        .eq("pipeline_id", pipeline.id);
      setCount(c ?? 0);
      setLoading(false);
    })();
  }, [open, pipeline.id]);

  const isDefault = pipeline.is_default;
  const hasDeals = (count ?? 0) > 0;
  const canDelete = !isDefault && !hasDeals && !loading;

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="self-end" title="Delete pipeline">
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isDefault
              ? "Cannot delete default pipeline"
              : hasDeals
                ? `Cannot delete "${pipeline.name}"`
                : `Delete pipeline "${pipeline.name}"?`}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isDefault
              ? "The default pipeline cannot be deleted. Set another pipeline as default first."
              : loading
                ? "Checking deals…"
                : hasDeals
                  ? `This pipeline has ${count} deal(s). Please move or delete them before deleting the pipeline.`
                  : "This cannot be undone."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Close</AlertDialogCancel>
          {canDelete && (
            <AlertDialogAction
              onClick={async () => {
                try {
                  await deletePipeline(pipeline.id);
                  onDeleted();
                  toast.success("Pipeline deleted");
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Failed to delete");
                }
              }}
            >
              Delete
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
