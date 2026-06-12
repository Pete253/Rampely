import { createFileRoute, Link } from "@tanstack/react-router";
import { RouteErrorFallback } from "@/shared/components/RouteErrorFallback";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { CalendarView } from "@/features/calendar/components/CalendarView";

const calendarSearchSchema = z.object({
  view: fallback(z.enum(["day", "week", "month"]), "week").default("week"),
  date: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/_authenticated/calendar")({
  validateSearch: zodValidator(calendarSearchSchema),
  head: () => ({ meta: [{ title: "Calendar — Rampely" }] }),
  component: CalendarPage,
  errorComponent: RouteErrorFallback,
  notFoundComponent: () => (
    <div className="rounded-lg border border-dashed p-12 text-center">
      <p>Page not found.</p>
      <Button asChild className="mt-3">
        <Link to="/dashboard">Back to Dashboard</Link>
      </Button>
    </div>
  ),
});

function CalendarPage() {
  const { view, date } = Route.useSearch();
  return <CalendarView initialView={view} initialDate={date || undefined} />;
}
