import { useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

/**
 * Shared error boundary UI for route-level errors. Pass directly as
 * `errorComponent: RouteErrorFallback` in route definitions.
 */
export function RouteErrorFallback({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  return (
    <div className="space-y-3 rounded-lg border border-dashed border-white/12 p-12 text-center">
      <h2 className="text-lg font-extrabold tracking-[-0.02em]">Something went wrong</h2>
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
}
