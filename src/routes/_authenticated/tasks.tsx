import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { TasksView } from "@/features/calendar/components/TasksView";

export const Route = createFileRoute("/_authenticated/tasks")({
  head: () => ({ meta: [{ title: "Tasks — Rampely" }] }),
  component: TasksPage,
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

function TasksPage() {
  return <TasksView />;
}
