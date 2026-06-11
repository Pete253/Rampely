import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Trash2, Plus, ArrowLeft, Pencil, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCompany } from "../hooks/useCompanies";
import { useContacts } from "../hooks/useContacts";
import { InlineField } from "./InlineField";
import { ContactForm } from "./ContactForm";
import { CompanyForm } from "./CompanyForm";
import { ActivityTimeline } from "@/shared/components/activity/ActivityTimeline";
import { Breadcrumbs } from "@/shared/components/Breadcrumbs";
import { EntityTasksTab } from "@/features/calendar/components/EntityTasksTab";
import { useDeals } from "@/features/pipeline/hooks/useDeals";
import { formatDKK } from "@/features/pipeline/lib/pipeline-utils";
import { useCountryFeatures } from "@/shared/hooks/useCountryFeatures";
import { Checkbox } from "@/components/ui/checkbox";
import { cvrLookupByNumber, type CvrCompany } from "@/shared/lib/cvr-api";
import { supabase } from "@/shared/lib/supabase";
import { useWorkspace } from "@/shared/hooks/useWorkspace";
import { useAuth } from "@/shared/hooks/useAuth";

type DiffField = "name" | "address" | "industry" | "employees" | "website";
const DIFF_LABELS: Record<DiffField, string> = {
  name: "Name",
  address: "Address",
  industry: "Industry",
  employees: "Employees",
  website: "Website",
};

