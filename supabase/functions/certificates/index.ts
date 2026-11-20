// POST /functions/v1/certificates
//   { action: "render",   certificate_id }  → (no auth) render + store the PDF of a VALID certificate that has
//                                             none yet. Called by the database right after issuance; returns
//                                             nothing private and is a no-op once the PDF exists.
//   { action: "sync" }                       → (student) re-check eligibility for every course the student has
//                                             progress in (issues anything now due), render missing PDFs and
//                                             return the student's certificates.
//   { action: "download", certificate_id }   → (owner or admin) short-lived signed URL for the private PDF.
// Eligibility and issuance live in the database (certificate_eligibility / issue_certificate_if_eligible);
// nothing here trusts a score, percentage or completion flag sent by the client.
import "npm:regenerator-runtime@0.14.1/runtime.js"; // fontkit's Indic (Bangla) shaper expects this global
import * as pdfLib from "npm:pdf-lib@1.17.1";
import fontkit from "npm:@pdf-lib/fontkit@1.1.1";
import qrcode from "npm:qrcode-generator@1.4.4";
import { HttpError, serve, UUID_RE } from "../_shared/http.ts";
import { admin, getUser } from "../_shared/supabase.ts";
import { type CertificateAssets, renderCertificatePdf } from "./render.ts";

const BUCKET = "certificates";
const SITE_URL = (Deno.env.get("CERT_SITE_URL") ?? "https://campuscode-cpy.vercel.app").replace(/\/+$/, "");
// Public, versioned design assets (built from the Canva PPTX; OFL fonts). Fallback: the repository.
const ASSET_BASES = [
  `${SITE_URL}/certificate`,
  "https://raw.githubusercontent.com/sadmannafi-swe/campuscode/main/public/certificate",
];
const SIGNED_URL_SECONDS = 300;

let assetsPromise: Promise<CertificateAssets> | null = null;
async function fetchAsset(path: string): Promise<Uint8Array> {
  let last = "";
  for (const base of ASSET_BASES) {
    try {
      const res = await fetch(`${base}/${path}`, { signal: AbortSignal.timeout(15_000) });
      const bytes = new Uint8Array(await res.arrayBuffer());
      const type = res.headers.get("content-type") ?? "";
      if (res.ok && bytes.length > 1000 && !type.includes("text/html")) return bytes;
      last = `${base}: HTTP ${res.status} ${type}`;
    } catch (e) {
      last = `${base}: ${e}`;
    }
  }
  throw new Error(`certificate asset ${path} unavailable (${last})`);
}
function loadAssets(): Promise<CertificateAssets> {
  assetsPromise ??= (async () => {
    const [template, display, serif, fallback, script] = await Promise.all([
      fetchAsset("template.pdf"), fetchAsset("fonts/Jersey10.ttf"),
      fetchAsset("fonts/Lora-Regular.ttf"), fetchAsset("fonts/NotoSansBengali-Bold.ttf"),
      fetchAsset("fonts/GreatVibes-Regular.ttf"),
    ]);
    return { template, display, serif, fallback, script };
  })().catch((e) => { assetsPromise = null; throw e; });
  return assetsPromise;
}

interface CertRow {
  id: string; user_id: string; certificate_number: string; verification_token: string;
  student_name: string; course_title: string; issuer_designation: string | null;
  status: "valid" | "revoked"; issued_at: string; pdf_path: string | null;
}
const CERT_COLS = "id, user_id, certificate_number, verification_token, student_name, course_title, issuer_designation, status, issued_at, pdf_path";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Renders and stores the PDF if missing. Concurrent callers share one render via a short DB lease. */
async function ensurePdf(cert: CertRow): Promise<string> {
  if (cert.pdf_path) return cert.pdf_path;
  const { data: claimed, error: claimErr } = await admin.rpc("claim_certificate_render", { p_certificate: cert.id });
  if (claimErr) throw claimErr;
  if (!claimed) {
    // Someone else is rendering it right now: wait for the stored PDF instead of rendering twice.
    for (let i = 0; i < 20; i++) {
      const { data } = await admin.from("certificates").select("pdf_path").eq("id", cert.id).maybeSingle();
      if (data?.pdf_path) return data.pdf_path as string;
      await sleep(1000);
    }
    throw new HttpError(503, "pdf_pending", "Your certificate PDF is still being prepared. Please try again in a moment.");
  }
  const path = `${cert.user_id}/${cert.certificate_number}.pdf`;
  // A certificate counts as issued only once its PDF is stored: the printed date is that moment.
  const issuedAt = new Date().toISOString();
  try {
    const bytes = await renderCertificatePdf({ pdfLib, fontkit, qrcode }, await loadAssets(), {
      studentName: cert.student_name,
      courseTitle: cert.course_title,
      issuedAt,
      certificateNumber: cert.certificate_number,
      verificationUrl: `${SITE_URL}/verify-certificate/${cert.verification_token}`,
      issuer: cert.issuer_designation,
    });
    const { error: upErr } = await admin.storage.from(BUCKET)
      .upload(path, bytes, { contentType: "application/pdf", upsert: true, cacheControl: "3600" });
    if (upErr) throw upErr;
    const { error: dbErr } = await admin.from("certificates")
      .update({ pdf_path: path, pdf_generated_at: issuedAt, issued_at: issuedAt, pdf_error: null, pdf_render_started_at: null })
      .eq("id", cert.id).is("pdf_path", null);
    if (dbErr) throw dbErr;
    await admin.from("certificate_events").insert({
      certificate_id: cert.id, user_id: cert.user_id, event: "pdf_generated",
      details: { path, bytes: bytes.length },
    });
    return path;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("certificate PDF failed", cert.id, message);
    await admin.from("certificates").update({ pdf_error: message.slice(0, 500), pdf_render_started_at: null }).eq("id", cert.id);
    await admin.from("certificate_events").insert({
      certificate_id: cert.id, user_id: cert.user_id, event: "pdf_failed", details: { error: message.slice(0, 500) },
    });
    throw new HttpError(502, "pdf_failed", "The certificate PDF could not be generated right now. Please try again shortly.");
  }
}

