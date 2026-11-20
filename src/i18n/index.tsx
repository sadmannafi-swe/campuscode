import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { en, type MessageKey } from "./en";
import { bn } from "./bn";
import type { UiLang } from "@/types/db";
import { num, storage } from "@/lib/utils";

const dictionaries: Record<UiLang, Record<MessageKey, string>> = { en, bn };

interface I18nValue {
  lang: UiLang;
  setLang: (l: UiLang) => void;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
  n: (value: number | string) => string;
}

const I18nContext = createContext<I18nValue | null>(null);
const STORAGE_KEY = "cc.lang";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<UiLang>(() => (storage.get(STORAGE_KEY) === "bn" ? "bn" : "en"));

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: UiLang) => {
    setLangState(l);
    storage.set(STORAGE_KEY, l);
  }, []);

  const value = useMemo<I18nValue>(() => ({
    lang,
    setLang,
    n: (v) => num(v, lang),
    t: (key, vars) => {
      let s = dictionaries[lang][key] ?? en[key] ?? key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          s = s.split(`{${k}}`).join(typeof v === "number" ? num(v, lang) : v);
        }
      }
      return s;
    },
  }), [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}

export type { MessageKey };
