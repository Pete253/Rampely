import { createFileRoute } from "@tanstack/react-router";
import { RouteErrorFallback } from "@/shared/components/RouteErrorFallback";
import { BookingsView } from "@/features/bookings/components/BookingsView";

export const Route = createFileRoute("/_authenticated/bookings")({
  head: () => ({ meta: [{ title: "Bookings — Rampely" }] }),
  component: BookingsPage,
  errorComponent: RouteErrorFallback,
});

function BookingsPage() {
  return <BookingsView />;
}
