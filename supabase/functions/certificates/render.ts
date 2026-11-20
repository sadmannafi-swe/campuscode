// Certificate PDF renderer. Runtime-agnostic: pdf-lib, fontkit and qrcode-generator are injected, so
// the same code runs in the Edge Function (Deno, npm: imports) and in the Node test harness.
//
// The page background is the Canva design itself (public/certificate/template.pdf, built from the PPTX
// by scripts/certificate/build_template.py); only the per-student values are drawn on top of it.
import { INK, LAYOUT, PAGE_MM } from "./layout.ts";

export interface CertificateData {
  studentName: string;
  courseTitle: string;
  issuedAt: string | Date;
  certificateNumber: string;
  verificationUrl: string;
  issuer?: string | null;
}

export interface CertificateAssets {
  template: Uint8Array;   // A4 landscape background PDF
  display: Uint8Array;    // Jersey 10 (OFL) — stands in for the design's Brick Sans on dynamic text
  serif: Uint8Array;      // Lora Regular (OFL) — the design's body face
  fallback: Uint8Array;   // Noto Sans Bengali Bold (OFL) — Bangla and any glyph the others lack
}

// deno-lint-ignore no-explicit-any
type Any = any;
export interface RenderDeps {
  pdfLib: Any;                         // the pdf-lib module namespace
  fontkit: Any;                        // @pdf-lib/fontkit default export
  qrcode: (type: number, level: "L" | "M" | "Q" | "H") => Any; // qrcode-generator default export
}

const PT_PER_MM = 72 / 25.4;
const pt = (mm: number) => mm * PT_PER_MM;

export function formatIssueDate(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Dhaka" });
}

/** Collapses whitespace and strips control characters so nothing can break the layout. */
export function cleanText(s: string): string {
  let out = "";
  for (const ch of s.normalize("NFC")) {
    const c = ch.codePointAt(0)!;
    const control = c < 0x20 || (c >= 0x7f && c <= 0x9f) || c === 0x200b || c === 0x2028 || c === 0x2029;
    out += control ? " " : ch;
  }
  return out.replace(/\s+/g, " ").trim();
}

