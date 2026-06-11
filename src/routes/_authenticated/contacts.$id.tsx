import { createFileRoute } from "@tanstack/react-router";
import { ContactDetail } from "@/features/contacts/components/ContactDetail";

export const Route = createFileRoute("/_authenticated/contacts/$id")({
  head: () => ({ meta: [{ title: "Contact — Rampely" }] }),
  component: ContactDetailRoute,
});

function ContactDetailRoute() {
  const { id } = Route.useParams();
  return <ContactDetail id={id} />;
}
