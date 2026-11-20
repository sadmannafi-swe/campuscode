import { AlertTriangle, CheckCircle2, CircleSlash, Clock, Cpu, EyeOff, XCircle } from "lucide-react";
import type { RunResult, SamplesResult, SubmitResult, Verdict } from "@/types/db";
import { useI18n } from "@/i18n";
import { Spinner } from "@/components/ui/misc";
import { cn, formatMemory, formatTime } from "@/lib/utils";

export type IdeResult =
  | { kind: "run"; data: RunResult }
  | { kind: "samples"; data: SamplesResult }
  | { kind: "submit"; data: SubmitResult }
  | { kind: "error"; message: string };

function Pre({ children, tone = "plain", big }: { children: string; tone?: "plain" | "ok" | "error" | "muted"; big?: boolean }) {
  return (
    <pre className={cn("whitespace-pre-wrap break-words font-mono",
      big ? "text-[26px] font-bold leading-snug" : "text-[13px] leading-6",
      tone === "ok" && "text-lime", tone === "error" && "text-error-dark", tone === "muted" && "text-paper/50", tone === "plain" && "text-paper")}>
      {children}
    </pre>
  );
}

function Meta({ time, memory }: { time: number | null; memory: number | null }) {
  const { t } = useI18n();
  return (
    <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-lime/80">
      <span className="inline-flex items-center gap-1"><Clock className="size-3" />{t("ide.finished", { time: formatTime(time) })}</span>
      {memory != null && <span className="inline-flex items-center gap-1"><Cpu className="size-3" />{t("ide.memory", { mem: formatMemory(memory) })}</span>}
    </p>
  );
}

const verdictLabelKey = (v: Verdict) => `verdict.${v}` as const;

