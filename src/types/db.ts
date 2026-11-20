// Row types mirroring supabase/migrations. Kept by hand so the UI stays readable.
export type Lang = "c" | "python";
export type UiLang = "en" | "bn";
export type Difficulty = "easy" | "medium" | "hard";
export type ProblemStatus = "draft" | "pending_review" | "published" | "rejected" | "removed";
export type Visibility = "private" | "public";
export type Verdict =
  | "accepted" | "wrong_answer" | "compilation_error" | "runtime_error"
  | "time_limit_exceeded" | "memory_limit_exceeded" | "internal_error";
export type AccountStatus = "active" | "suspended";

export interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  institution: string | null;
  preferred_language: UiLang;
  editor_theme: "ink-dark" | "paper-light";
  editor_font_size: number;
  auto_save: boolean;
  status: AccountStatus;
  created_at: string;
  updated_at: string;
}

export interface Course {
  id: string;
  slug: string;
  language: Lang;
  title_en: string;
  title_bn: string;
  description_en: string;
  description_bn: string;
  level_en: string;
  level_bn: string;
  sort_order: number;
  is_published: boolean;
  is_featured: boolean;
}

export interface Chapter {
  id: string;
  course_id: string;
  slug: string;
  title_en: string;
  title_bn: string;
  description_en: string;
  description_bn: string;
  sort_order: number;
  is_published: boolean;
}

export interface LessonSummary {
  id: string;
  course_id: string;
  chapter_id: string;
  slug: string;
  number: number;
  title_en: string;
  title_bn: string;
  summary_en: string;
  summary_bn: string;
  is_project: boolean;
  estimated_minutes: number;
  is_published: boolean;
}

export interface Lesson extends LessonSummary {
  objectives_en: string[];
  objectives_bn: string[];
  body_en: string;
  body_bn: string;
  common_mistakes_en: string[];
  common_mistakes_bn: string[];
  practice_en: string[];
  practice_bn: string[];
  video_url: string | null;
  practice_topic_id: string | null;
}

export interface LessonExample {
  id: string;
  lesson_id: string;
  sort_order: number;
  title_en: string;
  title_bn: string;
  language: Lang;
  code: string;
  stdin: string;
  expected_output: string;
  explanation_en: string;
  explanation_bn: string;
}

export interface LessonProgress {
  user_id: string;
  lesson_id: string;
  state: "started" | "completed";
  completed_at: string | null;
  updated_at: string;
}

export interface Topic {
  id: string;
  slug: string;
  name_en: string;
  name_bn: string;
  description_en: string;
  description_bn: string;
  sort_order: number;
}

export interface Problem {
  id: string;
  slug: string;
  title: string;
  title_bn: string | null;
  statement: string;
  statement_bn: string | null;
  input_format: string;
  output_format: string;
  constraints: string;
  explanation: string;
  hints: string[];
  difficulty: Difficulty;
  topic_id: string | null;
  starter_code_c: string | null;
  starter_code_python: string | null;
  allowed_languages: Lang[];
  time_limit_ms: number;
  memory_limit_kb: number;
  author_id: string | null;
  is_official: boolean;
  visibility: Visibility;
  status: ProblemStatus;
  is_featured: boolean;
  moderation_note: string | null;
  submission_count: number;
  accepted_count: number;
  solver_count: number;
  created_at: string;
  updated_at: string;
}

export type ProblemListItem = Pick<Problem,
  "id" | "slug" | "title" | "title_bn" | "difficulty" | "topic_id" | "statement" | "is_official" |
  "submission_count" | "accepted_count" | "solver_count" | "status" | "author_id" | "created_at">;

export interface TestCase {
  id: string;
  problem_id: string;
  sort_order: number;
  input: string;
  expected_output: string;
  is_sample: boolean;
  explanation: string | null;
}

export interface Submission {
  id: string;
  user_id: string;
  problem_id: string;
  language: Lang;
  source_code: string;
  verdict: Verdict;
  passed_count: number;
  total_count: number;
  time_ms: number | null;
  memory_kb: number | null;
  compile_output: string | null;
  failed_test_index: number | null;
  created_at: string;
}

export interface UserProblemProgress {
  problem_id: string;
  attempts: number;
  solved_at: string | null;
  last_verdict: Verdict | null;
}

