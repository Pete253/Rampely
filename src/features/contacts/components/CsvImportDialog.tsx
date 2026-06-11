import { useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import { Upload, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/shared/lib/supabase";
import { useWorkspace } from "@/shared/hooks/useWorkspace";
import { useCountryFeatures } from "@/shared/hooks/useCountryFeatures";
import { useCompanies } from "../hooks/useCompanies";
import {
  CONTACT_FIELDS,
  COMPANY_FIELDS,
  autoMap,
  mapRow,
  chunk,
  type FieldKey,
  type FieldDef,
} from "../lib/csv-import";
import { cvrLookupByNumber } from "@/shared/lib/cvr-api";

type Entity = "contacts" | "companies";
type Step = "upload" | "mapping" | "preview" | "import";

interface Props {
  entity: Entity;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

const MAX_BYTES = 5 * 1024 * 1024;

export function CsvImportDialog({ entity, open, onOpenChange, onImported }: Props) {
  const { workspace } = useWorkspace();
  const { businessRegistry } = useCountryFeatures();
  const cvrEnabled = businessRegistry?.id === "cvr";
  const { companies } = useCompanies();
  const fields: FieldDef[] = entity === "contacts" ? CONTACT_FIELDS : COMPANY_FIELDS;

  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, FieldKey | null>>({});
  const [enrich, setEnrich] = useState(false);
  const [progress, setProgress] = useState(0);
  const [enrichProgress, setEnrichProgress] = useState<{ done: number; total: number } | null>(null);
  const [importing, setImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const companyIdByName = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of companies) m.set(c.name.toLowerCase().trim(), c.id);
    return m;
  }, [companies]);

  function reset() {
    setStep("upload");
    setFile(null);
    setHeaders([]);
    setRows([]);
    setMapping({});
    setEnrich(false);
    setProgress(0);
    setEnrichProgress(null);
    setImporting(false);
  }

  function handleClose(o: boolean) {
    if (importing) return;
    if (!o) reset();
    onOpenChange(o);
  }

  function handleFile(f: File) {
    if (f.size > MAX_BYTES) {
      toast.error("File too large. Max 5 MB.");
      return;
    }
    if (!/\.csv$/i.test(f.name)) {
      toast.error("Only .csv files are supported.");
      return;
    }
    Papa.parse<Record<string, string>>(f, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        if (res.errors.length > 0) {
          toast.error(`CSV parse error: ${res.errors[0].message}`);
          return;
        }
        const hs = res.meta.fields ?? [];
        if (hs.length === 0) {
          toast.error("No columns found in CSV.");
          return;
        }
        setFile(f);
        setHeaders(hs);
        setRows(res.data);
        setMapping(autoMap(hs, fields));
        setStep("mapping");
      },
      error: (err) => toast.error(`CSV parse error: ${err.message}`),
    });
  }

  const requiredKeys = fields.filter((f) => f.required).map((f) => f.key);
  const mappedKeys = new Set(Object.values(mapping).filter(Boolean));
  const requiredOk = requiredKeys.every((k) => mappedKeys.has(k));

  const mappedRows = useMemo(
    () => rows.map((r) => mapRow(r, mapping, fields)),
    [rows, mapping, fields],
  );
  const validCount = mappedRows.filter((r) => r.missing.length === 0).length;
  const skipCount = mappedRows.length - validCount;

  async function runImport() {
    if (!workspace) {
      toast.error("No workspace");
      return;
    }
    setImporting(true);
    setStep("import");
    setProgress(0);

    const valid = mappedRows.filter((r) => r.missing.length === 0);
    const total = valid.length;
    let inserted = 0;
    const insertedCompanies: { id: string; cvr: string | null }[] = [];
    let unmatchedCompanyName = 0;

    const batches = chunk(valid, 50);
    for (const batch of batches) {
      const records = batch.map((r) => {
        const v = r.values as Record<string, string>;
        if (entity === "contacts") {
          let companyId: string | null = null;
          if (v.company_name) {
            const id = companyIdByName.get(v.company_name.toLowerCase().trim());
            if (id) companyId = id;
            else unmatchedCompanyName += 1;
          }
          return {
            workspace_id: workspace.id,
            first_name: v.first_name ?? "",
            last_name: v.last_name ?? null,
            email: v.email ?? null,
            phone: v.phone ?? null,
            title: v.title ?? null,
            company_id: companyId,
          };
        }
        return {
          workspace_id: workspace.id,
          name: v.name ?? "",
          cvr: v.cvr ?? null,
          website: v.website ?? null,
          industry: v.industry ?? null,
          employees: v.employees ? Number(v.employees) || null : null,
          address: v.address ?? null,
        };
      });

      const selectCols = entity === "companies" ? "id, cvr" : "id";
      const { data, error } = await supabase
        .from(entity)
        .insert(records as never)
        .select(selectCols);
      if (error) {
        toast.error(`Import failed: ${error.message}`);
        setImporting(false);
        return;
      }
      const rowsBack = (data ?? []) as unknown as { id: string; cvr?: string | null }[];
      inserted += rowsBack.length;
      if (entity === "companies") {
        for (const d of rowsBack) {
          insertedCompanies.push({ id: d.id, cvr: d.cvr ?? null });
        }
      }
      setProgress(Math.round((inserted / total) * 100));
    }

    let extra = "";
    if (entity === "contacts" && unmatchedCompanyName > 0) {
      extra = ` (${unmatchedCompanyName} contacts left without company link)`;
    }
    toast.success(`Imported ${inserted}, skipped ${skipCount}${extra}`);

    if (entity === "companies" && enrich && cvrEnabled) {
      const targets = insertedCompanies.filter(
        (c) => c.cvr && /^\d{8}$/.test(c.cvr),
      );
      if (targets.length > 0) {
        setEnrichProgress({ done: 0, total: targets.length });
        for (let i = 0; i < targets.length; i++) {
          const t = targets[i];
          try {
            const data = await cvrLookupByNumber(t.cvr!);
            if (data) {
              const patch: Record<string, unknown> = {};
              if (data.address) patch.address = data.address;
              if (data.industryDesc ?? data.industryCode)
                patch.industry = data.industryDesc ?? data.industryCode;
              if (typeof data.employees === "number") patch.employees = data.employees;
              if (data.website) patch.website = data.website;
              if (Object.keys(patch).length > 0) {
                await supabase
                  .from("companies")
                  .update(patch as never)
                  .eq("id", t.id)
                  .eq("workspace_id", workspace.id);
              }
            }
          } catch (e) {
            console.error("CVR enrich failed", t.cvr, e);
          }
          setEnrichProgress({ done: i + 1, total: targets.length });
          await new Promise((r) => setTimeout(r, 350));
        }
        toast.success(`Enriched ${targets.length} companies from CVR`);
      }
    }

    onImported();
    setImporting(false);
    handleClose(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            Import {entity === "contacts" ? "contacts" : "companies"} from CSV
          </DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files?.[0];
              if (f) handleFile(f);
            }}
            onClick={() => inputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-12 text-center transition-colors ${
              dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25"
            }`}
          >
            <Upload className="h-8 w-8 text-muted-foreground" />
            <div className="text-sm font-medium">Drop CSV file here, or click to browse</div>
            <div className="text-xs text-muted-foreground">Max 5 MB · .csv only</div>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />
          </div>
        )}

        {step === "mapping" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              {file?.name} · {rows.length} rows
            </div>
            <div className="max-h-80 overflow-y-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>CSV column</TableHead>
                    <TableHead>Maps to</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {headers.map((h) => (
                    <TableRow key={h}>
                      <TableCell className="font-mono text-xs">{h}</TableCell>
                      <TableCell>
                        <Select
                          value={mapping[h] ?? "__ignore__"}
                          onValueChange={(val) =>
                            setMapping((m) => ({
                              ...m,
                              [h]: val === "__ignore__" ? null : (val as FieldKey),
                            }))
                          }
                        >
                          <SelectTrigger className="h-8 w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__ignore__">— Ignore —</SelectItem>
                            {fields.map((f) => (
                              <SelectItem key={f.key} value={f.key}>
                                {f.label}
                                {f.required ? " *" : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {!requiredOk && (
              <p className="text-sm text-destructive">
                Map all required fields:{" "}
                {fields
                  .filter((f) => f.required && !mappedKeys.has(f.key))
                  .map((f) => f.label)
                  .join(", ")}
              </p>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("upload")}>
                Back
              </Button>
              <Button disabled={!requiredOk} onClick={() => setStep("preview")}>
                Continue
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-3">
            <div className="max-h-80 overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {fields
                      .filter((f) => mappedKeys.has(f.key))
                      .map((f) => (
                        <TableHead key={f.key}>{f.label}</TableHead>
                      ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mappedRows.slice(0, 5).map((r, i) => {
                    const skip = r.missing.length > 0;
                    return (
                      <TableRow
                        key={i}
                        className={skip ? "bg-yellow-100/50 dark:bg-yellow-900/20" : ""}
                      >
                        {fields
                          .filter((f) => mappedKeys.has(f.key))
                          .map((f) => (
                            <TableCell key={f.key} className="text-xs">
                              {(r.values as Record<string, string>)[f.key] ?? (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          ))}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <p className="text-sm text-muted-foreground">
              Importing {validCount} records, skipping {skipCount} rows with missing required fields.
            </p>
            {entity === "companies" && cvrEnabled && mappedKeys.has("cvr") && (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="enrich"
                  checked={enrich}
                  onCheckedChange={(v) => setEnrich(v === true)}
                />
                <Label htmlFor="enrich" className="text-sm font-normal">
                  Enrich from CVR after import (fills missing address, industry, employees, website)
                </Label>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("mapping")}>
                Back
              </Button>
              <Button disabled={validCount === 0} onClick={runImport}>
                Import {validCount} {entity}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "import" && (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Importing… {progress}%
            </div>
            <Progress value={progress} />
            {enrichProgress && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  Enriching {enrichProgress.done}/{enrichProgress.total} from CVR…
                </p>
                <Progress
                  value={Math.round((enrichProgress.done / enrichProgress.total) * 100)}
                />
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
