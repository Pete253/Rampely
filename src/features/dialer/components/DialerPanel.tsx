import { useState } from "react";
import { Mic, MicOff, Phone, PhoneOff, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { CALL_OUTCOMES } from "@/shared/lib/activity-types";
import { useCountryFeatures } from "@/shared/hooks/useCountryFeatures";
import { useWorkspace } from "@/shared/hooks/useWorkspace";
import { useDialer } from "../hooks/useDialer";
import { formatCallDuration } from "../lib/phone-utils";

const CONSENT_COPY: Record<string, string | null> = {
  one_party: null,
  inform: "Remember to tell the other party the call is recorded.",
  all_party: "Recording requires consent from everyone on the call.",
};

/** Floating softphone — rendered once inside the authenticated shell. */
export function DialerPanel() {
  const dialer = useDialer();
  const { role } = useWorkspace();
  const { recordingConsentMode } = useCountryFeatures();

  if (dialer.status === "idle") return null;

  return (
    <div className="shadow-modal fixed bottom-5 right-5 z-50 w-[320px] rounded-xl border border-white/10 bg-surface-2">
      <div className="flex items-center justify-between border-b border-white/7 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <StatusDot status={dialer.status} />
          <span className="overline-label text-white/50">{statusLabel(dialer.status)}</span>
        </div>
        {(dialer.status === "wrap_up" ||
          dialer.status === "error" ||
          dialer.status === "not_configured") && (
          <button
            type="button"
            aria-label="Close dialer"
            onClick={dialer.dismiss}
            className="rounded-sm p-1 text-white/40 transition-colors hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="p-4">
        {dialer.status === "not_configured" ? (
          <NotConfigured isAdmin={role === "owner" || role === "admin"} />
        ) : dialer.status === "error" ? (
          <ErrorState message={dialer.error} />
        ) : dialer.status === "wrap_up" ? (
          <WrapUp />
        ) : (
          <ActiveCall consentCopy={CONSENT_COPY[recordingConsentMode] ?? null} />
        )}
      </div>
    </div>
  );
}

function statusLabel(status: string): string {
  switch (status) {
    case "preparing":
      return "Connecting";
    case "ringing":
      return "Calling";
    case "in_call":
      return "Live";
    case "wrap_up":
      return "Call ended";
    case "not_configured":
      return "Setup needed";
    case "error":
      return "Call failed";
    default:
      return "";
  }
}

function StatusDot({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "h-2 w-2 rounded-full",
        status === "in_call" && "animate-pulse bg-success",
        (status === "ringing" || status === "preparing") && "animate-pulse bg-warning",
        status === "wrap_up" && "bg-white/30",
        (status === "error" || status === "not_configured") && "bg-danger",
      )}
    />
  );
}

function ActiveCall({ consentCopy }: { consentCopy: string | null }) {
  const dialer = useDialer();
  const inCall = dialer.status === "in_call";
  const initials =
    dialer.target?.contactName
      .split(/\s+/)
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ?? "?";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold">{dialer.target?.contactName}</div>
          <div className="text-xs text-white/40">{dialer.target?.phone}</div>
        </div>
        <div className="text-sm font-bold tabular-nums text-primary-light">
          {inCall ? formatCallDuration(dialer.elapsed) : "…"}
        </div>
      </div>

      {/* Recording is locked once the call goes out (TwiML decision). */}
      <div className="rounded-[10px] bg-white/5 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-white/70">
            {dialer.recording ? "Recording on" : "Record call"}
          </span>
          <Switch
            checked={dialer.recording}
            onCheckedChange={dialer.setRecording}
            disabled={inCall || dialer.status === "ringing"}
            aria-label="Record call"
          />
        </div>
        {dialer.recording && consentCopy && (
          <p className="mt-1.5 text-[11px] leading-snug text-warning">{consentCopy}</p>
        )}
      </div>

      <div className="flex items-center justify-center gap-3">
        <Button
          variant="secondary"
          size="icon"
          className="h-11 w-11 rounded-full"
          onClick={dialer.toggleMute}
          disabled={!inCall}
          aria-label={dialer.muted ? "Unmute" : "Mute"}
        >
          {dialer.muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </Button>
        <button
          type="button"
          onClick={dialer.hangUp}
          aria-label="End call"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-danger text-white transition-transform hover:scale-105"
        >
          <PhoneOff className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

function WrapUp() {
  const dialer = useDialer();
  const [outcome, setOutcome] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async (selected: string | null) => {
    setSaving(true);
    try {
      await dialer.saveOutcome(selected, notes);
      toast.success("Call logged");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to log call");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <div className="text-sm font-bold">{dialer.target?.contactName}</div>
        <div className="text-xs text-white/40">
          {dialer.elapsed > 0
            ? `Call length ${formatCallDuration(dialer.elapsed)}`
            : "Not connected"}
        </div>
      </div>

      <div>
        <div className="overline-label mb-1.5 text-white/50">Outcome</div>
        <div className="flex flex-wrap gap-1.5">
          {CALL_OUTCOMES.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => setOutcome(outcome === o ? null : o)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[11px] font-bold transition-colors",
                outcome === o
                  ? "border-primary/30 bg-primary/20 text-primary-light"
                  : "border-white/15 bg-white/5 text-white/60 hover:bg-white/10",
              )}
            >
              {o}
            </button>
          ))}
        </div>
      </div>

      <Textarea
        placeholder="Notes from the call…"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="min-h-[64px] text-sm"
      />

      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" disabled={saving} onClick={() => void save(null)}>
          Skip
        </Button>
        <Button size="sm" disabled={saving || !outcome} onClick={() => void save(outcome)}>
          {saving ? "Saving…" : "Save outcome"}
        </Button>
      </div>
    </div>
  );
}

function NotConfigured({ isAdmin }: { isAdmin: boolean }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-bold">
        <Phone className="h-4 w-4 text-primary-light" /> Dialer not set up yet
      </div>
      <p className="text-xs leading-relaxed text-white/55">
        {isAdmin
          ? "Add the Twilio secrets (account SID, API key, TwiML app and caller ID) to your backend to enable calling from the browser."
          : "Ask a workspace admin to connect Twilio to enable calling from the browser."}
      </p>
    </div>
  );
}

function ErrorState({ message }: { message: string | null }) {
  return (
    <div className="space-y-1">
      <div className="text-sm font-bold text-danger">Call failed</div>
      <p className="text-xs leading-relaxed text-white/55">{message ?? "Something went wrong."}</p>
    </div>
  );
}