export interface SavedCode {
  id: string;
  user_id: string;
  title: string;
  language: Lang;
  source_code: string;
  stdin: string;
  description: string | null;
  topic_id: string | null;
  problem_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExecutionLog {
  id: string;
  kind: "run" | "samples" | "submit";
  language: Lang;
  status: string;
  time_ms: number | null;
  memory_kb: number | null;
  problem_id: string | null;
  created_at: string;
}

export interface UserStats {
  user_id: string;
  problems_solved: number;
  accepted_submissions: number;
  total_submissions: number;
  total_runs: number;
  lessons_completed: number;
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
}

export interface Achievement {
  id: string;
  title_en: string;
  title_bn: string;
  description_en: string;
  description_bn: string;
  icon: string;
  metric: string;
  threshold: number;
  sort_order: number;
}

export interface DailyActivity {
  activity_date: string;
  runs: number;
  submissions: number;
  accepted: number;
  lessons_completed: number;
}

export interface Notification {
  id: string;
  kind: string;
  title: string;
  body: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export interface Announcement {
  id: string;
  title_en: string;
  title_bn: string | null;
  body_en: string;
  body_bn: string | null;
  link: string | null;
  is_active: boolean;
  starts_at: string;
  ends_at: string | null;
  created_at: string;
}

export interface ProblemReport {
  id: string;
  problem_id: string;
  reporter_id: string;
  reason: "incorrect" | "inappropriate" | "duplicate" | "spam" | "other";
  details: string | null;
  status: "open" | "resolved" | "dismissed";
  admin_note: string | null;
  created_at: string;
}

export interface TopicProgress {
  topic_id: string;
  slug: string;
  name_en: string;
  name_bn: string;
  sort_order: number;
  total: number;
  easy: number;
  medium: number;
  hard: number;
  solved: number;
}

export interface CourseProgress {
  course_id: string;
  total: number;
  completed: number;
  last_lesson_id: string | null;
}

// Edge function payloads -------------------------------------------------
export interface RunResult {
  mode: "custom";
  outcome: "success" | Verdict;
  status: string;
  stdout: string;
  stderr: string;
  compile_output: string;
  message: string;
  time_ms: number | null;
  memory_kb: number | null;
}

export interface SampleResultItem {
  index: number;
  input: string;
  expected: string;
  actual: string;
  stderr: string;
  outcome: "passed" | Verdict;
  passed: boolean;
  time_ms: number | null;
}

export interface SamplesResult {
  mode: "samples";
  compile_output: string;
  passed: number;
  total: number;
  results: SampleResultItem[];
}

export interface SubmitResult {
  submission_id: string;
  created_at: string;
  verdict: Verdict;
  passed: number;
  total: number;
  time_ms: number | null;
  memory_kb: number | null;
  compile_output: string | null;
  failed_test:
    | { number: number; hidden: false; input: string; expected: string; actual: string; stderr: string }
    | { number: number; hidden: true }
    | null;
}

export interface LearningVideo {
  id: string;
  course_id: string;
  lesson_id: string | null;
  provider: "youtube";
  youtube_video_id: string;
  source_playlist_id: string | null;
  playlist_position: number | null;
  title: string;
  channel_name: string | null;
  duration_seconds: number | null;
  note_en: string | null;
  note_bn: string | null;
  sort_order: number;
  is_published: boolean;
}

export interface VideoProgress {
  user_id: string;
  video_id: string;
  position_seconds: number;
  watched_seconds: number;
  started_at: string;
  completed_at: string | null;
  updated_at: string;
}

// ---------- Certificates of Completion --------------------------------
export type CertificateStatus = "valid" | "revoked";
export type RequirementKind = "practice" | "assessment";

/** A student's own certificate, as returned by the `certificates` Edge Function (sync). */
export interface MyCertificate {
  id: string;
  certificate_number: string;
  verification_token: string;
  student_name: string;
  course_title: string;
  status: CertificateStatus;
  issued_at: string;
  has_pdf: boolean;
}

/** Public verification result — contains only non-private fields. */
export interface CertificateVerification {
  status: CertificateStatus | "not_found";
  student_name: string | null;
  course_title: string | null;
  certificate_number: string | null;
  issued_at: string | null;
  issuing_platform: string;
}

/** Server-computed requirement checklist for the signed-in student (get_my_certificate_progress). */
export interface CertificateProgress {
  course_id: string;
  configured: boolean;
  missing_config: string[];
  eligible: boolean;
  account_active: boolean;
  name_present: boolean;
  lessons: { done: number; total: number };
  practice: { done: number; total: number };
  assessment: { score: number | null; passing_score: number; attempted: number; total: number; passed: boolean };
  certificate: { id: string; certificate_number: string; status: CertificateStatus; issued_at: string } | null;
}

export interface CourseCertificateSettings {
  course_id: string;
  enabled: boolean;
  passing_score: number;
  issuer_designation: string | null;
}

export interface CourseRequirement {
  course_id: string;
  problem_id: string;
  kind: RequirementKind;
  weight: number;
  sort_order: number;
  problems: { id: string; slug: string; title: string; difficulty: Difficulty; status: ProblemStatus } | null;
}
