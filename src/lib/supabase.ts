import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** False when the deployment is missing its public Supabase settings. */
export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase = createClient(url || "http://localhost:54321", anonKey || "public-anon-key-missing", {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

export const FUNCTIONS_URL = `${url ?? ""}/functions/v1`;
