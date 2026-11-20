import type { MessageKey } from "@/i18n/en";
import { isSupabaseConfigured } from "./supabase";

/** An error with a message that is safe and useful to show to end users. */
export class AppError extends Error {
  constructor(public code: string, message: string, public status?: number) {
    super(message);
  }
}

type T = (key: MessageKey, vars?: Record<string, string | number>) => string;

/** Maps Supabase / network / edge-function errors to friendly, translated text. Never leaks internals. */
export function friendlyError(err: unknown, t: T): string {
  if (!isSupabaseConfigured) return t("error.notConfigured");
  if (err instanceof AppError) return err.message;
  const e = err as { message?: string; code?: string; status?: number } | null;
  const msg = (e?.message ?? "").toLowerCase();
  const code = e?.code ?? "";
  if (msg.includes("failed to fetch") || msg.includes("network") || msg.includes("load failed")) return t("error.network");
  if (msg.includes("invalid login credentials")) return t("auth.invalidCredentials");
  if (msg.includes("email not confirmed")) return t("auth.emailNotConfirmed");
  if (msg.includes("already registered") || msg.includes("already been registered")) return t("auth.alreadyRegistered");
  if (msg.includes("rate limit") || e?.status === 429) return t("auth.tooMany");
  if (msg.includes("jwt") || code === "PGRST301" || e?.status === 401) return t("error.auth");
  if (code === "42501" || msg.includes("row-level security") || msg.includes("permission denied") || e?.status === 403) {
    return t("error.permission");
  }
  if (code === "23505" && msg.includes("username")) return t("profile.usernameTaken");
  return t("error.generic");
}
