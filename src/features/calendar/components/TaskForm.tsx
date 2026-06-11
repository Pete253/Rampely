import { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CompanySelector } from "@/features/contacts/components/CompanySelector";
import { ContactSelector } from "@/features/pipeline/components/ContactSelector";
import { DealSelector } from "./DealSelector";
import type { CreateTaskInput, TaskPriority, TaskRecord } from "../hooks/useTasks";

interface Props {
  initial?: Partial<TaskRecord> & { dealId?: string; contactId?: string; companyId?: string };
  onSubmit: (input: CreateTaskInput) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

function toLocalInput(d: string | null | undefined): string {
  if (!d) return "";
  return format(new Date(d), "yyyy-MM-dd'T'HH:mm");
}

export function TaskForm({ initial, onSubmit, onCancel, submitLabel = "Create task" }: Props) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [priority, setPriority] = useState<TaskPriority>(initial?.priority ?? "medium");
  const [due, setDue] = useState(toLocalInput(initial?.due_at));
  const [companyId, setCompanyId] = useState<string | null>(
    initial?.company_id ?? initial?.companyId ?? null,
  );
  const [contactId, setContactId] = useState<string | null>(
    initial?.contact_id ?? initial?.contactId ?? null,
  );
  const [dealId, setDealId] = useState<string | null>(initial?.deal_id ?? initial?.dealId ?? null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || null,
        priority,
        due_at: due ? new Date(due).toISOString() : null,
        company_id: companyId,
        contact_id: contactId,
        deal_id: dealId,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save task");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="task-title">Title</Label>
        <Input
          id="task-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="task-desc">Description</Label>
        <Textarea
          id="task-desc"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Priority</Label>
          <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="task-due">Due</Label>
          <Input
            id="task-due"
            type="datetime-local"
            value={due}
            onChange={(e) => setDue(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Company</Label>
          <CompanySelector
            value={companyId}
            onChange={(v) => {
              setCompanyId(v);
              setContactId(null);
              setDealId(null);
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Contact</Label>
          <ContactSelector value={contactId} onChange={setContactId} companyId={companyId} />
        </div>
        <div className="space-y-1.5">
          <Label>Deal</Label>
          <DealSelector value={dealId} onChange={setDealId} companyId={companyId} />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
