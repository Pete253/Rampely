import { createFileRoute } from "@tanstack/react-router";
import { PipelineBoard } from "@/features/pipeline/components/PipelineBoard";

interface PipelineSearch {
  pipelineId: string;
  owner: string[];
  minValue: number | undefined;
  maxValue: number | undefined;
}

function toNumberOrUndefined(v: unknown): number | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function toStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string");
  if (typeof v === "string" && v.length > 0) return [v];
  return [];
}

export const Route = createFileRoute("/_authenticated/pipeline")({
  head: () => ({ meta: [{ title: "Pipeline — Rampely" }] }),
  validateSearch: (search: Record<string, unknown>): PipelineSearch => ({
    pipelineId: typeof search.pipelineId === "string" ? search.pipelineId : "",
    owner: toStringArray(search.owner),
    minValue: toNumberOrUndefined(search.minValue),
    maxValue: toNumberOrUndefined(search.maxValue),
  }),
  component: PipelinePage,
});

function PipelinePage() {
  return <PipelineBoard />;
}
