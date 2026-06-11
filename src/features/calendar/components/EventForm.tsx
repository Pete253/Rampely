import { useMemo, useState } from "react";
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
import { EVENT_COLOR_PALETTE, formatDuration } from "../lib/calendar-utils";
import { cn } from "@/lib/utils";
import type { CreateEventInput, EventType, CalendarEvent } from "../hooks/useCalendarEvents";

interface Props {
  initial?: Partial<CalendarEvent>;
  onSubmit: (input: CreateEventInput) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

function toLocalInput(d: Date | string | undefined | null): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

export function EventForm({ initial, onSubmit, onCancel, submitLabel = "Create event" }: Props) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [eventType, setEventType] = useState<EventType>(initial?.event_type ?? "meeting");
  const [start, setStart] = useState(toLocalInput(initial?.start_at) || toLocalInput(new Date()));
  const [end, setEnd] = useState(
    toLocalInput(initial?.end_at) ||
      toLocalInput(new Date(Date.now() + 60 * 60 * 1000)),
  );
  const [location, setLocation] = useState(initial?.location ?? "");
  const [videoUrl, setVideoUrl] = useState(initial?.video_url ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [companyId, setCompanyId] = useState<string | null>(initial?.company_id ?? null);
  const [contactId, setContactId] = useState<string | null>(initial?.contact_id ?? null);
  const [dealId, setDealId] = useState<string | null>(initial?.deal_id ?? null);
  const [color, setColor] = useState<string | null>(initial?.color ?? null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const duration = useMemo(() => {
    if (!start || !end) return null;
    const s = new Date(start);
    const e = new Date(end);
    if (e <= s) return null;
    return formatDuration(s, e);
  }, [start, end]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (!(endDate > startDate)) {
      setError("End time must be after start time");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        event_type: eventType,
        start_at: startDate.toISOString(),
        end_at: endDate.toISOString(),
        location: location.trim() || null,
        video_url: videoUrl.trim() || null,
        description: description.trim() || null,
        color,
        company_id: companyId,
        contact_id: contactId,
        deal_id: dealId,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save event");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="event-title">Title</Label>
        <Input
          id="event-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Meeting with…"
          autoFocus
        />
      </div>

      <div className="space-y-1.5">
        <Label>Type</Label>
        <Select value={eventType} onValueChange={(v) => setEventType(v as EventType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="meeting">Meeting</SelectItem>
            <SelectItem value="call">Call</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Colour</Label>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setColor(null)}
            aria-label="Default colour (from event type)"
            className={cn(
              "h-7 w-7 rounded-full border-2 bg-background flex items-center justify-center text-[10px] text-muted-foreground transition",
              color === null
                ? "border-foreground ring-2 ring-foreground/20"
                : "border-border hover:border-foreground/40",
            )}
          >
            ✕
          </button>
          {EVENT_COLOR_PALETTE.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setColor(p.key)}
              aria-label={p.label}
              title={p.label}
              className={cn(
                "h-7 w-7 rounded-full border-2 transition",
                p.swatchClass,
                color === p.key
                  ? "border-foreground ring-2 ring-foreground/20 scale-110"
                  : "border-transparent hover:scale-105",
              )}
            />
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">
          Default uses the type colour (meeting / call / other).
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="event-start">Start</Label>
          <Input
            id="event-start"
            type="datetime-local"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="event-end">
            End {duration && <span className="text-xs text-muted-foreground">({duration})</span>}
          </Label>
          <Input
            id="event-end"
            type="datetime-local"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="event-location">Location</Label>
        <Input
          id="event-location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Video, Phone, or address"
          list="location-suggestions"
        />
        <datalist id="location-suggestions">
          <option value="Video" />
          <option value="Phone" />
          <option value="Office" />
        </datalist>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="event-video">Video URL</Label>
        <Input
          id="event-video"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="https://…"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="event-desc">Description</Label>
        <Textarea
          id="event-desc"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
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
