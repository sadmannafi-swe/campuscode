// Admin data access. Every call is authorised by the database (RLS + is_admin() inside RPCs);
// hiding admin UI from students is a convenience, not the security boundary.
import { supabase } from "@/lib/supabase";
import type {
  AccountStatus, Announcement, Chapter, Course, Lesson, LessonExample, Problem, ProblemReport, ProblemStatus,
} from "@/types/db";

export interface AdminStats {
  total_users: number;
  active_users_7d: number;
  suspended_users: number;
  total_problems: number;
  pending_problems: number;
  total_submissions: number;
  accepted_submissions: number;
  runs_7d: number;
  open_reports: number;
  courses: number;
  published_lessons: number;
  lesson_completions: number;
  recent_submissions: { id: string; verdict: string; language: string; created_at: string; problem_title: string; username: string }[];
  recent_signups: { id: string; username: string; full_name: string; created_at: string }[];
}

export async function getAdminStats(): Promise<AdminStats> {
  const { data, error } = await supabase.rpc("admin_dashboard_stats");
  if (error) throw error;
  return data as AdminStats;
}

export interface AdminUserRow {
  id: string; email: string; username: string; full_name: string; avatar_url: string | null;
  status: AccountStatus; is_admin: boolean; created_at: string;
  problems_solved: number; lessons_completed: number; last_active_date: string | null; total_count: number;
}

export async function listUsers(search: string, page: number, pageSize = 25): Promise<AdminUserRow[]> {
  const { data, error } = await supabase.rpc("admin_list_users", { p_search: search, p_limit: pageSize, p_offset: page * pageSize });
  if (error) throw error;
  return data as AdminUserRow[];
}

export async function setUserStatus(userId: string, status: AccountStatus) {
  const { error } = await supabase.rpc("admin_set_user_status", { p_user: userId, p_status: status });
  if (error) throw error;
}

export async function setAdminRole(userId: string, grant: boolean) {
  const { error } = await supabase.rpc("admin_set_role", { p_user: userId, p_role: "admin", p_grant: grant });
  if (error) throw error;
}

// ---------- problems ----------
export type AdminProblemRow = Pick<Problem, "id" | "slug" | "title" | "difficulty" | "topic_id" | "status" | "is_official" |
  "is_featured" | "visibility" | "author_id" | "submission_count" | "accepted_count" | "updated_at">;

export async function listAllProblems(status?: ProblemStatus | "all"): Promise<AdminProblemRow[]> {
  let q = supabase.from("problems")
    .select("id, slug, title, difficulty, topic_id, status, is_official, is_featured, visibility, author_id, submission_count, accepted_count, updated_at")
    .order("updated_at", { ascending: false }).limit(500);
  if (status && status !== "all") q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw error;
  return data as AdminProblemRow[];
}

export async function moderateProblem(id: string, status: ProblemStatus, note?: string, featured?: boolean) {
  const { error } = await supabase.rpc("admin_moderate_problem", {
    p_problem: id, p_status: status, p_note: note ?? null, p_featured: featured ?? null,
  });
  if (error) throw error;
}

// ---------- reports ----------
export type ReportRow = ProblemReport & { problems: { slug: string; title: string } | null; profiles: { username: string } | null };

export async function listReports(status: ProblemReport["status"] | "all"): Promise<ReportRow[]> {
  let q = supabase.from("problem_reports").select("*, problems(slug, title)").order("created_at", { ascending: false }).limit(200);
  if (status !== "all") q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw error;
  const rows = data as ReportRow[];
  const ids = [...new Set(rows.map((r) => r.reporter_id))];
  if (ids.length) {
    const { data: profiles } = await supabase.from("profiles").select("id, username").in("id", ids);
    const map = new Map((profiles ?? []).map((p) => [p.id, p.username]));
    rows.forEach((r) => { r.profiles = { username: map.get(r.reporter_id) ?? "unknown" }; });
  }
  return rows;
}

