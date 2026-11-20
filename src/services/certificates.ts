// Certificates of Completion. Eligibility, issuance and PDF generation are server-side only:
// the browser never sends a score, a completion percentage or a "please issue" flag — it can only ask
// the server to re-check (sync), fetch a short-lived signed download URL, or verify a public token.
import { FUNCTIONS_URL, isSupabaseConfigured, supabase } from "@/lib/supabase";
import { AppError } from "@/lib/errors";
import type {
  CertificateProgress, CertificateStatus, CertificateVerification, CourseCertificateSettings, CourseRequirement,
  MyCertificate, RequirementKind,
} from "@/types/db";

async function callCertificates<T>(payload: Record<string, unknown>): Promise<T> {
  if (!isSupabaseConfigured) throw new AppError("not_configured", "This deployment isn't connected to its backend yet.");
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new AppError("auth_required", "Please sign in to continue.", 401);
  let res: Response;
  try {
    res = await fetch(`${FUNCTIONS_URL}/certificates`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new AppError("network", "Can't reach CampusCode right now. Check your connection and try again.");
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new AppError(body.error ?? "certificate_error", body.message ?? "Something went wrong. Please try again.", res.status);
  return body as T;
}

/** Re-checks eligibility on the server (issuing anything now due) and returns the caller's certificates. */
export function syncMyCertificates() {
  return callCertificates<{ certificates: MyCertificate[]; pdf_pending: boolean }>({ action: "sync" });
}

/** Short-lived (5 min) signed URL for the private PDF. Owner or admin only — enforced server-side. */
export function getCertificateDownloadUrl(certificateId: string, inline = false) {
  return callCertificates<{ url: string; expires_in: number }>({ action: "download", certificate_id: certificateId, inline });
}

export function verificationUrl(token: string) {
  return `${window.location.origin}/verify-certificate/${token}`;
}

export async function verifyCertificate(token: string): Promise<CertificateVerification> {
  const { data, error } = await supabase.rpc("verify_certificate", { p_token: token });
  if (error) throw error;
  const row = (data as CertificateVerification[] | null)?.[0];
  return row ?? { status: "not_found", student_name: null, course_title: null, certificate_number: null, issued_at: null, issuing_platform: "CampusCode" };
}

export async function getMyCertificateProgress(courseId: string): Promise<CertificateProgress | null> {
  const { data, error } = await supabase.rpc("get_my_certificate_progress", { p_course: courseId });
  if (error) throw error;
  return (data as CertificateProgress | null) ?? null;
}

/** Published requirement problems of a course (public configuration). */
export async function listCourseRequirements(courseId: string): Promise<CourseRequirement[]> {
  const { data, error } = await supabase.from("course_requirement_problems")
    .select("course_id, problem_id, kind, weight, sort_order, problems(id, slug, title, difficulty, status)")
    .eq("course_id", courseId).order("kind").order("sort_order");
  if (error) throw error;
  return (data ?? []) as unknown as CourseRequirement[];
}

/** The caller's best judged share of tests per problem — display only; the server computes the real score. */
export async function getMyBestRatios(userId: string, problemIds: string[]): Promise<Map<string, number>> {
  const best = new Map<string, number>();
  if (!problemIds.length) return best;
  const { data, error } = await supabase.from("submissions")
    .select("problem_id, passed_count, total_count").eq("user_id", userId).in("problem_id", problemIds);
  if (error) throw error;
  for (const s of data ?? []) {
    if (!s.total_count) continue;
    const r = s.passed_count / s.total_count;
    best.set(s.problem_id, Math.max(best.get(s.problem_id) ?? 0, r));
  }
  return best;
}

// ---------------------------------------------------------------- admin
export interface AdminCertificateRow {
  id: string; certificate_number: string; verification_token: string; status: CertificateStatus;
  issued_at: string; student_name: string; username: string | null; user_id: string;
  course_id: string; course_title: string; final_score: number; has_pdf: boolean;
  revoked_at: string | null; revocation_reason: string | null; total_count: number;
}

export interface CertificateFilters {
  search: string; courseId: string; status: "" | CertificateStatus; from: string; to: string;
}

export async function adminListCertificates(f: CertificateFilters, page: number, pageSize = 25): Promise<AdminCertificateRow[]> {
  const { data, error } = await supabase.rpc("admin_list_certificates", {
    p_search: f.search, p_course: f.courseId || null, p_status: f.status || null,
    p_from: f.from || null, p_to: f.to || null, p_limit: pageSize, p_offset: page * pageSize,
  });
  if (error) throw error;
  return data as AdminCertificateRow[];
}

export interface AdminCertificateDetail {
  certificate: Record<string, unknown> & { id: string; status: CertificateStatus; username?: string };
  events: { event: string; created_at: string; details: Record<string, unknown>; actor: string | null }[];
}

export async function adminCertificateDetail(id: string): Promise<AdminCertificateDetail | null> {
  const { data, error } = await supabase.rpc("admin_certificate_detail", { p_certificate: id });
  if (error) throw error;
  return data as AdminCertificateDetail | null;
}

export async function adminRevokeCertificate(id: string, reason: string) {
  const { error } = await supabase.rpc("admin_revoke_certificate", { p_certificate: id, p_reason: reason });
  if (error) throw new AppError(error.code ?? "revoke_failed", error.message);
}

export interface AdminCertificateCourse {
  course_id: string; slug: string; title_en: string; language: string;
  config: { configured: boolean; missing: string[]; enabled: boolean; passing_score: number;
            issuer_designation: string | null; lessons: number; practice: number; assessment: number };
  issued: number; revoked: number;
}

export async function adminCertificateCourses(): Promise<AdminCertificateCourse[]> {
  const { data, error } = await supabase.rpc("admin_certificate_courses");
  if (error) throw error;
  return data as AdminCertificateCourse[];
}

export async function adminGetCourseSettings(courseId: string): Promise<CourseCertificateSettings | null> {
  const { data, error } = await supabase.from("course_certificate_settings")
    .select("course_id, enabled, passing_score, issuer_designation").eq("course_id", courseId).maybeSingle();
  if (error) throw error;
  return data as CourseCertificateSettings | null;
}

export async function adminSaveCourseSettings(s: CourseCertificateSettings, adminId: string) {
  const { error } = await supabase.from("course_certificate_settings").upsert({
    course_id: s.course_id, enabled: s.enabled, passing_score: s.passing_score,
    issuer_designation: s.issuer_designation?.trim() ? s.issuer_designation.trim() : null, updated_by: adminId,
  }, { onConflict: "course_id" });
  if (error) throw error;
}

export async function adminAddRequirement(courseId: string, problemId: string, kind: RequirementKind, sortOrder: number) {
  const { error } = await supabase.from("course_requirement_problems")
    .insert({ course_id: courseId, problem_id: problemId, kind, sort_order: sortOrder });
  if (error) throw error;
}

export async function adminUpdateRequirement(courseId: string, problemId: string, patch: { weight?: number; kind?: RequirementKind }) {
  const { error } = await supabase.from("course_requirement_problems").update(patch).eq("course_id", courseId).eq("problem_id", problemId);
  if (error) throw error;
}

export async function adminRemoveRequirement(courseId: string, problemId: string) {
  const { error } = await supabase.from("course_requirement_problems").delete().eq("course_id", courseId).eq("problem_id", problemId);
  if (error) throw error;
}

export async function adminIssueEligible(courseId: string): Promise<number> {
  const { data, error } = await supabase.rpc("admin_issue_eligible_certificates", { p_course: courseId });
  if (error) throw error;
  return data as number;
}

export async function adminPublishedProblems(): Promise<{ id: string; slug: string; title: string; difficulty: string }[]> {
  const { data, error } = await supabase.from("problems").select("id, slug, title, difficulty")
    .eq("status", "published").order("title").limit(500);
  if (error) throw error;
  return data ?? [];
}

/** Opens a signed URL in a new tab, or triggers a download — without popup-blocker surprises. */
export async function openCertificatePdf(certificateId: string, mode: "view" | "download") {
  const win = mode === "view" ? window.open("", "_blank") : null;
  try {
    const { url } = await getCertificateDownloadUrl(certificateId, mode === "view");
    if (win) { win.opener = null; win.location.href = url; return; }
    const a = document.createElement("a");
    a.href = url; a.rel = "noopener"; a.download = "";
    document.body.appendChild(a); a.click(); a.remove();
  } catch (e) {
    win?.close();
    throw e;
  }
}
