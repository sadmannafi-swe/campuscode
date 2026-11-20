import { supabase } from "@/lib/supabase";
import type {
  Difficulty, Lang, Problem, ProblemListItem, ProblemReport, Submission, TestCase, Topic, TopicProgress,
  UserProblemProgress, Visibility,
} from "@/types/db";

const LIST_FIELDS = "id, slug, title, title_bn, difficulty, topic_id, statement, is_official, submission_count, accepted_count, solver_count, status, author_id, created_at";

export async function listTopics(): Promise<Topic[]> {
  const { data, error } = await supabase.from("problem_topics").select("*").order("sort_order");
  if (error) throw error;
  return data as Topic[];
}

export async function listPublishedProblems(): Promise<ProblemListItem[]> {
  const { data, error } = await supabase.from("problems").select(LIST_FIELDS)
    .eq("status", "published").order("is_official", { ascending: false }).order("created_at").limit(1000);
  if (error) throw error;
  return data as ProblemListItem[];
}

export async function listMyProblems(userId: string): Promise<ProblemListItem[]> {
  const { data, error } = await supabase.from("problems").select(LIST_FIELDS + ", moderation_note")
    .eq("author_id", userId).order("updated_at", { ascending: false });
  if (error) throw error;
  return data as unknown as ProblemListItem[];
}

export async function getProblemBySlug(slug: string): Promise<Problem | null> {
  const { data, error } = await supabase.from("problems").select("*").eq("slug", slug).maybeSingle();
  if (error) throw error;
  return data as Problem | null;
}

export async function getProblemById(id: string): Promise<Problem | null> {
  const { data, error } = await supabase.from("problems").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as Problem | null;
}

/** Sample tests are public; RLS hides hidden tests from everyone except the author and admins. */
export async function getSampleTests(problemId: string): Promise<TestCase[]> {
  const { data, error } = await supabase.from("test_cases").select("*")
    .eq("problem_id", problemId).eq("is_sample", true).order("sort_order");
  if (error) throw error;
  return data as TestCase[];
}

/** All tests — only returns hidden ones when the caller is the author or an admin (enforced by RLS). */
export async function getAllTestsForEditing(problemId: string): Promise<TestCase[]> {
  const { data, error } = await supabase.from("test_cases").select("*").eq("problem_id", problemId).order("sort_order");
  if (error) throw error;
  return data as TestCase[];
}

export async function getMyProgress(userId: string): Promise<UserProblemProgress[]> {
  const { data, error } = await supabase.from("user_problem_progress")
    .select("problem_id, attempts, solved_at, last_verdict").eq("user_id", userId);
  if (error) throw error;
  return data as UserProblemProgress[];
}

export async function getTopicProgress(): Promise<TopicProgress[]> {
  const { data, error } = await supabase.rpc("get_topic_progress");
  if (error) throw error;
  return data as TopicProgress[];
}

export async function getDailyProblem(): Promise<Pick<Problem, "id" | "slug" | "title" | "title_bn" | "difficulty" | "topic_id"> | null> {
  const { data, error } = await supabase.rpc("get_daily_problem");
  if (error) throw error;
  return (data as Problem[])[0] ?? null;
}

export async function getAuthorName(authorId: string): Promise<string | null> {
  const { data } = await supabase.from("profiles").select("full_name, username").eq("id", authorId).maybeSingle();
  return data ? (data.full_name || data.username) : null;
}

// ---------- bookmarks ----------
export async function isBookmarked(userId: string, problemId: string): Promise<boolean> {
  const { data } = await supabase.from("problem_bookmarks").select("problem_id").eq("user_id", userId).eq("problem_id", problemId).maybeSingle();
  return Boolean(data);
}
export async function setBookmark(userId: string, problemId: string, on: boolean) {
  const q = on
    ? supabase.from("problem_bookmarks").insert({ user_id: userId, problem_id: problemId })
    : supabase.from("problem_bookmarks").delete().eq("user_id", userId).eq("problem_id", problemId);
  const { error } = await q;
  if (error && error.code !== "23505") throw error;
}

// ---------- submissions ----------
export type SubmissionWithProblem = Submission & { problems: { slug: string; title: string } | null };

export async function listMySubmissions(userId: string, problemId?: string, limit = 50): Promise<SubmissionWithProblem[]> {
  let q = supabase.from("submissions").select("*, problems(slug, title)").eq("user_id", userId)
    .order("created_at", { ascending: false }).limit(limit);
  if (problemId) q = q.eq("problem_id", problemId);
  const { data, error } = await q;
  if (error) throw error;
  return data as unknown as SubmissionWithProblem[];
}

// ---------- reports ----------
export async function reportProblem(userId: string, problemId: string, reason: ProblemReport["reason"], details: string) {
  const { error } = await supabase.from("problem_reports")
    .insert({ reporter_id: userId, problem_id: problemId, reason, details: details || null });
  if (error && error.code !== "23505") throw error;
}

// ---------- authoring ----------
export interface TestDraft { id?: string; input: string; expected_output: string; is_sample: boolean }
export interface ProblemDraft {
  title: string;
  title_bn?: string | null;
  statement: string;
  statement_bn?: string | null;
  input_format: string;
  output_format: string;
  constraints: string;
  explanation: string;
  hints: string[];
  difficulty: Difficulty;
  topic_id: string | null;
  starter_code_c: string | null;
  starter_code_python: string | null;
  allowed_languages?: Lang[];
  visibility: Visibility;
  time_limit_ms?: number;
  memory_limit_kb?: number;
}

function randomSuffix() {
  return Math.random().toString(36).slice(2, 7);
}

/**
 * Saves a problem and replaces its tests. Status/official/featured flags are decided by the
 * database guard trigger for non-admins, so nothing here can self-publish.
 */
export async function saveProblem(
  draft: ProblemDraft & { status?: Problem["status"]; is_official?: boolean; is_featured?: boolean },
  tests: TestDraft[],
  opts: { id?: string; slugBase: string; authorId: string },
): Promise<Problem> {
  let problem: Problem;
  if (opts.id) {
    const { data, error } = await supabase.from("problems").update(draft).eq("id", opts.id).select("*").single();
    if (error) throw error;
    problem = data as Problem;
  } else {
    const slug = `${opts.slugBase || "problem"}-${randomSuffix()}`.slice(0, 80);
    const { data, error } = await supabase.from("problems")
      .insert({ ...draft, slug, author_id: opts.authorId }).select("*").single();
    if (error) throw error;
    problem = data as Problem;
  }
  const { error: delErr } = await supabase.from("test_cases").delete().eq("problem_id", problem.id);
  if (delErr) throw delErr;
  if (tests.length) {
    const rows = tests.map((t, i) => ({
      problem_id: problem.id, sort_order: i, input: t.input, expected_output: t.expected_output, is_sample: t.is_sample,
    }));
    const { error } = await supabase.from("test_cases").insert(rows);
    if (error) throw error;
  }
  return problem;
}

export async function deleteProblem(id: string) {
  const { error } = await supabase.from("problems").delete().eq("id", id);
  if (error) throw error;
}
