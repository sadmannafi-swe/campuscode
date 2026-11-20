import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

// Page geometry in container-query units: the page is 297 mm wide = 100cqw, so 1 mm = 100/297 cqw.
// Values mirror supabase/functions/certificates/layout.ts (baselines, cap heights, column centre).
const MM = 100 / 297;
const CAP = 750 / 1400;                 // Jersey 10 cap height / em
const ASC_OFFSET = 0.768;               // with line-height 1: line-box top = baseline − 0.768 em
const line = (baselineMm: number, capMm: number): CSSProperties => {
  const em = (capMm / CAP) * MM;
  return {
    top: `${baselineMm * MM - ASC_OFFSET * em}cqw`,
    fontSize: `${em}cqw`,
    left: `${(146.2 - 105) * MM}cqw`, width: `${210 * MM}cqw`,       // 210 mm wide, centred on the text column
    fontFamily: '"CC Certificate Display", "Hind Siliguri", sans-serif',
    WebkitTextStroke: "0.032em #172733",
  };
};

/**
 * Visual preview of a certificate: the real design background (rendered from the Canva PPTX) with the
 * student's name and course placed where the PDF puts them. The PDF itself is the source of truth.
 */
export function CertificatePreview({ name, course, className, alt }: { name: string; course: string; className?: string; alt: string }) {
  return (
    <figure className={cn("relative aspect-[297/210] w-full overflow-hidden rounded bg-[#f7f6f0] [container-type:inline-size]", className)}>
      <img src="/certificate/preview.jpg" alt={alt} loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover" />
      <p aria-hidden className="absolute truncate text-center leading-none text-[#172733]" style={line(99.28, 9.14)}>{name}</p>
      <p aria-hidden className="absolute truncate text-center leading-none text-[#172733]" style={line(126.54, 7.79)}>{course}</p>
      {/* Issuer name on the signature line, as on the PDF (Great Vibes 30 pt, baseline 172.3 mm, centred at 232.6 mm). */}
      <p aria-hidden className="absolute text-center leading-none text-[#172733]" style={{
        top: `${(172.3 - 0.725 * 30 * 0.3528) * MM}cqw`, left: `${(232.6 - 30) * MM}cqw`, width: `${60 * MM}cqw`,
        fontSize: `${30 * 0.3528 * MM}cqw`, fontFamily: '"CC Certificate Script", cursive',
      }}>Nafi</p>
    </figure>
  );
}
