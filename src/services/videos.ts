import { supabase } from "@/lib/supabase";
import type { LearningVideo, VideoProgress } from "@/types/db";

/** All published videos of a course (lesson videos + course-level intro), ordered for display. */
export async function listCourseVideos(courseId: string): Promise<LearningVideo[]> {
  const { data, error } = await supabase.from("learning_videos").select("*")
    .eq("course_id", courseId).order("sort_order").order("playlist_position");
  if (error) throw error;
  return data as LearningVideo[];
}

export async function getVideoProgress(userId: string, videoIds: string[]): Promise<VideoProgress[]> {
  if (!videoIds.length) return [];
  const { data, error } = await supabase.from("video_progress").select("*").eq("user_id", userId).in("video_id", videoIds);
  if (error) throw error;
  return data as VideoProgress[];
}

/**
 * Saves resume position and watched time. The database caps watched time to real playback speed
 * and derives completion itself, so this cannot fake completion.
 */
export async function saveVideoProgress(userId: string, videoId: string, positionSeconds: number, watchedSeconds: number) {
  const { error } = await supabase.from("video_progress").upsert(
    { user_id: userId, video_id: videoId, position_seconds: Math.max(0, Math.floor(positionSeconds)), watched_seconds: Math.max(0, Math.floor(watchedSeconds)) },
    { onConflict: "user_id,video_id" },
  );
  if (error) throw error;
}

// ---------- admin ----------
export function parseYouTubeId(input: string): string | null {
  const s = input.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  try {
    const u = new URL(s);
    if (u.hostname === "youtu.be") return u.pathname.slice(1, 12).match(/^[A-Za-z0-9_-]{11}$/)?.[0] ?? null;
    if (/(^|\.)youtube(-nocookie)?\.com$/.test(u.hostname)) {
      const v = u.searchParams.get("v");
      if (v && /^[A-Za-z0-9_-]{11}$/.test(v)) return v;
      const m = u.pathname.match(/\/(?:embed|shorts|live)\/([A-Za-z0-9_-]{11})/);
      if (m) return m[1];
    }
  } catch { /* not a URL */ }
  return null;
}

export async function saveLessonVideo(v: Partial<LearningVideo> & { course_id: string; lesson_id: string; youtube_video_id: string; title: string }) {
  const { id, ...rest } = v;
  const { error } = id
    ? await supabase.from("learning_videos").update(rest).eq("id", id)
    : await supabase.from("learning_videos").insert(rest);
  if (error) throw error;
}

export async function deleteLessonVideo(id: string) {
  const { error } = await supabase.from("learning_videos").delete().eq("id", id);
  if (error) throw error;
}
