import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: string | number | null | undefined;
  onSave: (value: string | null) => Promise<void>;
  type?: "text" | "number" | "email" | "url";
  multiline?: boolean;
  placeholder?: string;
};

export function InlineField({
  label,
  value,
  onSave,
  type = "text",
  multiline,
  placeholder,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>(value != null ? String(value) : "");
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!editing) setDraft(value != null ? String(value) : "");
  }, [value, editing]);

  useEffect(() => {
    if (editing) ref.current?.focus();
  }, [editing]);

  async function commit() {
    const trimmed = draft.trim();
    const newVal = trimmed === "" ? null : trimmed;
    const current = value != null ? String(value) : null;
    if (newVal === current) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(newVal);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  function handleKey(e: KeyboardEvent) {
    if (e.key === "Enter" && !multiline) {
      e.preventDefault();
      void commit();
    } else if (e.key === "Escape") {
      setEditing(false);
      setDraft(value != null ? String(value) : "");
    }
  }

  return (
    <div className="space-y-1">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      {editing ? (
        multiline ? (
          <Textarea
            ref={ref as React.RefObject<HTMLTextAreaElement>}
            value={draft}
            disabled={saving}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={handleKey}
            rows={3}
          />
        ) : (
          <Input
            ref={ref as React.RefObject<HTMLInputElement>}
            type={type}
            value={draft}
            disabled={saving}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={handleKey}
          />
        )
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={cn(
            "w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent",
            value == null || value === "" ? "text-muted-foreground italic" : "text-foreground",
          )}
        >
          {value == null || value === "" ? (placeholder ?? "Empty") : String(value)}
        </button>
      )}
    </div>
  );
}
