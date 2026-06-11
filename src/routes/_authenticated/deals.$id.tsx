import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { DealDetail } from "@/features/pipeline/components/DealDetail";

export const Route = createFileRoute("/_authenticated/deals/$id")({
  head: () => ({ meta: [{ title: "Deal — Rampely" }] }),
  component: DealDetailRoute,
  errorComponent: DealErrorComponent,
  notFoundComponent: () => (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-16 text-center">
      <h2 className="text-lg font-semibold">Deal not found</h2>
      <Button asChild>
        <Link to="/pipeline" search={{ pipelineId: "", owner: [], minValue: undefined, maxValue: undefined }}>Back to Pipeline</Link>
      </Button>
    </div>
  ),
});

function DealDetailRoute() {
  const { id } = Route.useParams();
  return <DealDetail dealId={id} />;
}

function DealErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-16 text-center">
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="text-sm text-muted-foreground">{error.message}</p>
      <div className="flex gap-2">
        <Button
          onClick={() => {
            router.invalidate();
            reset();
          }}
        >
          Retry
        </Button>
        <Button variant="outline" asChild>
          <Link to="/pipeline" search={{ pipelineId: "", owner: [], minValue: undefined, maxValue: undefined }}>Back to Pipeline</Link>
        </Button>
      </div>
    </div>
  );
}
