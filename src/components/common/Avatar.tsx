import { cn, initials } from "@/lib/utils";

export function Avatar({ name, url, size = 40, className }: { name: string; url?: string | null; size?: number; className?: string }) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.36) };
  if (url) {
    return <img src={url} alt="" style={style} className={cn("shrink-0 rounded-full object-cover", className)} />;
  }
  return (
    <span style={style} aria-hidden
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full bg-lime font-heading font-extrabold text-ink", className)}>
      {initials(name)}
    </span>
  );
}