export async function renderCertificatePdf(deps: RenderDeps, assets: CertificateAssets, data: CertificateData): Promise<Uint8Array> {
  const { PDFDocument, rgb, setTextRenderingMode, TextRenderingMode, setLineWidth, setStrokingRgbColor,
    pushGraphicsState, popGraphicsState, setLineJoin, LineJoinStyle } = deps.pdfLib;
  const ink = rgb(INK.r, INK.g, INK.b);

  const pdf = await PDFDocument.create();
  pdf.registerFontkit(deps.fontkit);
  const [bg] = await pdf.embedPdf(assets.template, [0]);
  const W = pt(PAGE_MM.w), H = pt(PAGE_MM.h);
  const page = pdf.addPage([W, H]);
  page.drawPage(bg, { x: 0, y: 0, width: W, height: H });
  const y = (mm: number) => H - pt(mm);

  const display = await pdf.embedFont(assets.display, { subset: true });
  const serif = await pdf.embedFont(assets.serif, { subset: true });
  const fallback = await pdf.embedFont(assets.fallback, { subset: true });
  const cmapOf = (bytes: Uint8Array) => deps.fontkit.create(bytes).characterSet as number[];
  const covers = (set: Set<number>, s: string) => [...s].every((ch) => ch === " " || set.has(ch.codePointAt(0)!));
  const displaySet = new Set(cmapOf(assets.display));
  const serifSet = new Set(cmapOf(assets.serif));
  const fallbackSet = new Set(cmapOf(assets.fallback));

  // Cap-height ratios (OS/2.sCapHeight / unitsPerEm) so a substitute face matches the design's letter height.
  const CAP = { display: 750 / 1400, fallback: 622 / 1000 };

  /** Headline text (name, course): emboldened Jersey 10, shrinking then wrapping to two lines. */
  const headline = (raw: string, spec: { baseline: number; capMm: number; minCapMm: number; maxWidth: number; band: readonly number[] }) => {
    const text = cleanText(raw);
    const useDisplay = covers(displaySet, text);
    const font = useDisplay ? display : fallback;
    const capRatio = useDisplay ? CAP.display : CAP.fallback;
    const sizeFor = (capMm: number) => pt(capMm) / capRatio;
    const capOf = (size: number) => (size * capRatio) / PT_PER_MM;
    const maxW = pt(spec.maxWidth);
    const width = (s: string, size: number) => font.widthOfTextAtSize(s, size);

    // Two stacked lines need cap·(1 + 1.45) plus a descender (0.3·cap) inside the band.
    const [bandTop, bandBottom] = spec.band;
    const twoLineCap = Math.min(spec.capMm * 0.8, (bandBottom - bandTop) / 2.75);

    let size = sizeFor(spec.capMm);
    let lines = [text];
    if (width(text, size) > maxW) {
      const shrunk = size * (maxW / width(text, size));
      if (capOf(shrunk) >= twoLineCap * 1.08 || !text.includes(" ")) {
        size = Math.max(shrunk, sizeFor(spec.minCapMm));       // one line, a little smaller
      } else {
        const words = text.split(" ");                          // balanced two-line split
        let best = [text, ""], bestW = Infinity;
        for (let i = 1; i < words.length; i++) {
          const a = words.slice(0, i).join(" "), b = words.slice(i).join(" ");
          const w = Math.max(width(a, 1), width(b, 1));
          if (w < bestW) { bestW = w; best = [a, b]; }
        }
        lines = best;
        size = Math.max(Math.min(sizeFor(twoLineCap), maxW / bestW), sizeFor(spec.minCapMm));
      }
    }
    // Last resort for pathological input: ellipsise until it fits.
    const glyphs = useDisplay ? displaySet : fallbackSet;
    lines = lines.map((l) => {
      let s = l;
      while (s.length > 1 && width(s, size) > maxW) s = s.slice(0, -2).trimEnd() + "…";
      return covers(glyphs, s) ? s : s.replace(/…$/, "...");
    });

    let baselines: number[];
    if (lines.length === 1) baselines = [spec.baseline];
    else {
      const cap = capOf(size);
      const block = cap * 2.75;
      const top = bandTop + Math.max(0, (bandBottom - bandTop - block) / 2);
      baselines = [top + cap, top + cap * 2.45];
    }
    for (let i = 0; i < lines.length; i++) {
      const w = width(lines[i], size);
      const x = pt(LAYOUT.centerX) - w / 2;
      if (useDisplay) {
        // Brick Sans is markedly heavier than any open pixel face: add a matching outline stroke.
        page.pushOperators(pushGraphicsState(), setTextRenderingMode(TextRenderingMode.FillAndOutline),
          setLineWidth(size * 0.032), setLineJoin(LineJoinStyle.Miter), setStrokingRgbColor(INK.r, INK.g, INK.b));
        page.drawText(lines[i], { x, y: y(baselines[i]), size, font, color: ink });
        page.pushOperators(popGraphicsState());
      } else {
        page.drawText(lines[i], { x, y: y(baselines[i]), size, font, color: ink });
      }
    }
  };

  /** Single-line serif text that shrinks to fit. */
  const serifLine = (raw: string, o: { x?: number; cx?: number; baseline: number; size: number; minSize?: number; maxWidth?: number }) => {
    const text = cleanText(raw);
    const font = covers(serifSet, text) ? serif : fallback;
    let size = o.size;
    if (o.maxWidth) {
      const w = font.widthOfTextAtSize(text, size);
      if (w > pt(o.maxWidth)) size = Math.max(o.minSize ?? size * 0.6, size * pt(o.maxWidth) / w);
    }
    const w = font.widthOfTextAtSize(text, size);
    const x = o.cx !== undefined ? pt(o.cx) - w / 2 : pt(o.x!);
    page.drawText(text, { x, y: y(o.baseline), size, font, color: ink });
  };

  headline(data.studentName, LAYOUT.name);
  headline(data.courseTitle, LAYOUT.course);
  serifLine(formatIssueDate(data.issuedAt), { x: LAYOUT.valueX, ...LAYOUT.issueDate });
  serifLine(data.certificateNumber, { x: LAYOUT.valueX, ...LAYOUT.certificateId });
  serifLine(data.verificationUrl.replace(/^https?:\/\//, ""), { ...LAYOUT.verification });
  serifLine(data.issuer?.trim() || "CampusCode Learning Platform", { ...LAYOUT.issuer });

  // QR code (vector): white quiet zone, then dark modules merged into horizontal runs.
  const qr = deps.qrcode(0, "M");
  qr.addData(data.verificationUrl);
  qr.make();
  const n: number = qr.getModuleCount();
  const { cx, cy, size } = LAYOUT.qr;
  const quiet = 2;
  const cell = pt(size) / (n + quiet * 2);
  const left = pt(cx) - pt(size) / 2, top = y(cy) + pt(size) / 2;
  page.drawRectangle({ x: left, y: top - pt(size), width: pt(size), height: pt(size), color: rgb(1, 1, 1) });
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!qr.isDark(r, c)) continue;
      let run = 1;
      while (c + run < n && qr.isDark(r, c + run)) run++;
      page.drawRectangle({
        x: left + (quiet + c) * cell, y: top - (quiet + r + 1) * cell,
        width: run * cell + 0.01, height: cell + 0.01, color: ink,
      });
      c += run - 1;
    }
  }

  pdf.setTitle(`Certificate of Completion — ${cleanText(data.courseTitle)}`);
  pdf.setSubject(`Issued to ${cleanText(data.studentName)} · ${data.certificateNumber}`);
  pdf.setAuthor("CampusCode");
  pdf.setCreator("CampusCode");
  pdf.setProducer("CampusCode certificates");
  pdf.setKeywords(["CampusCode", "certificate", data.certificateNumber]);
  pdf.setCreationDate(typeof data.issuedAt === "string" ? new Date(data.issuedAt) : data.issuedAt);
  return await pdf.save();
}
