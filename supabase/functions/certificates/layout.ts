// Positions of the dynamic certificate fields, in millimetres from the TOP-LEFT of the A4-landscape
// page (297 × 210 mm). Measured from the Canva design (CampusCode_certificate_of_completion.pptx):
// the placeholder boxes in the slide XML, cross-checked against a 300-dpi render of the design.
export const PAGE_MM = { w: 297, h: 210 };
export const INK = { r: 0x17 / 255, g: 0x27 / 255, b: 0x33 / 255 }; // #172733, the design's text colour

export const LAYOUT = {
  /** Text column centre shared by the heading, subtitle and body copy. */
  centerX: 146.2,
  // band = free vertical space [top, bottom] used when a value must wrap onto two lines.
  /** "[STUDENT FULL NAME]" — Brick Sans 28 pt, cap height 9.14 mm, baseline 99.28 mm. */
  name: { baseline: 99.28, capMm: 9.14, minCapMm: 4.2, maxWidth: 200, band: [87.2, 107.6] },
  /** "[COURSE NAME]" — Brick Sans 24 pt, cap height 7.79 mm, baseline 126.54 mm. */
  course: { baseline: 126.54, capMm: 7.79, minCapMm: 3.6, maxWidth: 200, band: [117.8, 133.6] },
  /** Values beside "ISSUE DATE:" / "CERTIFICATE ID:" (labels: Lora Bold 13 pt at x = 27 mm). */
  valueX: 69,
  issueDate: { baseline: 169.28, size: 11.5 },
  certificateId: { baseline: 178.25, size: 11.5 },
  /** Verification URL: under "VERIFICATION:", spanning to the QR frame. */
  verification: { x: 27, baseline: 192.4, size: 8.5, minSize: 6, maxWidth: 103 },
  /** QR code, centred in the "SCAN TO VERIFY" frame (frame: x 133.6, y 161.4, 29.9 × 28.5 mm). */
  qr: { cx: 148.55, cy: 175.65, size: 22.5 },
  /** Issuer name set in a script face on the signature line (line at y = 173.9 mm, centred at 232.6 mm). */
  signature: { cx: 232.6, baseline: 172.3, size: 30, text: "Nafi" },
  /** Line under "AUTHORIZED ISSUER" — Lora 10.37 pt, centred at 232.5 mm, baseline 186.82 mm. */
  issuer: { cx: 232.5, baseline: 186.82, size: 10.37, minSize: 7, maxWidth: 72 },
} as const;
