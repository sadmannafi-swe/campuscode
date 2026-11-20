import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Lang, UiLang } from "@/types/db";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
export function num(n: number | string, lang: UiLang): string {
  const s = String(n);
  return lang === "bn" ? s.replace(/\d/g, (d) => BN_DIGITS[Number(d)]) : s;
}

/** Picks the Bangla or English variant of a bilingual DB field, falling back to English. */
export function pick(row: object, field: string, lang: UiLang): string {
  const r = row as Record<string, unknown>;
  const bn = r[`${field}_bn`];
  const en = r[`${field}_en`] ?? r[field];
  if (lang === "bn" && typeof bn === "string" && bn.trim()) return bn;
  return typeof en === "string" ? en : "";
}
export function pickArr(row: object, field: string, lang: UiLang): string[] {
  const r = row as Record<string, unknown>;
  const bn = r[`${field}_bn`] as string[] | undefined;
  const en = r[`${field}_en`] as string[] | undefined;
  return lang === "bn" && bn && bn.length ? bn : en ?? [];
}

export function relativeTime(iso: string, lang: UiLang): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(lang === "bn" ? "bn-BD" : "en", { numeric: "auto" });
  const steps: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, "second"], [3600, "minute"], [86400, "hour"], [604800, "day"], [2629800, "week"], [31557600, "month"],
  ];
  if (diff < 45) return lang === "bn" ? "এইমাত্র" : "just now";
  for (let i = 1; i < steps.length; i++) {
    // e.g. diff < 3600s → minutes: divide by 60 and label with "minute"
    if (diff < steps[i][0]) return rtf.format(-Math.round(diff / steps[i - 1][0]), steps[i][1]);
  }
  return rtf.format(-Math.round(diff / 31557600), "year");
}

export function formatDate(iso: string, lang: UiLang): string {
  return new Date(iso).toLocaleDateString(lang === "bn" ? "bn-BD" : "en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export const fileExt = (lang: Lang) => (lang === "c" ? "c" : "py");
export const langLabel = (lang: Lang) => (lang === "c" ? "C" : "Python");

export function slugify(s: string): string {
  return s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9\s-]/g, "").trim().replace(/[\s-]+/g, "-").slice(0, 60);
}

export function initials(name: string, fallback = "CC"): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return fallback;
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function formatMemory(kb: number | null | undefined): string {
  if (kb == null) return "—";
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
}
export function formatTime(ms: number | null | undefined): string {
  if (ms == null) return "—";
  return `${(ms / 1000).toFixed(2)}s`;
}

export const storage = {
  get(key: string): string | null {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  set(key: string, value: string) {
    try { localStorage.setItem(key, value); } catch { /* private mode */ }
  },
  remove(key: string) {
    try { localStorage.removeItem(key); } catch { /* ignore */ }
  },
};
