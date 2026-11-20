import { createClient, type SupabaseClient, type User } from "npm:@supabase/supabase-js@2.46.1";
import { HttpError } from "./http.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

/** Service-role client: bypasses RLS. Only ever used inside Edge Functions. */
export const admin: SupabaseClient = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Client acting as the caller, so RLS applies exactly as it would in the browser. */
export function asUser(req: Request): SupabaseClient {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
}

/** Resolves the JWT to a user; returns null for guests (anon key or no header). */
export async function getUser(req: Request): Promise<User | null> {
  const header = req.headers.get("Authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "");
  if (!token || token === ANON_KEY) return null;
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

export async function requireActiveUser(req: Request): Promise<User> {
  const user = await getUser(req);
  if (!user) throw new HttpError(401, "auth_required", "Please sign in to continue.");
  const { data } = await admin.from("profiles").select("status").eq("id", user.id).maybeSingle();
  if (!data) throw new HttpError(403, "profile_missing", "Your profile could not be found.");
  if (data.status !== "active") throw new HttpError(403, "account_suspended", "Your account is suspended. Contact the CampusCode team.");
  return user;
}

/** Sliding-window limits backed by code_execution_logs (trusted, server-written). */
export async function enforceRateLimit(opts: {
  userId: string | null;
  ipHash: string;
  kinds: string[];
  perMinute: number;
  perDay: number;
}) {
  const since = (ms: number) => new Date(Date.now() - ms).toISOString();
  const base = () => {
    const q = admin.from("code_execution_logs").select("id", { count: "exact", head: true }).in("kind", opts.kinds);
    return opts.userId ? q.eq("user_id", opts.userId) : q.is("user_id", null).eq("ip_hash", opts.ipHash);
  };
  const [{ count: minute }, { count: day }] = await Promise.all([
    base().gte("created_at", since(60_000)),
    base().gte("created_at", since(86_400_000)),
  ]);
  if ((minute ?? 0) >= opts.perMinute) {
    throw new HttpError(429, "rate_limited", "You're running code very quickly. Please wait a few seconds and try again.");
  }
  if ((day ?? 0) >= opts.perDay) {
    throw new HttpError(429, "daily_limit", opts.userId
      ? "You've reached today's execution limit. It resets in 24 hours."
      : "Guests have a small daily execution limit. Sign in (it's free) to keep coding.");
  }
}
