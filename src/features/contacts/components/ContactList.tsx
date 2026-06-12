import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Plus, Search, Users, Pencil, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableSkeleton } from "@/shared/components/skeletons/TableSkeleton";
import { EmptyState } from "@/shared/components/EmptyState";
import { useContacts, type ContactWithCompany } from "../hooks/useContacts";
import { ContactForm } from "./ContactForm";
import { CsvImportDialog } from "./CsvImportDialog";
import { usePendingCreate } from "@/shared/contexts/PendingCreateContext";

interface Props {
  initialSearch?: string;
}

export function ContactList({ initialSearch = "" }: Props = {}) {
  const { contacts, loading, create, update, remove, refresh } = useContacts();
  const [search, setSearch] = useState(initialSearch);
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<ContactWithCompany | null>(null);
  const [deleting, setDeleting] = useState<ContactWithCompany | null>(null);
  const { pendingCreate, setPendingCreate } = usePendingCreate();

  useEffect(() => {
    if (pendingCreate === "contact") {
      setOpen(true);
      setPendingCreate(null);
    }
  }, [pendingCreate, setPendingCreate]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return contacts;
    return contacts.filter((c) => {
      const name = `${c.first_name} ${c.last_name ?? ""}`.toLowerCase();
      return name.includes(q) || (c.email ?? "").toLowerCase().includes(q);
    });
  }, [contacts, search]);

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await remove(deleting.id);
      toast.success("Contact deleted");
      setDeleting(null);
    } catch (err) {
      toast.error(`Failed to delete contact: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-[-0.03em]">Contacts</h1>
          <p className="text-sm text-muted-foreground">
            {contacts.length} {contacts.length === 1 ? "contact" : "contacts"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="mr-1 h-4 w-4" /> Import
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-1 h-4 w-4" /> Add Contact
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Contact</DialogTitle>
              </DialogHeader>
              <ContactForm
                onSubmit={async (input) => {
                  await create(input);
                  toast.success("Contact created");
                  setOpen(false);
                }}
                onCancel={() => setOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <CsvImportDialog
        entity="contacts"
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={() => void refresh()}
      />

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      {loading ? (
        <TableSkeleton />
      ) : contacts.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No contacts yet"
          description="Get started by adding your first contact."
          action={{ label: "Add your first contact", onClick: () => setOpen(true) }}
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[110px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    <Link to="/contacts/$id" params={{ id: c.id }} className="hover:underline">
                      {c.first_name} {c.last_name ?? ""}
                    </Link>
                  </TableCell>
                  <TableCell>{c.title ?? "—"}</TableCell>
                  <TableCell>
                    {c.company ? (
                      <Link
                        to="/companies/$id"
                        params={{ id: c.company.id }}
                        className="text-primary hover:underline"
                      >
                        {c.company.name}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>{c.email ?? "—"}</TableCell>
                  <TableCell>{c.phone ?? "—"}</TableCell>
                  <TableCell>{new Date(c.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditing(c)}
                        aria-label="Edit contact"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleting(c)}
                        aria-label="Delete contact"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No matches.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
          </DialogHeader>
          {editing && (
            <ContactForm
              initial={{
                first_name: editing.first_name,
                last_name: editing.last_name ?? "",
                email: editing.email ?? "",
                phone: editing.phone ?? "",
                title: editing.title ?? "",
                company_id: editing.company?.id ?? null,
              }}
              submitLabel="Save changes"
              onSubmit={async (input) => {
                await update(editing.id, input);
                toast.success("Contact updated");
                setEditing(null);
              }}
              onCancel={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete contact?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting
                ? `This will permanently delete ${deleting.first_name} ${deleting.last_name ?? ""}. This action cannot be undone.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
