// Shared HTTP helpers for CampusCode Edge Functions.

const allowed = (Deno.env.get("ALLOWED_ORIGINS") ?? "*")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const allowOrigin = allowed.includes("*") ? "*" : allowed.includes(origin) ? origin : allowed[0] ?? "";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

export function json(req: Request, status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

/** Wraps a handler with CORS, method checks, body-size limits and safe error output. */
export function serve(handler: (req: Request, body: Record<string, unknown>) => Promise<unknown>, maxBytes = 140_000) {
  Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
    if (req.method !== "POST") return json(req, 405, { error: "method_not_allowed", message: "Use POST." });
    try {
      const raw = await req.text();
      if (new TextEncoder().encode(raw).length > maxBytes) {
        throw new HttpError(413, "payload_too_large", "The request is too large.");
      }
      let body: Record<string, unknown>;
      try {
        body = raw ? JSON.parse(raw) : {};
      } catch {
        throw new HttpError(400, "invalid_json", "The request body must be JSON.");
      }
      return json(req, 200, await handler(req, body));
    } catch (e) {
      if (e instanceof HttpError) return json(req, e.status, { error: e.code, message: e.message });
      console.error("Unhandled error:", e);
      return json(req, 500, { error: "internal_error", message: "Something went wrong on our side. Please try again." });
    }
  });
}

export function requireString(body: Record<string, unknown>, key: string, maxBytes: number, allowEmpty = false): string {
  const v = body[key];
  if (typeof v !== "string") throw new HttpError(400, "invalid_input", `"${key}" must be a string.`);
  if (!allowEmpty && v.trim() === "") throw new HttpError(400, "invalid_input", `"${key}" cannot be empty.`);
  if (new TextEncoder().encode(v).length > maxBytes) {
    throw new HttpError(413, "payload_too_large", `"${key}" exceeds the ${Math.round(maxBytes / 1024)} KB limit.`);
  }
  return v;
}

export const LANGUAGES = ["c", "python"] as const;
export type Lang = (typeof LANGUAGES)[number];

export function requireLanguage(body: Record<string, unknown>): Lang {
  const v = body.language;
  if (typeof v !== "string" || !LANGUAGES.includes(v as Lang)) {
    throw new HttpError(400, "unsupported_language", "Only C and Python are supported.");
  }
  return v as Lang;
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function clientIp(req: Request): string {
  return (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
    req.headers.get("cf-connecting-ip") || "unknown";
}
