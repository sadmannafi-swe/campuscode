import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { CodeEditor } from "@/components/editor/CodeEditor";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import type { Lang } from "@/types/db";
import { cn } from "@/lib/utils";

/** Read-only, highlighted code with line numbers (slide 9 code card). */
export function CodeBlock({ code, language, className, title }: { code: string; language: Lang; className?: string; title?: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ }
  };
  return (
    <div className={cn("overflow-hidden rounded-md bg-ink", className)}>
      <div className="flex items-center justify-between border-b border-ink-700 px-4 py-2">
        <span className="font-mono text-xs text-paper/60">{title ?? (language === "c" ? "main.c" : "main.py")}</span>
        <Button variant="ghost-dark" size="sm" onClick={copy} aria-label={t("common.copy")}>
          {copied ? <Check /> : <Copy />} <span className="hidden sm:inline">{copied ? t("common.copied") : t("common.copy")}</span>
        </Button>
      </div>
      <div className="max-h-[480px] overflow-auto scrollbar-thin">
        <CodeEditor value={code} language={language} readOnly fontSize={14} ariaLabel="Example code" />
      </div>
    </div>
  );
}