export function VerdictCard({ data }: { data: SubmitResult }) {
  const { t } = useI18n();
  const ok = data.verdict === "accepted";
  return (
    <div className={cn("rounded-md p-5", ok ? "bg-lime text-ink" : "border border-error-dark/40 bg-error-dark/10 text-paper")}>
      <p className={cn("eyebrow", ok ? "text-ink" : "text-error-dark")}>Submission</p>
      <p className="mt-3 flex items-center gap-2 font-heading text-2xl font-extrabold">
        {ok ? <CheckCircle2 className="size-6" /> : <XCircle className="size-6 text-error-dark" />}
        {t(verdictLabelKey(data.verdict))} · {t("ide.verdictTests", { passed: data.passed, total: data.total })}
      </p>
      <div className={cn("mt-4 font-mono text-sm leading-6", ok ? "text-ink" : "text-paper/80")}>
        <p>{t("ide.time")} {formatTime(data.time_ms)}</p>
        <p>Memory {formatMemory(data.memory_kb)}</p>
      </div>
      {data.compile_output && <div className="mt-4"><Pre tone="error">{data.compile_output}</Pre></div>}
      {data.failed_test && (
        <div className="mt-4 rounded border border-ink-600 bg-ink p-4 text-paper">
          <p className="font-semibold">{t("ide.failedOn", { n: data.failed_test.number })}</p>
          {data.failed_test.hidden ? (
            <p className="mt-2 flex items-start gap-2 text-sm text-paper/70"><EyeOff className="mt-0.5 size-4 shrink-0" />{t("ide.hiddenTest")}</p>
          ) : (
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div><p className="eyebrow mb-1">{t("ide.input")}</p><Pre>{data.failed_test.input || " "}</Pre></div>
              <div><p className="eyebrow mb-1">{t("ide.expected")}</p><Pre tone="ok">{data.failed_test.expected}</Pre></div>
              <div><p className="eyebrow mb-1">{t("ide.yourOutput")}</p><Pre tone="error">{data.failed_test.actual || t("ide.noOutput")}</Pre></div>
              {data.failed_test.stderr && <div className="sm:col-span-3"><p className="eyebrow mb-1">{t("ide.stderr")}</p><Pre tone="error">{data.failed_test.stderr}</Pre></div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RunView({ data }: { data: RunResult }) {
  const { t } = useI18n();
  if (data.outcome === "compilation_error") {
    return (
      <div>
        <p className="eyebrow mb-2 flex items-center gap-1.5 text-error-dark"><AlertTriangle className="size-3.5" />{t("ide.compileError")}</p>
        <Pre tone="error">{data.compile_output || data.message || data.status}</Pre>
      </div>
    );
  }
  const problem = data.outcome !== "success";
  const label = data.outcome === "runtime_error" ? t("ide.runtimeError") : data.outcome === "time_limit_exceeded" ? t("ide.tle")
    : data.outcome === "memory_limit_exceeded" ? t("ide.mle") : data.outcome === "internal_error" ? t("ide.internal") : null;
  const short = !problem && data.stdout.trim().length > 0 && data.stdout.trim().length <= 12 && !data.stdout.trim().includes("\n");
  return (
    <div>
      {label && <p className="eyebrow mb-2 flex items-center gap-1.5 text-error-dark"><CircleSlash className="size-3.5" />{label} <span className="normal-case tracking-normal">({data.status})</span></p>}
      {data.stdout ? <Pre tone="ok" big={short}>{data.stdout}</Pre> : <Pre tone="muted">{t("ide.noOutput")}</Pre>}
      {data.stderr && (<div className="mt-4"><p className="eyebrow mb-1 text-error-dark">{t("ide.stderr")}</p><Pre tone="error">{data.stderr}</Pre></div>)}
      {data.message && problem && <p className="mt-2 font-mono text-xs text-paper/50">{data.message}</p>}
      <Meta time={data.time_ms} memory={data.memory_kb} />
    </div>
  );
}

function SamplesView({ data }: { data: SamplesResult }) {
  const { t } = useI18n();
  if (data.compile_output) {
    return (<div><p className="eyebrow mb-2 text-error-dark">{t("ide.compileError")}</p><Pre tone="error">{data.compile_output}</Pre></div>);
  }
  const all = data.passed === data.total;
  return (
    <div className="space-y-3">
      <p className={cn("font-heading text-lg font-bold", all ? "text-lime" : "text-paper")}>{t("ide.samplesPassed", { passed: data.passed, total: data.total })}</p>
      {data.results.map((r) => (
        <div key={r.index} className={cn("rounded border p-3", r.passed ? "border-lime/30" : "border-error-dark/40")}>
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
            {r.passed ? <CheckCircle2 className="size-4 text-lime" /> : <XCircle className="size-4 text-error-dark" />}
            {t("ide.sample", { n: r.index })} · {r.passed ? t("ide.passed") : r.outcome === "wrong_answer" ? t("verdict.wrong_answer") : t(`verdict.${r.outcome as Verdict}`)}
            <span className="ml-auto font-mono text-xs text-paper/50">{formatTime(r.time_ms)}</span>
          </p>
          {!r.passed && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div><p className="eyebrow mb-1">{t("ide.expected")}</p><Pre tone="ok">{r.expected}</Pre></div>
              <div><p className="eyebrow mb-1">{t("ide.yourOutput")}</p><Pre tone="error">{r.actual || t("ide.noOutput")}</Pre></div>
              {r.stderr && <div className="sm:col-span-2"><p className="eyebrow mb-1">{t("ide.stderr")}</p><Pre tone="error">{r.stderr}</Pre></div>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function OutputPanel({ result, running, runningLabel }: { result: IdeResult | null; running: boolean; runningLabel?: string }) {
  const { t } = useI18n();
  return (
    <div aria-live="polite" className="min-h-full">
      {running ? (
        <div className="flex items-center gap-3 font-mono text-sm text-paper/70"><Spinner className="text-lime" />{runningLabel ?? t("ide.running")}</div>
      ) : !result ? (
        <p className="font-mono text-sm text-paper/40">{t("ide.outputEmpty")}</p>
      ) : result.kind === "error" ? (
        <div role="alert" className="rounded border border-warning/40 bg-warning/10 p-4 text-sm text-paper">
          <p className="flex items-center gap-2 font-semibold text-[#E7B865]"><AlertTriangle className="size-4" />{t("common.errorTitle")}</p>
          <p className="mt-1 text-paper/80">{result.message}</p>
        </div>
      ) : result.kind === "run" ? <RunView data={result.data} />
        : result.kind === "samples" ? <SamplesView data={result.data} />
        : <VerdictCard data={result.data} />}
    </div>
  );
}
