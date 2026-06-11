import { createFileRoute } from "@tanstack/react-router";
import { CompanyList } from "@/features/contacts/components/CompanyList";

interface CompaniesSearch {
  search: string;
}

export const Route = createFileRoute("/_authenticated/companies/")({
  head: () => ({ meta: [{ title: "Companies — Rampely" }] }),
  validateSearch: (s: Record<string, unknown>): CompaniesSearch => ({
    search: typeof s.search === "string" ? s.search : "",
  }),
  component: CompaniesPage,
});

function CompaniesPage() {
  const { search } = Route.useSearch();
  return <CompanyList initialSearch={search} />;
}
