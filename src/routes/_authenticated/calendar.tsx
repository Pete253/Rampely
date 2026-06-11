import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
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
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="rounded-lg border border-dashed p-12 text-center space-y-3">
        <h2 className="text-lg font-semibold">Something went wrong</h2>
        <p className="text-sm text-muted-foreground">{error.message}</p>
        <Button
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
