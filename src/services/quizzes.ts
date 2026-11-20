// Module quizzes. Every rule (unlocking, shuffling, grading, passing, course completion) runs in the
// database; the browser only asks to start, saves an option choice, and asks to submit.
import { supabase } from "@/lib/supabase";
import { AppError } from "@/lib/errors";
import type { ModuleOverview, QuizAttempt } from "@/types/db";

const FRIENDLY: Record<string, string> = {
  quiz_locked: "This quiz is locked. Complete every lesson in the module (and pass the previous module's quiz) first.",
  quiz_already_passed: "You have already passed this quiz.",
  attempt_closed: "This attempt has already been submitted.",
  attempt_not_found: "This quiz attempt could not be found.",
  module_locked: "This module is locked. Pass the previous module's quiz to unlock it.",
  account_suspended: "Your account is suspended.",
};

function rpcError(error: { message?: string; code?: string }): never {
  const key = Object.keys(FRIENDLY).find((k) => (error.message ?? "").startsWith(k));
  if (key) throw new AppError(key, FRIENDLY[key]);
  throw error;
}

export async function getCourseQuizOverview(courseId: string): Promise<ModuleOverview[]> {
  const { data, error } = await supabase.rpc("get_course_quiz_overview", { p_course: courseId });
  if (error) rpcError(error);
  return (data ?? []) as ModuleOverview[];
}

export async function startQuizAttempt(quizId: string): Promise<string> {
  const { data, error } = await supabase.rpc("start_quiz_attempt", { p_quiz: quizId });
  if (error) rpcError(error);
  return data as string;
}

export async function getQuizAttempt(attemptId: string): Promise<QuizAttempt> {
  const { data, error } = await supabase.rpc("get_quiz_attempt", { p_attempt: attemptId });
  if (error) rpcError(error);
  return data as QuizAttempt;
}

export async function saveQuizAnswer(attemptId: string, questionId: string, optionId: string) {
  const { error } = await supabase.rpc("save_quiz_answer", { p_attempt: attemptId, p_question: questionId, p_option: optionId });
  if (error) rpcError(error);
}

export async function submitQuizAttempt(attemptId: string): Promise<QuizAttempt> {
  const { data, error } = await supabase.rpc("submit_quiz_attempt", { p_attempt: attemptId });
  if (error) rpcError(error);
  return data as QuizAttempt;
}

/** Maps a lesson-completion error from the module lock to a friendly message. */
export function lockedModuleError(e: unknown): AppError | null {
  const msg = (e as { message?: string } | null)?.message ?? "";
  return msg.startsWith("module_locked") ? new AppError("module_locked", FRIENDLY.module_locked) : null;
}

// ---------------------------------------------------------------- admin
export interface AdminQuizStat {
  quiz_id: string; course_title: string; module_number: number; chapter_title: string; quiz_title: string;
  attempts: number; students: number; passed_students: number; failed_attempts: number; avg_score: number | null;
}
export async function adminQuizStats(): Promise<AdminQuizStat[]> {
  const { data, error } = await supabase.rpc("admin_quiz_stats");
  if (error) throw error;
  return data as AdminQuizStat[];
}

export interface AdminQuizAttemptRow {
  id: string; user_id: string; username: string | null; full_name: string | null; quiz_id: string; quiz_title: string;
  status: "in_progress" | "passed" | "failed"; correct_count: number | null; total_count: number | null; score: number | null;
  started_at: string; submitted_at: string | null; attempt_number: number; code_correct: number; total_count_rows: number;
}
export async function adminListQuizAttempts(f: { search: string; quizId: string; status: string }, page: number, pageSize = 25): Promise<AdminQuizAttemptRow[]> {
  const { data, error } = await supabase.rpc("admin_list_quiz_attempts", {
    p_search: f.search, p_quiz: f.quizId || null, p_status: f.status || null, p_limit: pageSize, p_offset: page * pageSize,
  });
  if (error) throw error;
  return data as AdminQuizAttemptRow[];
}
