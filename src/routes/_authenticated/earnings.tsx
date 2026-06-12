import { createFileRoute } from "@tanstack/react-router";
import { RouteErrorFallback } from "@/shared/components/RouteErrorFallback";
import { EarningsView } from "@/features/earnings/components/EarningsView";

export const Route = createFileRoute("/_authenticated/earnings")({
  head: () => ({ meta: [{ title: "Earnings — Rampely" }] }),
  component: EarningsPage,
  errorComponent: RouteErrorFallback,
});

function EarningsPage() {
  return <EarningsView />;
}
