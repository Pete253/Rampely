import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

interface CvrCompany {
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

interface RawCvr {
  name?: string;
  vat?: number | string;
  address?: string;
  zipcode?: number | string;
  city?: string;
  phone?: string | number;
  email?: string;
  employees?: number;
  industrycode?: number | string;
  industrydesc?: string;
  lifecycle?: { status?: string }[] | string;
  startdate?: string;
  homepage?: string;
  productionunits?: { homepage?: string }[];
  error?: string;
}

function mapRaw(raw: RawCvr): CvrCompany | null {
  if (!raw || raw.error || !raw.vat) return null;
  const street = raw.address ?? "";
  const zip = raw.zipcode != null ? String(raw.zipcode) : "";
  const city = raw.city ?? "";
  const fullAddress = [street, [zip, city].filter(Boolean).join(" ")].filter(Boolean).join(", ");

  let status: string | undefined;
  if (Array.isArray(raw.lifecycle) && raw.lifecycle.length > 0) {
    status = raw.lifecycle[raw.lifecycle.length - 1]?.status;
  } else if (typeof raw.lifecycle === "string") {
    status = raw.lifecycle;
  }

  let website = raw.homepage ?? undefined;
  if (!website && Array.isArray(raw.productionunits)) {
    website = raw.productionunits.find((u) => u.homepage)?.homepage;
  }

  return {
    name: raw.name ?? "",
    vat: String(raw.vat),
    address: fullAddress,
    zipcode: zip,
    city,
    phone: raw.phone != null ? String(raw.phone) : undefined,
    email: raw.email,
    employees: typeof raw.employees === "number" ? raw.employees : undefined,
    industryCode: raw.industrycode != null ? String(raw.industrycode) : undefined,
    industryDesc: raw.industrydesc,
    status,
    startdate: raw.startdate,
    website,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return json({ ok: false, error: "Method not allowed" }, 405);
  }

  // Verify JWT
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ ok: false, error: "Missing authorization" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return json({ ok: false, error: "Unauthorized" }, 401);
  }

  // Parse & validate input
  let body: { type?: string; query?: string };
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "Invalid JSON body" }, 400);
  }

  const { type, query } = body;
  if (type !== "number" && type !== "name") {
    return json({ ok: false, error: 'type must be "number" or "name"' }, 400);
  }
  if (!query || typeof query !== "string" || query.length > 200) {
    return json({ ok: false, error: "query is required (max 200 chars)" }, 400);
  }

  const trimmed = query.trim();
  if (type === "number" && !/^\d{8}$/.test(trimmed)) {
    return json({ ok: false, error: "CVR number must be exactly 8 digits" }, 400);
  }

  // Call cvrapi.dk server-side
  const params = new URLSearchParams({ country: "dk" });
  if (type === "number") {
    params.set("vat", trimmed);
  } else {
    params.set("search", trimmed);
  }

  const url = `https://cvrapi.dk/api?${params.toString()}`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Rampely CRM / contact@rampely.dk",
      },
    });
  } catch (e) {
    return json(
      {
        ok: false,
        error: `Network error contacting CVR registry: ${e instanceof Error ? e.message : String(e)}`,
        statusCode: 502,
      },
      502,
    );
  }

  if (res.status === 404) {
    // Not found — return null for number, empty array for name
    return json({
      ok: true,
      data: type === "name" ? [] : null,
    });
  }

  if (res.status === 429) {
    return json(
      {
        ok: false,
        error: "CVR registry rate limit reached. Try again in a moment.",
        statusCode: 429,
      },
      429,
    );
  }

  if (!res.ok) {
    return json(
      {
        ok: false,
        error: `CVR registry error (HTTP ${res.status}).`,
        statusCode: res.status,
      },
      502,
    );
  }

  const raw = (await res.json()) as RawCvr;

  if (raw?.error) {
    if (raw.error === "NOT_FOUND") {
      return json({ ok: true, data: type === "name" ? [] : null });
    }
    return json(
      {
        ok: false,
        error: `CVR registry error: ${raw.error}`,
        statusCode: 500,
      },
      502,
    );
  }

  const mapped = mapRaw(raw);

  // For "name" searches, wrap in array to match CvrCompany[] contract
  if (type === "name") {
    return json({ ok: true, data: mapped ? [mapped] : [] });
  }

  // For "number" lookups, return single or null
  return json({ ok: true, data: mapped });
});
