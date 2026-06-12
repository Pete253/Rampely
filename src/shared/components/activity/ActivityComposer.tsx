import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  ACTIVITY_TYPES,
  ACTIVITY_TYPE_META,
  CALL_OUTCOMES,
  type ActivityType,
  type CallOutcome,
} from "@/shared/lib/activity-types";
import type { CreateActivityInput } from "@/shared/hooks/useActivities";

interface Props {
  onCreate: (input: CreateActivityInput) => Promise<unknown>;
}

export function ActivityComposer({ onCreate }: Props) {
  const [type, setType] = useState<ActivityType>("note");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [outcome, setOutcome] = useState<CallOutcome>("Connected");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!subject.trim() && !body.trim()) {
      toast.error("Add a subject or note body");
      return;
    }
    setSubmitting(true);
    try {
      const finalBody =
        type === "call" && body.trim()
          ? `${body.trim()}\n\n[Outcome: ${outcome}]`
          : type === "call"
            ? `[Outcome: ${outcome}]`
            : body.trim() || null;
      await onCreate({
        type,
        subject: subject.trim() || null,
        body: finalBody,
      });
      setSubject("");
      setBody("");
      toast.success("Activity logged");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to log activity");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap gap-1.5">
        {ACTIVITY_TYPES.map((t) => {
          const meta = ACTIVITY_TYPE_META[t];
          const Icon = meta.icon;
          const active = t === type;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                active
                  ? `${meta.badgeClass} border-transparent`
                  : "border-border bg-background text-muted-foreground hover:bg-muted",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {meta.label}
            </button>
          );
        })}
      </div>

      <Input
        placeholder="Subject (optional)"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
      />

      <Textarea
        placeholder={`Log a ${ACTIVITY_TYPE_META[type].label.toLowerCase()}...`}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        className="min-h-[80px]"
      />

      <div className="flex items-center justify-between gap-3">
        {type === "call" ? (
          <Select value={outcome} onValueChange={(v) => setOutcome(v as CallOutcome)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CALL_OUTCOMES.map((o) => (
                <SelectItem key={o} value={o}>
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span />
        )}
        <Button type="submit" size="sm" disabled={submitting}>
          {submitting ? "Logging..." : "Log activity"}
        </Button>
      </div>
    </form>
  );
}
