import { createFileRoute } from "@tanstack/react-router";
import { PipelineSettings } from "@/features/pipeline/components/PipelineSettings";

export const Route = createFileRoute("/_authenticated/pipeline/settings")({
  component: PipelineSettingsPage,
});

function PipelineSettingsPage() {
  return <PipelineSettings />;
}
