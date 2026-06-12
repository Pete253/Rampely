import { createFileRoute } from "@tanstack/react-router";
import { RouteErrorFallback } from "@/shared/components/RouteErrorFallback";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { ReportsView } from "@/features/reporting/components/ReportsView";

const reportsSearchSchema = z.object({
  range: fallback(z.enum(["today", "week", "month", "quarter", "year", "custom"]), "month").default(
    "month",
  ),
  from: fallback(z.string().optional(), undefined),
  to: fallback(z.string().optional(), undefined),
});

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Reports — Rampely" }] }),
  validateSearch: zodValidator(reportsSearchSchema),
  component: ReportsPage,
  errorComponent: RouteErrorFallback,
  notFoundComponent: () => (
    <div className="p-6 text-sm text-muted-foreground">Report not found.</div>
  ),
});

function ReportsPage() {
  const { range, from, to } = Route.useSearch();
  return <ReportsView preset={range} customFrom={from} customTo={to} />;
}