export function CompanyDetail({ id }: { id: string }) {
  const navigate = useNavigate();
  const { workspace } = useWorkspace();
  const { user } = useAuth();
  const { businessRegistry } = useCountryFeatures();
  const cvrEnabled = businessRegistry?.id === "cvr";
  const { company, loading, update, refresh, remove } = useCompany(id);
  const { contacts, create: createContact, loading: contactsLoading } = useContacts({
    companyId: id,
  });
  const [addContactOpen, setAddContactOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [diff, setDiff] = useState<{ field: DiffField; current: string; next: string }[] | null>(
    null,
  );
  const [selected, setSelected] = useState<Set<DiffField>>(new Set());
  const [applying, setApplying] = useState(false);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="space-y-3">
        <p className="text-muted-foreground">Company not found.</p>
        <Button variant="outline" onClick={() => navigate({ to: "/companies", search: { search: "" } })}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to companies
        </Button>
      </div>
    );
  }

  async function handleDelete() {
    try {
      await remove();
      toast.success("Company deleted");
      navigate({ to: "/companies", search: { search: "" } });
    } catch (e) {
      toast.error(`Failed to delete company: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function handleRefreshCvr() {
    if (!company?.cvr) return;
    setRefreshing(true);
    try {
      const data = await cvrLookupByNumber(company.cvr);
      if (!data) {
        toast.error("CVR not found");
        return;
      }
      const d = computeDiff(company, data);
      if (d.length === 0) {
        toast("Company data is up to date");
        return;
      }
      setDiff(d);
      setSelected(new Set(d.map((x) => x.field)));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "CVR lookup failed");
    } finally {
      setRefreshing(false);
    }
  }

  async function applyDiff() {
    if (!diff || !company || !workspace) return;
    setApplying(true);
    const patch: Record<string, unknown> = {};
    const changed: string[] = [];
    for (const { field, next } of diff) {
      if (!selected.has(field)) continue;
      patch[field] = field === "employees" ? Number(next) || null : next;
      changed.push(DIFF_LABELS[field]);
    }
    try {
      await update(patch);
      await supabase.from("activities").insert({
        workspace_id: workspace.id,
        type: "note",
        subject: "Updated from CVR registry",
        body: `Updated fields: ${changed.join(", ")}`,
        company_id: company.id,
        user_id: user?.id ?? null,
      });
      toast.success(`Updated ${changed.length} fields from CVR`);
      setDiff(null);
      void refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to apply changes");
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Companies", to: "/companies" },
          { label: company.name },
        ]}
      />
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{company.name}</h1>
            {company.industry && <Badge variant="secondary">{company.industry}</Badge>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {cvrEnabled && company.cvr && /^\d{8}$/.test(company.cvr) && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshCvr}
              disabled={refreshing}
            >
              {refreshing ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-1 h-4 w-4" />
              )}
              Refresh from CVR
            </Button>
          )}
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <Button size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="mr-1 h-4 w-4" /> Edit
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit company</DialogTitle>
              </DialogHeader>
              <CompanyForm
                initial={{
                  name: company.name,
                  cvr: company.cvr ?? "",
                  website: company.website ?? "",
                  industry: company.industry ?? "",
                  employees: company.employees ?? null,
                  address: company.address ?? "",
                }}
                submitLabel="Save"
                onSubmit={async (input) => {
                  await update(input);
                  toast.success("Company updated");
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
                <AlertDialogTitle>Delete this company?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this company? This action cannot be undone.
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
            label="Name"
            value={company.name}
            onSave={async (v) => update({ name: v ?? "" })}
          />
          <InlineField
            label="Industry"
            value={company.industry}
            onSave={(v) => update({ industry: v })}
          />
          <InlineField
            label="CVR"
            value={company.cvr}
            onSave={(v) => update({ cvr: v })}
          />
          <InlineField
            label="Website"
            value={company.website}
            type="url"
            onSave={(v) => update({ website: v })}
          />
          <InlineField
            label="Employees"
            value={company.employees}
            type="number"
            onSave={(v) => update({ employees: v ? Number(v) : null })}
          />
          <InlineField
            label="Address"
            value={company.address}
            multiline
            onSave={(v) => update({ address: v })}
          />
        </aside>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="contacts">Contacts</TabsTrigger>
            <TabsTrigger value="deals">Deals</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="space-y-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Stat label="Contacts" value={String(contacts.length)} />
              <Stat label="Employees" value={company.employees?.toString() ?? "—"} />
              <Stat
                label="Created"
                value={new Date(company.created_at).toLocaleDateString()}
              />
            </div>
          </TabsContent>
          <TabsContent value="contacts" className="space-y-3">
            <div className="flex justify-end">
              <Dialog open={addContactOpen} onOpenChange={setAddContactOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="mr-1 h-4 w-4" /> Add Contact
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>New Contact for {company.name}</DialogTitle>
                  </DialogHeader>
                  <ContactForm
                    initial={{ company_id: company.id }}
                    lockCompany
                    onSubmit={async (input) => {
                      await createContact(input);
                      toast.success("Contact added");
                      setAddContactOpen(false);
                    }}
                    onCancel={() => setAddContactOpen(false)}
                  />
                </DialogContent>
              </Dialog>
            </div>
            {contactsLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : contacts.length === 0 ? (
              <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                No contacts linked to this company yet.
              </p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Email</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contacts.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">
                          <Link
                            to="/contacts/$id"
                            params={{ id: c.id }}
                            className="hover:underline"
                          >
                            {c.first_name} {c.last_name ?? ""}
                          </Link>
                        </TableCell>
                        <TableCell>{c.title ?? "—"}</TableCell>
                        <TableCell>{c.email ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
          <TabsContent value="deals">
            <CompanyDealsList companyId={id} />
          </TabsContent>
          <TabsContent value="tasks">
            <EntityTasksTab companyId={id} />
          </TabsContent>
          <TabsContent value="activity">
            <ActivityTimeline companyId={id} />
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={diff !== null} onOpenChange={(o) => !o && !applying && setDiff(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update these fields from CVR?</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {diff?.map((row) => (
              <label
                key={row.field}
                className="flex items-start gap-3 rounded-md border p-3 text-sm"
              >
                <Checkbox
                  checked={selected.has(row.field)}
                  onCheckedChange={(v) => {
                    setSelected((prev) => {
                      const next = new Set(prev);
                      if (v === true) next.add(row.field);
                      else next.delete(row.field);
                      return next;
                    });
                  }}
                  className="mt-0.5"
                />
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{DIFF_LABELS[row.field]}</div>
                  <div className="mt-1 grid gap-1 text-xs">
                    <div className="text-muted-foreground line-through">
                      {row.current || "—"}
                    </div>
                    <div className="text-foreground">→ {row.next}</div>
                  </div>
                </div>
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDiff(null)} disabled={applying}>
              Cancel
            </Button>
            <Button onClick={applyDiff} disabled={applying || selected.size === 0}>
              {applying ? "Applying…" : `Apply ${selected.size} change${selected.size === 1 ? "" : "s"}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function computeDiff(
  current: { name: string; address: string | null; industry: string | null; employees: number | null; website: string | null },
  next: CvrCompany,
): { field: DiffField; current: string; next: string }[] {
  const out: { field: DiffField; current: string; next: string }[] = [];
  const candidates: { field: DiffField; cur: string | number | null; nx: string | number | undefined | null }[] = [
    { field: "name", cur: current.name, nx: next.name },
    { field: "address", cur: current.address, nx: next.address },
    { field: "industry", cur: current.industry, nx: next.industryDesc ?? next.industryCode ?? null },
    { field: "employees", cur: current.employees, nx: next.employees ?? null },
    { field: "website", cur: current.website, nx: next.website ?? null },
  ];
  for (const c of candidates) {
    const nxStr = c.nx == null || c.nx === "" ? "" : String(c.nx);
    const curStr = c.cur == null ? "" : String(c.cur);
    if (nxStr && nxStr !== curStr) {
      out.push({ field: c.field, current: curStr, next: nxStr });
    }
  }
  return out;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}

function CompanyDealsList({ companyId }: { companyId: string }) {
  const { deals, loading } = useDeals({ companyId });
  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading deals…</p>;
  }
  if (deals.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        No deals linked to this company.
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
