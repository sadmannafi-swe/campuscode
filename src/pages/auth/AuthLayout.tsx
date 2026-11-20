import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Logo } from "@/components/brand/Logo";
import { DeveloperCredit } from "@/components/brand/DeveloperCredit";
import { LanguageSwitch } from "@/components/layout/LanguageSwitch";
import { useI18n } from "@/i18n";

const SAMPLE = [
  ["01", "#include <stdio.h>", true],
  ["02", "", false],
  ["03", "int main(void) {", false],
  ["04", "    printf(\"Learn. Practice. Grow.\\n\");", false],
  ["05", "    return 0;", false],
  ["06", "}", false],
] as const;

export function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="grid min-h-dvh bg-paper lg:grid-cols-[1fr_minmax(480px,560px)]">
      {/* Brand panel (desktop) */}
      <aside className="relative hidden overflow-hidden bg-ink p-12 text-paper lg:flex lg:flex-col">
        <div className="absolute inset-y-0 left-0 w-2 bg-lime" aria-hidden />
        <Link to="/" aria-label="CampusCode home"><Logo variant="full" dark className="w-44" /></Link>
        <div className="mt-auto max-w-lg">
          <h2 className="text-4xl font-extrabold leading-tight">{t("brand.message")}</h2>
          <div className="mt-8 rounded-md border border-ink-600 bg-ink-800">
            <div className="flex items-center justify-between border-b border-ink-700 px-5 py-3">
              <span className="font-mono text-sm text-paper/80">main.c</span>
              <span className="rounded bg-lime px-3 py-1 text-xs font-bold text-ink">▶ Run</span>
            </div>
            <pre className="px-5 py-4 font-mono text-[13px] leading-7">
              {SAMPLE.map(([n, code, hl]) => (
                <div key={n}><span className={hl ? "text-lime" : "text-paper/50"}>{n}</span>{"  "}<span className={hl ? "text-lime" : "text-paper"}>{code}</span></div>
              ))}
            </pre>
            <div className="mx-5 mb-5 border border-ink-600 bg-ink px-4 py-3 font-mono text-[13px]">
              <p className="eyebrow mb-1">Output</p>
              <p className="text-lime">Learn. Practice. Grow.</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Form column */}
      <main className="flex flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Link to="/" className="lg:invisible" aria-label="CampusCode home"><Logo variant="lockup" /></Link>
          <LanguageSwitch />
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <h1 className="text-[28px] font-extrabold leading-tight">{title}</h1>
          {subtitle && <p className="mt-2 text-[15px] text-slate">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-6 text-center text-sm text-slate">{footer}</div>}
        </div>
        <footer className="pb-2 pt-4">
          <DeveloperCredit />
        </footer>
      </main>
    </div>
  );
}
