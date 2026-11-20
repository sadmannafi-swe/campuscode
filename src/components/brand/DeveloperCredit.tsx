import { cn } from "@/lib/utils";

/**
 * Developer signature shown on Sign In, Sign Up and Profile.
 * Exact text: <Developed By Sadman Nahial Nafi /> — only the name links to https://sadmannafi.com.
 */
export function DeveloperCredit({ dark, className }: { dark?: boolean; className?: string }) {
  return (
    <p
      className={cn(
        "group mx-auto flex w-fit max-w-full flex-wrap items-center justify-center gap-x-1 rounded border px-3 py-1.5 font-mono text-[12px] leading-5 tracking-tight transition-colors",
        dark ? "border-ink-600 bg-ink-800/60 text-paper/60" : "border-line bg-white/70 text-slate",
        className,
      )}
      lang="en"
    >
      <span aria-hidden className={dark ? "text-lime/70" : "text-[#4CB31A]"}>&lt;</span>
      <span className={dark ? "text-paper/70" : "text-ink/70"}>Developed By</span>
      <a
        href="https://sadmannafi.com"
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "font-medium underline decoration-transparent decoration-2 underline-offset-4 transition-colors",
          dark ? "text-paper hover:text-lime hover:decoration-lime/60" : "text-ink hover:text-[#3B8A12] hover:decoration-lime",
        )}
      >
        Sadman Nahial Nafi
      </a>
      <span aria-hidden className={dark ? "text-lime/70" : "text-[#4CB31A]"}>/&gt;</span>
    </p>
  );
}
