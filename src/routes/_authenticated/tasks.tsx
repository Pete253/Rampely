import { createFileRoute, Link } from "@tanstack/react-router";
import { RouteErrorFallback } from "@/shared/components/RouteErrorFallback";
import { Button } from "@/components/ui/button";
import { TasksView } from "@/features/calendar/components/TasksView";

export const Route = createFileRoute("/_authenticated/tasks")({
  head: () => ({ meta: [{ title: "Tasks — Rampely" }] }),
  component: TasksPage,
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

function TasksPage() {
  return <TasksView />;
}
