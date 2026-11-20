import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes, type LabelHTMLAttributes, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = { tone?: "light" | "dark" };
const base = "w-full rounded border px-3 text-[15px] transition-colors placeholder:text-slate/70 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-lime/70";
const tones = {
  light: "border-line bg-white text-ink focus:border-ink/40",
  dark: "border-ink-600 bg-ink text-paper focus:border-lime/60",
};

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & Tone & { invalid?: boolean }>(
  ({ className, tone = "light", invalid, ...props }, ref) => (
    <input ref={ref} aria-invalid={invalid || undefined}
      className={cn(base, tones[tone], "h-11", invalid && "border-error focus:ring-error/40", className)} {...props} />
  ),
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & Tone & { invalid?: boolean; mono?: boolean }>(
  ({ className, tone = "light", invalid, mono, ...props }, ref) => (
    <textarea ref={ref} aria-invalid={invalid || undefined}
      className={cn(base, tones[tone], "min-h-[88px] py-2.5 leading-relaxed", mono && "font-mono text-[13px]", invalid && "border-error", className)} {...props} />
  ),
);
Textarea.displayName = "Textarea";

export const NativeSelect = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & Tone>(
  ({ className, tone = "light", children, ...props }, ref) => (
    <div className="relative">
      <select ref={ref} className={cn(base, tones[tone], "h-11 appearance-none pr-9", className)} {...props}>{children}</select>
      <ChevronDown className={cn("pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2", tone === "dark" ? "text-paper/60" : "text-slate")} aria-hidden />
    </div>
  ),
);
NativeSelect.displayName = "NativeSelect";

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("eyebrow mb-1.5 block", className)} {...props} />;
}

export function Field({ label, htmlFor, error, hint, children, className, dark }: {
  label: ReactNode; htmlFor?: string; error?: string | null; hint?: ReactNode; children: ReactNode; className?: string; dark?: boolean;
}) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? <p role="alert" className="mt-1.5 text-xs font-medium text-error">{error}</p>
        : hint ? <p className={cn("mt-1.5 text-xs", dark ? "text-paper/50" : "text-slate")}>{hint}</p> : null}
    </div>
  );
}
