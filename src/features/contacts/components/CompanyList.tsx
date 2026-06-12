import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Plus, Search, Building2, Pencil, Trash2, Upload } from "lucide-react";
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
import { useCompanies } from "../hooks/useCompanies";
import { CompanyForm } from "./CompanyForm";
import { CsvImportDialog } from "./CsvImportDialog";
import { usePendingCreate } from "@/shared/contexts/PendingCreateContext";
import type { Company } from "@/shared/lib/types";

interface Props {
  initialSearch?: string;
}

export function CompanyList({ initialSearch = "" }: Props = {}) {
  const { companies, contactCounts, loading, create, update, remove, refresh } = useCompanies();
  const [search, setSearch] = useState(initialSearch);
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [deleting, setDeleting] = useState<Company | null>(null);
  const { pendingCreate, setPendingCreate } = usePendingCreate();

  useEffect(() => {
    if (pendingCreate === "company") {
      setOpen(true);
      setPendingCreate(null);
    }
  }, [pendingCreate, setPendingCreate]);

  const filtered = useMemo(
    () => companies.filter((c) => c.name.toLowerCase().includes(search.toLowerCase().trim())),
    [companies, search],
  );

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await remove(deleting.id);
      toast.success("Company deleted");
      setDeleting(null);
    } catch (err) {
      toast.error(`Failed to delete company: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-[-0.03em]">Companies</h1>
          <p className="text-sm text-muted-foreground">
            {companies.length} {companies.length === 1 ? "company" : "companies"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="mr-1 h-4 w-4" /> Import
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-1 h-4 w-4" /> Add Company
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Company</DialogTitle>
              </DialogHeader>
              <CompanyForm
                onSubmit={async (input) => {
                  await create(input);
                  toast.success("Company created");
                  setOpen(false);
                }}
                onCancel={() => setOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <CsvImportDialog
        entity="companies"
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={() => void refresh()}
      />

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      {loading ? (
        <TableSkeleton />
      ) : companies.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No companies yet"
          description="Get started by adding your first company."
          action={{ label: "Add your first company", onClick: () => setOpen(true) }}
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Employees</TableHead>
                <TableHead>Website</TableHead>
                <TableHead># Contacts</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[110px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    <Link to="/companies/$id" params={{ id: c.id }} className="hover:underline">
                      {c.name}
                    </Link>
                  </TableCell>
                  <TableCell>{c.industry ?? "—"}</TableCell>
                  <TableCell>{c.employees ?? "—"}</TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {c.website ? (
                      <a
                        href={c.website}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline"
                      >
                        {c.website}
                      </a>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>{contactCounts[c.id] ?? 0}</TableCell>
                  <TableCell>{new Date(c.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditing(c)}
                        aria-label="Edit company"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleting(c)}
                        aria-label="Delete company"
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
            <DialogTitle>Edit Company</DialogTitle>
          </DialogHeader>
          {editing && (
            <CompanyForm
              initial={{
                name: editing.name,
                cvr: editing.cvr ?? "",
                website: editing.website ?? "",
                industry: editing.industry ?? "",
                employees: editing.employees ?? null,
                address: editing.address ?? "",
              }}
              submitLabel="Save changes"
              onSubmit={async (input) => {
                await update(editing.id, input);
                toast.success("Company updated");
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
            <AlertDialogTitle>Delete company?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting
                ? `This will permanently delete ${deleting.name}. This action cannot be undone.`
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
