import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Trash2, ArrowLeft, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useContact } from "../hooks/useContacts";
import { InlineField } from "./InlineField";
import { CompanySelector } from "./CompanySelector";
import { ContactForm } from "./ContactForm";
import { ActivityTimeline } from "@/shared/components/activity/ActivityTimeline";
import { Breadcrumbs } from "@/shared/components/Breadcrumbs";
import { EntityTasksTab } from "@/features/calendar/components/EntityTasksTab";
import { formatDKK } from "@/features/pipeline/lib/pipeline-utils";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/shared/lib/supabase";
import { useWorkspace } from "@/shared/hooks/useWorkspace";

export function ContactDetail({ id }: { id: string }) {
  const navigate = useNavigate();
  const { contact, loading, update, remove } = useContact(id);
  const [editOpen, setEditOpen] = useState(false);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="space-y-3">
        <p className="text-muted-foreground">Contact not found.</p>
        <Button variant="outline" onClick={() => navigate({ to: "/contacts", search: { search: "" } })}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to contacts
        </Button>
      </div>
    );
  }

  async function handleDelete() {
    try {
      await remove();
      toast.success("Contact deleted");
      navigate({ to: "/contacts", search: { search: "" } });
    } catch (e) {
      toast.error(`Failed to delete contact: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const fullName = `${contact.first_name} ${contact.last_name ?? ""}`.trim();

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Contacts", to: "/contacts" },
          { label: fullName || "Contact" },
        ]}
      />
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{fullName}</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {contact.title && <span>{contact.title}</span>}
            {contact.title && contact.company && <span>·</span>}
            {contact.company && (
              <Link
                to="/companies/$id"
                params={{ id: contact.company.id }}
                className="text-primary hover:underline"
              >
                {contact.company.name}
              </Link>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <Button size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="mr-1 h-4 w-4" /> Edit
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit contact</DialogTitle>
              </DialogHeader>
              <ContactForm
                initial={{
                  first_name: contact.first_name,
                  last_name: contact.last_name ?? "",
                  email: contact.email ?? "",
                  phone: contact.phone ?? "",
                  title: contact.title ?? "",
                  company_id: contact.company_id ?? null,
                }}
                submitLabel="Save"
                onSubmit={async (input) => {
                  await update(input);
                  toast.success("Contact updated");
                  setEditOpen(false);
                }}
                onCancel={() => setEditOpen(false)}
              />
            </DialogContent>
          </Dialog>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="mr-1 h-4 w-4" /> Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this contact?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this contact? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-3 rounded-lg border bg-card p-4">
          <h2 className="text-sm font-medium">Details</h2>
          <InlineField
            label="First name"
            value={contact.first_name}
            onSave={(v) => update({ first_name: v ?? "" })}
          />
          <InlineField
            label="Last name"
            value={contact.last_name}
            onSave={(v) => update({ last_name: v })}
          />
          <InlineField
            label="Title"
            value={contact.title}
            onSave={(v) => update({ title: v })}
          />
          <InlineField
            label="Email"
            type="email"
            value={contact.email}
            onSave={(v) => update({ email: v })}
          />
          <InlineField
            label="Phone"
            value={contact.phone}
            onSave={(v) => update({ phone: v })}
          />
          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground">Company</div>
            <CompanySelector
              value={contact.company_id}
              onChange={(v) => update({ company_id: v })}
            />
          </div>
        </aside>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="deals">Deals</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>
          <TabsContent value="overview">
            <div className="rounded-lg border bg-card p-4 space-y-2 text-sm">
              <Row label="Name" value={fullName} />
              <Row label="Title" value={contact.title ?? "—"} />
              <Row label="Email" value={contact.email ?? "—"} />
              <Row label="Phone" value={contact.phone ?? "—"} />
              <Row label="Company" value={contact.company?.name ?? "—"} />
              <Row
                label="Created"
                value={new Date(contact.created_at).toLocaleDateString()}
              />
            </div>
          </TabsContent>
          <TabsContent value="deals">
            <ContactDealsList contactId={id} />
          </TabsContent>
          <TabsContent value="tasks">
            <EntityTasksTab contactId={id} />
          </TabsContent>
          <TabsContent value="activity">
            <ActivityTimeline contactId={id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b py-1.5 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function ContactDealsList({ contactId }: { contactId: string }) {
  const { deals, loading } = useContactDeals(contactId);
  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading deals…</p>;
  }
  if (deals.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        No deals linked to this contact.
      </p>
    );
  }
  return (
    <div className="rounded-md border divide-y">
      {deals.map((d) => (
        <Link
          key={d.id}
          to="/deals/$id"
          params={{ id: d.id }}
          className="flex items-center justify-between gap-3 p-3 text-sm hover:bg-muted/50"
        >
          <div className="min-w-0">
            <div className="font-medium truncate">{d.title}</div>
            <div className="text-xs text-muted-foreground">
              {d.expected_close_date
                ? new Date(d.expected_close_date).toLocaleDateString()
                : "No close date"}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary">{d.status}</Badge>
            <span className="font-medium">{formatDKK(Number(d.value ?? 0))}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

interface ContactDealRow {
  id: string;
  title: string;
  status: string;
  value: number | null;
  expected_close_date: string | null;
}

function useContactDeals(contactId: string) {
  const [deals, setDeals] = useState<ContactDealRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { workspace } = useWorkspace();

  useEffect(() => {
    if (!workspace) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const { data: dc } = await supabase
        .from("deal_contacts" as never)
        .select("deal_id")
        .eq("contact_id", contactId);
      const joinIds = ((dc as unknown as { deal_id: string }[]) ?? []).map((r) => r.deal_id);

      const filter =
        joinIds.length > 0
          ? `id.in.(${joinIds.join(",")}),contact_id.eq.${contactId}`
          : `contact_id.eq.${contactId}`;

      const { data: rows } = await supabase
        .from("deals")
        .select("id, title, status, value, expected_close_date")
        .eq("workspace_id", workspace.id)
        .or(filter);

      if (cancelled) return;
      setDeals((rows as unknown as ContactDealRow[]) ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [workspace, contactId]);

  return { deals, loading };
}