async function requireUser(req: Request) {
  const user = await getUser(req);
  if (!user) throw new HttpError(401, "auth_required", "Please sign in to continue.");
  const { data } = await admin.from("profiles").select("status").eq("id", user.id).maybeSingle();
  if (data?.status !== "active") throw new HttpError(403, "account_suspended", "Your account is suspended.");
  return user;
}

const certId = (body: Record<string, unknown>) => {
  const id = body.certificate_id;
  if (typeof id !== "string" || !UUID_RE.test(id)) throw new HttpError(400, "invalid_input", "A valid certificate_id is required.");
  return id;
};

serve(async (req, body) => {
  switch (body.action) {
    case "render": {
      const id = certId(body);
      const { data: cert } = await admin.from("certificates").select(CERT_COLS).eq("id", id).maybeSingle<CertRow>();
      if (!cert || cert.status !== "valid") return { ok: false };
      if (!cert.pdf_path) await ensurePdf(cert);
      return { ok: true };
    }

    case "sync": {
      const user = await requireUser(req);
      // Courses where the student has any completed lesson: the database decides eligibility.
      const { data: done } = await admin.from("lesson_progress")
        .select("lessons!inner(course_id)").eq("user_id", user.id).eq("state", "completed");
      const courseIds = [...new Set((done ?? []).map((r) => (r as unknown as { lessons: { course_id: string } }).lessons.course_id))];
      for (const courseId of courseIds) {
        const { error } = await admin.rpc("issue_certificate_if_eligible", { p_user: user.id, p_course: courseId });
        if (error) console.error("issue_certificate_if_eligible", courseId, error.message);
      }
      const { data: certs, error } = await admin.from("certificates").select(CERT_COLS)
        .eq("user_id", user.id).order("issued_at", { ascending: false }).returns<CertRow[]>();
      if (error) throw error;
      let pdfPending = false;
      for (const c of certs ?? []) {
        if (c.status === "valid" && !c.pdf_path) {
          try { c.pdf_path = await ensurePdf(c); } catch { pdfPending = true; }
        }
      }
      return {
        pdf_pending: pdfPending,
        certificates: (certs ?? []).map((c) => ({
          id: c.id, certificate_number: c.certificate_number, verification_token: c.verification_token,
          student_name: c.student_name, course_title: c.course_title, status: c.status,
          issued_at: c.issued_at, has_pdf: Boolean(c.pdf_path),
        })),
      };
    }

    case "download": {
      const user = await requireUser(req);
      const id = certId(body);
      const { data: cert } = await admin.from("certificates").select(CERT_COLS).eq("id", id).maybeSingle<CertRow>();
      const { data: isAdmin } = await admin.rpc("is_admin", { p_user: user.id });
      // Same response for "not yours" and "does not exist": no probing of other students' certificates.
      if (!cert || (cert.user_id !== user.id && !isAdmin)) {
        throw new HttpError(404, "certificate_not_found", "Certificate not found.");
      }
      if (cert.status !== "valid" && !isAdmin) {
        throw new HttpError(410, "certificate_revoked", "This certificate has been revoked and can no longer be downloaded.");
      }
      const path = await ensurePdf(cert);
      const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_SECONDS, {
        download: body.inline === true ? undefined : `CampusCode-Certificate-${cert.certificate_number}.pdf`,
      });
      if (error || !data) throw new HttpError(502, "download_failed", "Could not prepare the download. Please try again.");
      return { url: data.signedUrl, expires_in: SIGNED_URL_SECONDS };
    }

    default:
      throw new HttpError(400, "invalid_action", "Unknown action.");
  }
});
