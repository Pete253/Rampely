import { useState, type FormEvent } from "react";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCountryFeatures } from "@/shared/hooks/useCountryFeatures";
import {
  cvrLookupByNumber,
  cvrSearchByName,
  type CvrCompany,
} from "@/shared/lib/cvr-api";
import type { CompanyInput } from "../hooks/useCompanies";

type Props = {
  initial?: Partial<CompanyInput>;
  submitLabel?: string;
  onSubmit: (input: CompanyInput) => Promise<void>;
  onCancel?: () => void;
};

export function CompanyForm({ initial, submitLabel = "Create", onSubmit, onCancel }: Props) {
  const { businessRegistry } = useCountryFeatures();
  const cvrEnabled = businessRegistry?.id === "cvr";

  const [name, setName] = useState(initial?.name ?? "");
  const [cvr, setCvr] = useState(initial?.cvr ?? "");
  const [website, setWebsite] = useState(initial?.website ?? "");
  const [industry, setIndustry] = useState(initial?.industry ?? "");
  const [employees, setEmployees] = useState<string>(
    initial?.employees != null ? String(initial.employees) : "",
  );
  const [address, setAddress] = useState(initial?.address ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [cvrQuery, setCvrQuery] = useState("");
  const [cvrSearching, setCvrSearching] = useState(false);
  const [cvrResults, setCvrResults] = useState<CvrCompany[] | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        cvr: cvr?.trim() || null,
        website: website?.trim() || null,
        industry: industry?.trim() || null,
        employees: employees.trim() ? Number(employees) : null,
        address: address?.trim() || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSubmitting(false);
    }
  }

  async function runCvrSearch() {
    const q = cvrQuery.trim();
    if (!q) return;
    setCvrSearching(true);
    setCvrResults(null);
    try {
      const results = /^\d{8}$/.test(q)
        ? await cvrLookupByNumber(q).then((r) => (r ? [r] : []))
        : await cvrSearchByName(q);
      setCvrResults(results);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "CVR lookup failed");
    } finally {
      setCvrSearching(false);
    }
  }

  function applyCvr(c: CvrCompany) {
    if (c.name) setName(c.name);
    if (c.vat) setCvr(c.vat);
    if (c.address) setAddress(c.address);
    const ind = c.industryDesc ?? c.industryCode;
    if (ind) setIndustry(ind);
    if (typeof c.employees === "number") setEmployees(String(c.employees));
    if (c.website) setWebsite(c.website);
    setCvrResults(null);
    setCvrQuery("");
    toast.success(`Pre-filled from ${c.name || c.vat}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {cvrEnabled && (
        <div className="space-y-2 rounded-md border bg-muted/30 p-3">
          <Label htmlFor="cvr-search" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Search {businessRegistry!.label}
          </Label>
          <div className="flex gap-2">
            <Input
              id="cvr-search"
              value={cvrQuery}
              onChange={(e) => setCvrQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void runCvrSearch();
                }
              }}
              placeholder={businessRegistry!.searchPlaceholder}
              disabled={cvrSearching}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={runCvrSearch}
              disabled={cvrSearching || !cvrQuery.trim()}
            >
              {cvrSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              <span className="ml-1">Search</span>
            </Button>
          </div>
          {cvrResults !== null && (
            <div className="max-h-48 overflow-y-auto rounded-md border bg-background">
              {cvrResults.length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground">No matches.</p>
              ) : (
                <ul className="divide-y">
                  {cvrResults.map((c) => (
                    <li key={c.vat}>
                      <button
                        type="button"
                        onClick={() => applyCvr(c)}
                        className="flex w-full items-center justify-between gap-2 p-2 text-left text-sm hover:bg-muted"
                      >
                        <div className="min-w-0">
                          <div className="truncate font-medium">{c.name}</div>
                          <div className="truncate text-xs text-muted-foreground">
                            CVR {c.vat} · {c.city || "—"}
                          </div>
                        </div>
                        {c.status && (
                          <Badge variant={c.status === "aktiv" ? "default" : "secondary"}>
                            {c.status}
                          </Badge>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="name">Name *</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="cvr">CVR</Label>
          <Input id="cvr" value={cvr ?? ""} onChange={(e) => setCvr(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            value={website ?? ""}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="industry">Industry</Label>
          <Input
            id="industry"
            value={industry ?? ""}
            onChange={(e) => setIndustry(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="employees">Employees</Label>
          <Input
            id="employees"
            type="number"
            min={0}
            value={employees}
            onChange={(e) => setEmployees(e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="address">Address</Label>
        <Textarea
          id="address"
          value={address ?? ""}
          onChange={(e) => setAddress(e.target.value)}
          rows={3}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
