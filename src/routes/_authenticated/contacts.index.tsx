import { createFileRoute } from "@tanstack/react-router";
import { ContactList } from "@/features/contacts/components/ContactList";

interface ContactsSearch {
  search: string;
}

export const Route = createFileRoute("/_authenticated/contacts/")({
  head: () => ({ meta: [{ title: "Contacts — Rampely" }] }),
  validateSearch: (s: Record<string, unknown>): ContactsSearch => ({
    search: typeof s.search === "string" ? s.search : "",
  }),
  component: ContactsPage,
});

function ContactsPage() {
  const { search } = Route.useSearch();
  return <ContactList initialSearch={search} />;
}
