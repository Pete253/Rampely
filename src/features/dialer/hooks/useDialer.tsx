import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Call, Device } from "@twilio/voice-sdk";
import { supabase } from "@/shared/lib/supabase";
import { useAuth } from "@/shared/hooks/useAuth";
import { useWorkspace } from "@/shared/hooks/useWorkspace";
import type { Database } from "@/integrations/supabase/types";

type CallUpdate = Database["public"]["Tables"]["calls"]["Update"];

export type DialerStatus =
  | "idle"
  | "preparing"
  | "ringing"
  | "in_call"
  | "wrap_up"
  | "not_configured"
  | "error";

export interface CallTarget {
  /** E.164 number — normalise before calling startCall. */
  phone: string;
  contactName: string;
  contactId?: string | null;
  dealId?: string | null;
}

interface DialerContextValue {
  status: DialerStatus;
  target: CallTarget | null;
  error: string | null;
  muted: boolean;
  recording: boolean;
  elapsed: number;
  startCall: (target: CallTarget) => Promise<void>;
  hangUp: () => void;
  toggleMute: () => void;
  setRecording: (on: boolean) => void;
  saveOutcome: (outcome: string | null, notes: string) => Promise<void>;
  dismiss: () => void;
}

const DialerContext = createContext<DialerContextValue | null>(null);

export function useDialer(): DialerContextValue {
  const ctx = useContext(DialerContext);
  if (!ctx) throw new Error("useDialer must be used within DialerProvider");
  return ctx;
}

async function fetchToken(
  workspaceId: string,
): Promise<{ ok: true; token: string } | { ok: false; code?: string; error: string }> {
  const { data, error } = await supabase.functions.invoke("twilio-token", {
    body: { workspaceId },
  });
  if (error) return { ok: false, error: error.message };
  if (!data?.ok) {
    return { ok: false, code: data?.code, error: data?.error ?? "Failed to get token" };
  }
  return { ok: true, token: data.token as string };
}

