import { createFileRoute, useRouter } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { ReportsView } from "@/features/reporting/components/ReportsView";

const reportsSearchSchema = z.object({
  range: fallback(
    z.enum(["today", "week", "month", "quarter", "year", "custom"]),
    "month",
  ).default("month"),
  from: fallback(z.string().optional(), undefined),
  to: fallback(z.string().optional(), undefined),
});

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Reports — Rampely" }] }),
  validateSearch: zodValidator(reportsSearchSchema),
  component: ReportsPage,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="space-y-3 p-6">
        <h2 className="text-lg font-semibold">Something went wrong</h2>
        <p className="text-sm text-muted-foreground">{error.message}</p>
        <Button
          size="sm"
          onClick={() => {
            router.invalidate();
            reset();
          }}
        >
          Retry
        </Button>
      </div>
    );
  },
  notFoundComponent: () => (
    <div className="p-6 text-sm text-muted-foreground">Report not found.</div>
  ),
});

function ReportsPage() {
  const { range, from, to } = Route.useSearch();
  return <ReportsView preset={range} customFrom={from} customTo={to} />;
}
