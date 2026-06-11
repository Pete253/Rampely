import { createFileRoute } from "@tanstack/react-router";
import { CompanyDetail } from "@/features/contacts/components/CompanyDetail";

export const Route = createFileRoute("/_authenticated/companies/$id")({
  head: () => ({ meta: [{ title: "Company — Rampely" }] }),
  component: CompanyDetailRoute,
});

function CompanyDetailRoute() {
  const { id } = Route.useParams();
  return <CompanyDetail id={id} />;
}
