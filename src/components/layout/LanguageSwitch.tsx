import { useI18n } from "@/i18n";
import { useAuth } from "@/hooks/useAuth";
import { updateProfile } from "@/services/profile";
import { cn } from "@/lib/utils";
import type { UiLang } from "@/types/db";

/** EN / বাং toggle. Persists to the profile when signed in, otherwise to this browser only. */
export function LanguageSwitch({ dark, className }: { dark?: boolean; className?: string }) {
  const { lang, setLang } = useI18n();
  const { user, refreshProfile } = useAuth();
  const choose = async (l: UiLang) => {
    if (l === lang) return;
    setLang(l);
    if (user) {
      try { await updateProfile(user.id, { preferred_language: l }); await refreshProfile(); } catch { /* keep local choice */ }
    }
  };
  return (
    <div role="group" aria-label="Interface language"
      className={cn("inline-flex h-8 items-center rounded border p-0.5 text-xs font-semibold", dark ? "border-ink-600" : "border-line bg-white", className)}>
      {(["en", "bn"] as const).map((l) => (
        <button key={l} type="button" onClick={() => choose(l)} aria-pressed={lang === l}
          className={cn("h-full rounded-sm px-2 transition-colors", l === "bn" && "font-bn",
            lang === l ? "bg-lime text-ink" : dark ? "text-paper/60 hover:text-paper" : "text-slate hover:text-ink")}>
          {l === "en" ? "EN" : "বাং"}
        </button>
      ))}
    </div>
  );
}
