# Certificate fonts

These fonts are drawn by the `certificates` Edge Function for the per-student values
(name, course, date, ID, verification link). All are licensed under the
SIL Open Font License 1.1 (https://openfontlicense.org), which permits bundling and redistribution.

| File | Font | Copyright |
|---|---|---|
| `Jersey10.ttf` | Jersey 10 (latin + latin-ext) | © 2023 The Soft Type Project Authors (github.com/scfried/soft-type-jersey) |
| `Lora-Regular.ttf` | Lora (latin + latin-ext) | © 2011 The Lora Project Authors, Reserved Font Name "Lora" |
| `NotoSansBengali-Bold.ttf` | Noto Sans Bengali Bold (bengali + latin) | © 2025 The Noto Project Authors (github.com/notofonts/bengali) |

Built from the @fontsource npm packages (woff2 subsets merged to TTF with fontTools).

The certificate background (`../template.pdf`) is the Canva design rendered from its own PPTX, with
the design's embedded fonts subset into that PDF as in any PDF export. The design's commercial faces
(Brick Sans, Avenir) are never copied into this repository as font files; Jersey 10 stands in for
Brick Sans on the dynamic text.
