import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dashboard")({
  beforeLoad: () => {
    throw redirect({ to: "/reports", search: { range: "month", from: undefined, to: undefined } });
  },
  component: () => null,
});
