import { useState } from "react";
import { Link } from "react-router-dom";
import type { UseQueryResult } from "@tanstack/react-query";
import { Code2 } from "lucide-react";
import { useI18n } from "@/i18n";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ErrorState, Skeleton } from "@/components/ui/misc";
import { CodeBlock } from "@/components/common/CodeBlock";
import type { SubmissionWithProblem } from "@/services/problems";
import { friendlyError } from "@/lib/errors";
import { cn, formatMemory, formatTime, langLabel, relativeTime } from "@/lib/utils";
import { IDE_HANDOFF_KEY } from "@/pages/IdePage";

export function VerdictText({ verdict, className }: { verdict: SubmissionWithProblem["verdict"]; className?: string }) {
  const { t } = useI18n();
  return <span className={cn("font-mono text-xs font-medium", verdict === "accepted" ? "text-success" : "text-error", className)}>{t(`verdict.${verdict}`)}</span>;
}

export function SubmissionList({ query, compact }: { query: UseQueryResult<SubmissionWithProblem[]>; compact?: boolean }) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState<SubmissionWithProblem | null>(null);
  if (query.isLoading) return <Skeleton className="h-24" />;
  if (query.isError) return <ErrorState message={friendlyError(query.error, t)} onRetry={() => query.refetch()} />;
  const rows = query.data ?? [];
  if (!rows.length) return <p className="text-sm text-slate">{compact ? t("problems.noSubmissions") : t("subs.empty")}</p>;

  const openInIde = (s: SubmissionWithProblem) => {
    sessionStorage.setItem(IDE_HANDOFF_KEY, JSON.stringify({ language: s.language, code: s.source_code, stdin: "" }));
  };

  return (
    <>
      <ul className="divide-y divide-line">
        {rows.map((s) => (
          <li key={s.id}>
            <button onClick={() => setOpen(s)} className="grid w-full grid-cols-[1fr_auto] items-center gap-x-3 gap-y-0.5 py-3 text-left hover:bg-paper/60 sm:px-2">
              <span className="min-w-0">
                {!compact && <span className="block truncate font-semibold">{s.problems?.title ?? "—"}</span>}
                <VerdictText verdict={s.verdict} />
                <span className="ml-2 font-mono text-xs text-slate">{s.passed_count}/{s.total_count} · {langLabel(s.language)}</span>
              </span>
              <span className="text-right font-mono text-xs text-slate">
                {relativeTime(s.created_at, lang)}
                {!compact && <span className="block">{formatTime(s.time_ms)} · {formatMemory(s.memory_kb)}</span>}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <Dialog open={Boolean(open)} onOpenChange={(o) => !o && setOpen(null)} size="lg"
        title={open ? <span className="flex items-center gap-2">{open.problems?.title ?? t("subs.viewCode")} · <VerdictText verdict={open.verdict} className="text-sm" /></span> : ""}
        description={open ? `${langLabel(open.language)} · ${open.passed_count}/${open.total_count} · ${formatTime(open.time_ms)} · ${formatMemory(open.memory_kb)}` : undefined}
        footer={open?.problems && (
          <Button asChild variant="ink" onClick={() => openInIde(open)}>
            <Link to={`/ide?from=lesson`}><Code2 /> {t("subs.openInIde")}</Link>
          </Button>
        )}>
        {open && (
          <div className="space-y-3">
            {open.compile_output && <pre className="max-h-40 overflow-auto rounded bg-error/5 p-3 font-mono text-xs text-error">{open.compile_output}</pre>}
            <CodeBlock code={open.source_code} language={open.language} />
          </div>
        )}
      </Dialog>
    </>
  );
}
