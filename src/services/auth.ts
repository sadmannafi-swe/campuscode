import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export interface AuthSettings {
  googleEnabled: boolean;
  /** true when Supabase "Confirm email" is OFF — new accounts can sign in immediately. */
  autoConfirm: boolean;
}

/** Reads Supabase's public auth settings (no secrets): which providers are on, and email auto-confirm. */
export async function getAuthSettings(): Promise<AuthSettings> {
  if (!isSupabaseConfigured) return { googleEnabled: false, autoConfirm: false };
  const url = import.meta.env.VITE_SUPABASE_URL as string;
  const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY } });
  if (!res.ok) throw new Error(`auth settings ${res.status}`);
  const s = (await res.json()) as { external?: Record<string, boolean>; mailer_autoconfirm?: boolean };
  return { googleEnabled: Boolean(s.external?.google), autoConfirm: Boolean(s.mailer_autoconfirm) };
}

const safeNext = (n: string | null | undefined) => (n && n.startsWith("/") && !n.startsWith("//") ? n : "/");

/** Redirects to Google; Supabase sends the user back to `next` on this site with a session. */
export async function signInWithGoogle(next?: string | null) {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      // Return via /login: it forwards to `next` once the session exists, or shows the OAuth error.
      redirectTo: `${window.location.origin}/login?next=${encodeURIComponent(safeNext(next))}`,
      queryParams: { prompt: "select_account" },
    },
  });
  if (error) throw error;
}

/**
 * Email sign-up without a verification step. When "Confirm email" is disabled in Supabase the
 * response already contains a session; otherwise we fall back to a normal password sign-in,
 * which only succeeds once the account is confirmed.
 */
export async function signUpWithEmail(input: { name: string; email: string; password: string; lang: string }) {
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      emailRedirectTo: `${window.location.origin}/`,
      data: { full_name: input.name, terms_accepted: true, preferred_language: input.lang },
    },
  });
  if (error) throw error;
  // Supabase returns a user with no identities when the email is already registered.
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    return { status: "exists" as const };
  }
  if (data.session) return { status: "signed_in" as const };
  const { error: signInError } = await supabase.auth.signInWithPassword({ email: input.email, password: input.password });
  if (!signInError) return { status: "signed_in" as const };
  return { status: "needs_confirmation" as const };
}

export { safeNext };
