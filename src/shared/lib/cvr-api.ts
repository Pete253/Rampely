/**
 * Typed client for the Danish CVR registry.
 * Calls are proxied through a backend function to avoid CORS issues
 * (cvrapi.dk doesn't send CORS headers).
 */

import { supabase } from "@/integrations/supabase/client";

export interface CvrCompany {
  name: string;
  vat: string;
  address: string;
  zipcode: string;
  city: string;
  phone?: string;
  email?: string;
  employees?: number;
  industryCode?: string;
  industryDesc?: string;
  status?: string;
  startdate?: string;
  website?: string;
}

export class CvrError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "CvrError";
    this.status = status;
  }
}

// ---------- client-side cache ----------

const CACHE_NUMBER = new Map<string, { ts: number; value: CvrCompany | null }>();
const CACHE_NAME = new Map<string, { ts: number; value: CvrCompany[] }>();
const TTL_MS = 10 * 60 * 1000;

function cacheGetNumber(key: string): CvrCompany | null | undefined {
  const hit = CACHE_NUMBER.get(key);
  if (!hit) return undefined;
  if (Date.now() - hit.ts > TTL_MS) {
    CACHE_NUMBER.delete(key);
    return undefined;
  }
  return hit.value;
}

function cacheGetName(key: string): CvrCompany[] | undefined {
  const hit = CACHE_NAME.get(key);
  if (!hit) return undefined;
  if (Date.now() - hit.ts > TTL_MS) {
    CACHE_NAME.delete(key);
    return undefined;
  }
  return hit.value;
}

// ---------- edge function call ----------

interface EdgeOk {
  ok: true;
  data: CvrCompany | CvrCompany[] | null;
}
interface EdgeErr {
  ok: false;
  error: string;
  statusCode?: number;
}
type EdgeResponse = EdgeOk | EdgeErr;

async function invokeProxy(type: "number" | "name", query: string): Promise<EdgeResponse> {
  const { data, error } = await supabase.functions.invoke("cvr-lookup", {
    body: { type, query },
  });

  if (error) {
    throw new CvrError("Could not reach CVR service.");
  }

  return data as EdgeResponse;
}

// ---------- public API ----------

export async function cvrLookupByNumber(cvr: string): Promise<CvrCompany | null> {
  const key = `cvr:${cvr}`;
  const cached = cacheGetNumber(key);
  if (cached !== undefined) return cached;

  const res = await invokeProxy("number", cvr);

  if (!res.ok) {
    const err = res as EdgeErr;
    if (err.statusCode === 429)
      throw new CvrError("CVR registry rate limit reached. Try again in a moment.", 429);
    if (err.statusCode && err.statusCode >= 500)
      throw new CvrError("CVR registry is temporarily unavailable.", err.statusCode);
    throw new CvrError(err.error || "CVR lookup failed");
  }

  const value = res.data as CvrCompany | null;
  CACHE_NUMBER.set(key, { ts: Date.now(), value });
  return value;
}

export async function cvrSearchByName(name: string, _limit = 10): Promise<CvrCompany[]> {
  const trimmed = name.trim();
  if (!trimmed) return [];
  const key = `name:${trimmed.toLowerCase()}`;
  const cached = cacheGetName(key);
  if (cached !== undefined) return cached;

  const res = await invokeProxy("name", trimmed);

  if (!res.ok) {
    const err = res as EdgeErr;
    if (err.statusCode === 429)
      throw new CvrError("CVR registry rate limit reached. Try again in a moment.", 429);
    if (err.statusCode && err.statusCode >= 500)
      throw new CvrError("CVR registry is temporarily unavailable.", err.statusCode);
    throw new CvrError(err.error || "CVR search failed");
  }

  const value = (res.data as CvrCompany[]) ?? [];
  CACHE_NAME.set(key, { ts: Date.now(), value });
  return value;
}