export async function resolveReport(id: string, adminId: string, status: "resolved" | "dismissed", note: string) {
  const { error } = await supabase.from("problem_reports")
    .update({ status, admin_note: note || null, resolved_by: adminId, resolved_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

// ---------- announcements ----------
export async function listAnnouncements(): Promise<Announcement[]> {
  const { data, error } = await supabase.from("announcements").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data as Announcement[];
}
export async function saveAnnouncement(a: Partial<Announcement> & { title_en: string }, adminId: string) {
  const { id, ...rest } = a;
  const q = id
    ? supabase.from("announcements").update(rest).eq("id", id)
    : supabase.from("announcements").insert({ ...rest, created_by: adminId });
  const { error } = await q;
  if (error) throw error;
}
export async function deleteAnnouncement(id: string) {
  const { error } = await supabase.from("announcements").delete().eq("id", id);
  if (error) throw error;
}

// ---------- settings ----------
export async function listSettings(): Promise<{ key: string; value: unknown; is_public: boolean; updated_at: string }[]> {
  const { data, error } = await supabase.from("platform_settings").select("*").order("key");
  if (error) throw error;
  return data ?? [];
}
export async function setSetting(key: string, value: unknown, adminId: string) {
  const { error } = await supabase.from("platform_settings").upsert({ key, value, updated_by: adminId });
  if (error) throw error;
}

// ---------- courses / chapters / lessons ----------
export async function adminListCourses(): Promise<Course[]> {
  const { data, error } = await supabase.from("courses").select("*").order("sort_order");
  if (error) throw error;
  return data as Course[];
}
export async function saveCourse(c: Partial<Course>) {
  const { id, ...rest } = c;
  const { error } = id ? await supabase.from("courses").update(rest).eq("id", id) : await supabase.from("courses").insert(rest);
  if (error) throw error;
}
export async function deleteCourse(id: string) {
  const { error } = await supabase.from("courses").delete().eq("id", id);
  if (error) throw error;
}
export async function saveChapter(c: Partial<Chapter>) {
  const { id, ...rest } = c;
  const { error } = id ? await supabase.from("chapters").update(rest).eq("id", id) : await supabase.from("chapters").insert(rest);
  if (error) throw error;
}
export async function deleteChapter(id: string) {
  const { error } = await supabase.from("chapters").delete().eq("id", id);
  if (error) throw error;
}
export async function adminGetLesson(id: string): Promise<{ lesson: Lesson; examples: LessonExample[] }> {
  const [{ data: lesson, error }, { data: examples, error: e2 }] = await Promise.all([
    supabase.from("lessons").select("*").eq("id", id).single(),
    supabase.from("lesson_examples").select("*").eq("lesson_id", id).order("sort_order"),
  ]);
  if (error) throw error;
  if (e2) throw e2;
  return { lesson: lesson as Lesson, examples: examples as LessonExample[] };
}
export async function saveLesson(l: Partial<Lesson>, examples?: Partial<LessonExample>[]): Promise<string> {
  const { id, ...rest } = l;
  let lessonId = id;
  if (id) {
    const { error } = await supabase.from("lessons").update(rest).eq("id", id);
    if (error) throw error;
  } else {
    const { data, error } = await supabase.from("lessons").insert(rest).select("id").single();
    if (error) throw error;
    lessonId = data.id;
  }
  if (examples) {
    const { error: d } = await supabase.from("lesson_examples").delete().eq("lesson_id", lessonId!);
    if (d) throw d;
    if (examples.length) {
      const rows = examples.map((e, i) => ({
        lesson_id: lessonId, sort_order: i, title_en: e.title_en ?? "", title_bn: e.title_bn ?? "", language: e.language ?? "c",
        code: e.code ?? "", stdin: e.stdin ?? "", expected_output: e.expected_output ?? "",
        explanation_en: e.explanation_en ?? "", explanation_bn: e.explanation_bn ?? "",
      }));
      const { error } = await supabase.from("lesson_examples").insert(rows);
      if (error) throw error;
    }
  }
  return lessonId!;
}
export async function deleteLesson(id: string) {
  const { error } = await supabase.from("lessons").delete().eq("id", id);
  if (error) throw error;
}
