/**
 * Best-effort normalisation of a stored phone number to E.164 using the
 * workspace's country dial code. Contacts should hold E.164 already (data
 * contract), but imported data often has national formats.
 */
export function normalizeToE164(raw: string, defaultDialCode: string): string | null {
  let value = raw.trim().replace(/[\s\-().]/g, "");
  if (!value) return null;
  if (value.startsWith("00")) value = `+${value.slice(2)}`;
  if (!value.startsWith("+")) {
    // National format: drop a single trunk prefix 0 (no-op for DK/NO/SE
    // which don't use one) and prepend the workspace dial code.
    value = `${defaultDialCode}${value.replace(/^0/, "")}`;
  }
  return /^\+[1-9]\d{5,14}$/.test(value) ? value : null;
}

export function formatCallDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
