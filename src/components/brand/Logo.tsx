import { cn } from "@/lib/utils";

/** The official CampusCode logo (supplied asset). `dark` swaps to the variant for dark backgrounds. */
export function Logo({ variant = "mark", dark, className }: { variant?: "mark" | "full" | "lockup"; dark?: boolean; className?: string }) {
  if (variant === "full") {
    return <img src={dark ? "/brand/logo-full-dark.png" : "/brand/logo-full.png"} alt="CampusCode — Learn. Practice. Grow."
      className={cn("h-auto w-48", className)} width={1032} height={570} />;
  }
  const mark = <img src={dark ? "/brand/logo-mark-dark.png" : "/brand/logo-mark.png"} alt={variant === "mark" ? "CampusCode" : ""}
    className={cn("h-7 w-auto", variant === "mark" && className)} width={547} height={319} />;
  if (variant === "mark") return mark;
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {mark}
      <span className="font-heading text-[17px] font-extrabold tracking-tight">
        <span className={dark ? "text-paper" : "text-ink"}>Campus</span><span className="text-[#4CB31A]">Code</span>
      </span>
    </span>
  );
}
