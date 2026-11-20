#!/usr/bin/env python3
"""Builds the certificate background template from the Canva PPTX design.

    python3 scripts/certificate/build_template.py path/to/CampusCode_certificate_of_completion.pptx

Output (committed): public/certificate/template.pdf   (A4 landscape, vector text, used by the
                    `certificates` Edge Function as the page background)
                    public/certificate/preview.jpg    (small raster for the in-app preview card)

How it works
  * The design's own embedded fonts (Brick Sans, Avenir, Cinzel, Lora, Alice) are read from the
    PPTX only to render THIS document - exactly what font embedding is for. They are written to a
    temporary fontconfig directory and deleted afterwards; no font file is ever copied into the repo.
  * The dynamic placeholders ([STUDENT FULL NAME], [COURSE NAME], issuer line) are removed; the
    Edge Function draws those values at the same positions (see supabase/functions/certificates/layout.ts).
  * Canva sizes text boxes to the exact text width, which makes LibreOffice wrap single lines on
    rounding; single-line static boxes therefore get wrap="none" (same position, same alignment).

Requires: LibreOffice (soffice), poppler-utils (pdftoppm), fontTools, Pillow.
"""
import os, re, shutil, struct, subprocess, sys, tempfile, zipfile
from fontTools.ttLib import TTFont
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT = os.path.join(ROOT, "public", "certificate")

REMOVE = {"TextBox 14", "TextBox 16", "TextBox 23"}   # name, course, issuer line (drawn dynamically)
NOWRAP = {"TextBox 8", "TextBox 9", "TextBox 12", "TextBox 13", "TextBox 15", "TextBox 22", "TextBox 24", "TextBox 27"}


def extract_fonts(z, dest):
    pres = z.read("ppt/presentation.xml").decode()
    rels = z.read("ppt/_rels/presentation.xml.rels").decode()
    targets = dict(re.findall(r'Id="(rId\d+)" Target="(fonts/[^"]+)"', rels))
    targets.update({a: b for b, a in re.findall(r'Target="(fonts/[^"]+)"[^>]*Id="(rId\d+)"', rels)})
    for face, rid in re.findall(r'<p:font typeface="([^"]+)"[^>]*/><p:regular r:id="(rId\d+)"/>', pres):
        data = z.read("ppt/" + targets[rid])
        size = struct.unpack("<I", data[4:8])[0]          # EOT header: FontDataSize
        flags = struct.unpack("<I", data[12:16])[0]
        if flags & 0x4:
            raise SystemExit(f"{face}: MTX-compressed EOT is not supported")
        ttf = bytearray(data[len(data) - size:])
        if flags & 0x10000000:                            # XOR-obfuscated
            ttf = bytearray(b ^ 0x50 for b in ttf)
        path = os.path.join(dest, face.replace(" ", "") + ".ttf")
        open(path, "wb").write(ttf)
        # Register under the exact typeface name the slide uses ("Lora Bold", "Avenir Medium", ...).
        f = TTFont(path)
        n = f["name"]
        for nid in (16, 17, 21, 22):
            n.removeNames(nameID=nid)
        for pid, eid, lid in ((3, 1, 0x409), (1, 0, 0)):
            n.setName(face, 1, pid, eid, lid); n.setName("Regular", 2, pid, eid, lid)
            n.setName(face, 4, pid, eid, lid); n.setName(face.replace(" ", "") + "-CCTemplate", 6, pid, eid, lid)
        f["OS/2"].fsSelection = (f["OS/2"].fsSelection & ~0b100001) | 0b1000000
        f["OS/2"].usWeightClass = 400
        f["head"].macStyle = 0
        f.save(path)


def patch_slide(xml):
    def fix(m):
        sp = m.group(0)
        name = re.search(r'name="([^"]*)"', sp).group(1)
        if name in REMOVE:
            return ""
        if name in NOWRAP:
            sp = sp.replace("<a:bodyPr ", '<a:bodyPr wrap="none" ', 1)
        return sp
    return re.sub(r"<p:sp>.*?</p:sp>", fix, xml, flags=re.S)


def main(src):
    os.makedirs(OUT, exist_ok=True)
    work = tempfile.mkdtemp(prefix="cc-cert-")
    fontdir = os.path.join(work, "fonts"); os.makedirs(fontdir)
    try:
        with zipfile.ZipFile(src) as z:
            extract_fonts(z, fontdir)
            pptx = os.path.join(work, "template.pptx")
            with zipfile.ZipFile(pptx, "w", zipfile.ZIP_DEFLATED) as out:
                for item in z.infolist():
                    data = z.read(item.filename)
                    if item.filename == "ppt/slides/slide1.xml":
                        data = patch_slide(data.decode()).encode()
                    out.writestr(item, data)
        conf = os.path.join(work, "fonts.conf")
        open(conf, "w").write(f'<?xml version="1.0"?><fontconfig><dir>{fontdir}</dir>'
                              f'<include ignore_missing="yes">/etc/fonts/fonts.conf</include>'
                              f'<cachedir>{work}/cache</cachedir></fontconfig>')
        env = dict(os.environ, FONTCONFIG_FILE=conf, HOME=work)
        subprocess.run(["soffice", "--headless", "--convert-to", "pdf", "--outdir", work, pptx],
                       check=True, env=env, stdout=subprocess.DEVNULL, timeout=180)
        fonts = subprocess.run(["pdffonts", os.path.join(work, "template.pdf")], capture_output=True, text=True).stdout
        if "CCTemplate" not in fonts or "Inter" in fonts or "Liberation" in fonts:
            raise SystemExit("Design fonts were not used by LibreOffice:\n" + fonts)
        shutil.copy(os.path.join(work, "template.pdf"), os.path.join(OUT, "template.pdf"))
        subprocess.run(["pdftoppm", "-r", "100", "-png", "-singlefile", os.path.join(OUT, "template.pdf"),
                        os.path.join(work, "preview")], check=True)
        im = Image.open(os.path.join(work, "preview.png")).convert("RGB")
        im.thumbnail((1200, 1200))
        im.save(os.path.join(OUT, "preview.jpg"), quality=86, optimize=True, progressive=True)
        print("wrote", os.path.join(OUT, "template.pdf"), "and preview.jpg")
    finally:
        shutil.rmtree(work, ignore_errors=True)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    main(sys.argv[1])
