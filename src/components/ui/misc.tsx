import type { HTMLAttributes, ReactNode } from "react";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import type { Difficulty } from "@/types/db";
import { useI18n } from "@/i18n";

export function Badge({ className, tone = "neutral", ...props }: HTMLAttributes<HTMLSpanElement> & {
  tone?: "neutral" | "lime" | "ink" | "success" | "warning" | "error" | "outline";
}) {
  const tones = {
    neutral: "bg-paper text-ink",
    lime: "bg-lime text-ink",
    ink: "bg-ink text-paper",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    error: "bg-error/10 text-error",
    outline: "border border-line text-slate",
  };
  return <span className={cn("inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold", tones[tone], className)} {...props} />;
}

export function DifficultyBadge({ difficulty, className }: { difficulty: Difficulty; className?: string }) {
  const { t } = useI18n();
  return (
    <Badge tone={difficulty === "easy" ? "lime" : difficulty === "hard" ? "ink" : "neutral"} className={cn("min-w-[72px] justify-center", className)}>
      {t(`common.${difficulty}`)}
    </Badge>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-5 animate-spin text-slate", className)} aria-label="Loading" />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-line/70", className)} aria-hidden />;
}

export function PageLoader() {
  const { t } = useI18n();
  return (
    <div className="flex min-h-[40vh] items-center justify-center gap-3 text-sm text-slate" role="status">
      <Spinner /> {t("common.loading")}
    </div>
  );
}

export function EmptyState({ icon, title, body, action, dark, className }: {
  icon?: ReactNode; title: ReactNode; body?: ReactNode; action?: ReactNode; dark?: boolean; className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-md border border-dashed px-6 py-12 text-center",
      dark ? "border-ink-600 text-paper" : "border-line bg-white/60", className)}>
      {icon && <div className={cn("mb-3", dark ? "text-lime" : "text-slate")}>{icon}</div>}
      <p className="font-heading text-base font-bold">{title}</p>
      {body && <p className={cn("mt-1 max-w-sm text-sm", dark ? "text-paper/60" : "text-slate")}>{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry, dark }: { message: string; onRetry?: () => void; dark?: boolean }) {
  const { t } = useI18n();
  return (
    <div role="alert" className={cn("flex flex-col items-center gap-3 rounded-md border px-6 py-10 text-center",
      dark ? "border-error-dark/40 bg-error-dark/5 text-paper" : "border-error/30 bg-error/5")}>
      <AlertTriangle className={cn("size-6", dark ? "text-error-dark" : "text-error")} aria-hidden />
      <p className="font-heading font-bold">{t("common.errorTitle")}</p>
      <p className={cn("max-w-md text-sm", dark ? "text-paper/70" : "text-slate")}>{message}</p>
      {onRetry && (
        <Button variant={dark ? "outline-dark" : "outline"} size="sm" onClick={onRetry}><RefreshCw /> {t("common.retry")}</Button>
      )}
    </div>
  );
}

export function Switch({ checked, onCheckedChange, label, disabled }: {
  checked: boolean; onCheckedChange: (v: boolean) => void; label: string; disabled?: boolean;
}) {
  return (
    <SwitchPrimitive.Root checked={checked} onCheckedChange={onCheckedChange} aria-label={label} disabled={disabled}
      className="relative h-6 w-11 shrink-0 rounded-full bg-line transition-colors data-[state=checked]:bg-success disabled:opacity-50">
      <SwitchPrimitive.Thumb className="block size-5 translate-x-0.5 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[22px]" />
    </SwitchPrimitive.Root>
  );
}

export function ProgressBar({ value, max, dark, className }: { value: number; max: number; dark?: boolean; className?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full", dark ? "bg-ink-600" : "bg-line", className)}
      role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-lime transition-[width] duration-500" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function SectionTitle({ title, subtitle, action, dark }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode; dark?: boolean }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className={cn("text-[28px] font-extrabold leading-tight sm:text-4xl", dark ? "text-paper" : "text-ink")}>{title}</h1>
        {subtitle && <p className={cn("mt-2 max-w-2xl text-[15px]", dark ? "text-paper/70" : "text-slate")}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
