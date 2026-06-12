import { createFileRoute } from "@tanstack/react-router";
import { RouteErrorFallback } from "@/shared/components/RouteErrorFallback";
import { CallsView } from "@/features/calls/components/CallsView";

export const Route = createFileRoute("/_authenticated/calls")({
  head: () => ({ meta: [{ title: "Calls — Rampely" }] }),
  component: CallsPage,
  errorComponent: RouteErrorFallback,
});

function CallsPage() {
  return <CallsView />;
}