export function DialerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { workspace } = useWorkspace();

  const [status, setStatus] = useState<DialerStatus>("idle");
  const [target, setTarget] = useState<CallTarget | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [recording, setRecordingState] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const deviceRef = useRef<Device | null>(null);
  const callRef = useRef<Call | null>(null);
  const callRowIdRef = useRef<string | null>(null);
  // status in a ref so SDK event handlers can branch without stale closures
  const statusRef = useRef<DialerStatus>("idle");
  statusRef.current = status;

  // Live call timer
  useEffect(() => {
    if (status !== "in_call") return;
    const startedAt = Date.now();
    setElapsed(0);
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(id);
  }, [status]);

  useEffect(() => {
    return () => {
      deviceRef.current?.destroy();
      deviceRef.current = null;
    };
  }, []);

  const updateCallRow = useCallback(async (patch: CallUpdate) => {
    const id = callRowIdRef.current;
    if (!id) return;
    const { error: err } = await supabase.from("calls").update(patch).eq("id", id);
    if (err) console.error("Failed to update call row", err);
  }, []);

  const ensureDevice = useCallback(async (): Promise<
    { ok: true; device: Device } | { ok: false; code?: string; error: string }
  > => {
    if (!workspace) return { ok: false, error: "No workspace" };
    const tokenRes = await fetchToken(workspace.id);
    if (!tokenRes.ok) return tokenRes;

    if (deviceRef.current) {
      deviceRef.current.updateToken(tokenRes.token);
      return { ok: true, device: deviceRef.current };
    }

    const { Device: TwilioDevice } = await import("@twilio/voice-sdk");
    const device = new TwilioDevice(tokenRes.token, { logLevel: "error" });
    device.on("tokenWillExpire", async () => {
      if (!workspace) return;
      const refreshed = await fetchToken(workspace.id);
      if (refreshed.ok) device.updateToken(refreshed.token);
    });
    device.on("error", (e: { message?: string }) => {
      console.error("Twilio device error", e);
      if (statusRef.current === "ringing" || statusRef.current === "in_call") {
        setError(e.message ?? "Call failed");
        setStatus("error");
      }
    });
    deviceRef.current = device;
    return { ok: true, device };
  }, [workspace]);

  const startCall = useCallback(
    async (nextTarget: CallTarget) => {
      if (!workspace || !user) return;
      if (statusRef.current === "ringing" || statusRef.current === "in_call") return;

      setTarget(nextTarget);
      setError(null);
      setMuted(false);
      setElapsed(0);
      setStatus("preparing");

      const deviceRes = await ensureDevice();
      if (!deviceRes.ok) {
        setStatus(deviceRes.code === "not_configured" ? "not_configured" : "error");
        if (deviceRes.code !== "not_configured") setError(deviceRes.error);
        return;
      }

      // Log the call up front — the BEFORE INSERT trigger creates the
      // timeline activity, and the status webhook enriches this row.
      const { data: row, error: insertErr } = await supabase
        .from("calls")
        .insert({
          workspace_id: workspace.id,
          user_id: user.id,
          contact_id: nextTarget.contactId ?? null,
          deal_id: nextTarget.dealId ?? null,
          to_number: nextTarget.phone,
          direction: "outbound",
          status: "initiated",
          source: "twilio",
        })
        .select("id")
        .single();
      if (insertErr || !row) {
        setError(insertErr?.message ?? "Failed to log call");
        setStatus("error");
        return;
      }
      callRowIdRef.current = row.id;

      try {
        const call = await deviceRes.device.connect({
          params: { To: nextTarget.phone, Record: recording ? "true" : "false" },
        });
        callRef.current = call;
        setStatus("ringing");

        call.on("accept", () => {
          setStatus("in_call");
          const sid = call.parameters.CallSid;
          void updateCallRow({ twilio_call_sid: sid ?? null, status: "in-progress" });
        });
        call.on("disconnect", () => {
          callRef.current = null;
          setStatus("wrap_up");
        });
        call.on("cancel", () => {
          callRef.current = null;
          setStatus("wrap_up");
        });
        call.on("error", (e: { message?: string }) => {
          console.error("Twilio call error", e);
          callRef.current = null;
          setError(e.message ?? "Call failed");
          setStatus("error");
        });
        call.on("mute", (isMuted: boolean) => setMuted(isMuted));
      } catch (e) {
        console.error("Failed to start call", e);
        setError(
          e instanceof Error && /permission|NotAllowed/i.test(e.message)
            ? "Microphone access was blocked — allow it in your browser and try again."
            : e instanceof Error
              ? e.message
              : "Failed to start call",
        );
        setStatus("error");
        void updateCallRow({ status: "failed" });
      }
    },
    [workspace, user, recording, ensureDevice, updateCallRow],
  );

  // Persist the elapsed duration as a fallback when the call wraps up; the
  // Twilio status webhook remains the source of truth when it arrives.
  const elapsedRef = useRef(0);
  elapsedRef.current = elapsed;
  useEffect(() => {
    if (status === "wrap_up" && elapsedRef.current > 0) {
      void updateCallRow({ status: "completed", duration: elapsedRef.current });
    }
  }, [status, updateCallRow]);

  const hangUp = useCallback(() => {
    callRef.current?.disconnect();
    deviceRef.current?.disconnectAll();
  }, []);

  const toggleMute = useCallback(() => {
    const call = callRef.current;
    if (!call) return;
    call.mute(!call.isMuted());
  }, []);

  const setRecording = useCallback((on: boolean) => {
    // Recording is decided before the call goes out (TwiML param).
    if (statusRef.current === "ringing" || statusRef.current === "in_call") return;
    setRecordingState(on);
  }, []);

  const saveOutcome = useCallback(
    async (outcome: string | null, notes: string) => {
      await updateCallRow({
        outcome,
        notes: notes.trim() || null,
      });
      callRowIdRef.current = null;
      setTarget(null);
      setStatus("idle");
    },
    [updateCallRow],
  );

  const dismiss = useCallback(() => {
    callRef.current?.disconnect();
    callRef.current = null;
    callRowIdRef.current = null;
    setTarget(null);
    setError(null);
    setStatus("idle");
  }, []);

  return (
    <DialerContext.Provider
      value={{
        status,
        target,
        error,
        muted,
        recording,
        elapsed,
        startCall,
        hangUp,
        toggleMute,
        setRecording,
        saveOutcome,
        dismiss,
      }}
    >
      {children}
    </DialerContext.Provider>
  );
}
