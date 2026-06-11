import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CompanySelector } from "./CompanySelector";
import type { ContactInput } from "../hooks/useContacts";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Props = {
  initial?: Partial<ContactInput>;
  lockCompany?: boolean;
  submitLabel?: string;
  onSubmit: (input: ContactInput) => Promise<void>;
  onCancel?: () => void;
};

export function ContactForm({
  initial,
  lockCompany,
  submitLabel = "Create",
  onSubmit,
  onCancel,
}: Props) {
  const [firstName, setFirstName] = useState(initial?.first_name ?? "");
  const [lastName, setLastName] = useState(initial?.last_name ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [companyId, setCompanyId] = useState<string | null>(initial?.company_id ?? null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!firstName.trim()) return setError("First name is required");
    if (!lastName?.trim()) return setError("Last name is required");
    if (email && email.trim() && !EMAIL_RE.test(email.trim())) {
      return setError("Invalid email format");
    }
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        title: title?.trim() || null,
        company_id: companyId,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="first_name">First name *</Label>
          <Input
            id="first_name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            autoFocus
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="last_name">Last name *</Label>
          <Input
            id="last_name"
            value={lastName ?? ""}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="title">Title</Label>
        <Input id="title" value={title ?? ""} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email ?? ""}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" value={phone ?? ""} onChange={(e) => setPhone(e.target.value)} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Company</Label>
        <CompanySelector value={companyId} onChange={setCompanyId} disabled={lockCompany} />
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
