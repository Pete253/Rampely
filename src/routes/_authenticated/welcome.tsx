import { createFileRoute } from "@tanstack/react-router";
import { WelcomeScreen } from "@/features/team/components/WelcomeScreen";

export const Route = createFileRoute("/_authenticated/welcome")({
  component: WelcomeScreen,
});
