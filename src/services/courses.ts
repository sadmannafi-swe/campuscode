import { supabase } from "@/lib/supabase";
import type { Chapter, Course, CourseProgress, Lesson, LessonExample, LessonProgress, LessonSummary } from "@/types/db";

const LESSON_SUMMARY = "id, course_id, chapter_id, slug, number, title_en, title_bn, summary_en, summary_bn, is_project, estimated_minutes, is_published";

export async function listCourses(): Promise<(Course & { lessons: { count: number }[] })[]> {
  const { data, error } = await supabase.from("courses").select("*, lessons(count)").order("sort_order");
  if (error) throw error;
  return data as (Course & { lessons: { count: number }[] })[];
}

export interface CourseOutline {
  course: Course;
  chapters: (Chapter & { lessons: LessonSummary[] })[];
  lessons: LessonSummary[];
}

export async function getCourseOutline(slug: string): Promise<CourseOutline | null> {
  const { data: course, error } = await supabase.from("courses").select("*").eq("slug", slug).maybeSingle();
  if (error) throw error;
  if (!course) return null;
  const [{ data: chapters, error: e1 }, { data: lessons, error: e2 }] = await Promise.all([
    supabase.from("chapters").select("*").eq("course_id", course.id).order("sort_order"),
    supabase.from("lessons").select(LESSON_SUMMARY).eq("course_id", course.id).order("number"),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;
  const ls = (lessons ?? []) as LessonSummary[];
  return {
    course: course as Course,
    lessons: ls,
    chapters: ((chapters ?? []) as Chapter[]).map((ch) => ({ ...ch, lessons: ls.filter((l) => l.chapter_id === ch.id) })),
  };
}

export async function getLesson(courseId: string, lessonSlug: string): Promise<{ lesson: Lesson; examples: LessonExample[] } | null> {
  const { data: lesson, error } = await supabase.from("lessons").select("*")
    .eq("course_id", courseId).eq("slug", lessonSlug).maybeSingle();
  if (error) throw error;
  if (!lesson) return null;
  const { data: examples, error: e2 } = await supabase.from("lesson_examples").select("*")
    .eq("lesson_id", lesson.id).order("sort_order");
  if (e2) throw e2;
  return { lesson: lesson as Lesson, examples: (examples ?? []) as LessonExample[] };
}

export async function getLessonById(id: string): Promise<(LessonSummary & { courses: { slug: string } }) | null> {
  const { data, error } = await supabase.from("lessons").select(`${LESSON_SUMMARY}, courses(slug)`).eq("id", id).maybeSingle();
  if (error) throw error;
  return data as unknown as (LessonSummary & { courses: { slug: string } }) | null;
}

export async function getMyLessonProgress(userId: string): Promise<LessonProgress[]> {
  const { data, error } = await supabase.from("lesson_progress").select("*").eq("user_id", userId);
  if (error) throw error;
  return data as LessonProgress[];
}

export async function getCourseProgress(): Promise<CourseProgress[]> {
  const { data, error } = await supabase.rpc("get_course_progress");
  if (error) throw error;
  return data as CourseProgress[];
}

/** Records that a lesson was opened (no-op if already tracked). */
export async function markLessonStarted(userId: string, lessonId: string) {
  const { error } = await supabase.from("lesson_progress")
    .upsert({ user_id: userId, lesson_id: lessonId, state: "started" }, { onConflict: "user_id,lesson_id", ignoreDuplicates: true });
  if (error) throw error;
  // touch updated_at so "resume learning" points at the most recent lesson
  await supabase.from("lesson_progress").update({ user_id: userId }).eq("user_id", userId).eq("lesson_id", lessonId);
}

export async function markLessonCompleted(userId: string, lessonId: string) {
  const { error } = await supabase.from("lesson_progress")
    .upsert({ user_id: userId, lesson_id: lessonId, state: "completed" }, { onConflict: "user_id,lesson_id" });
  if (error) throw error;
}
