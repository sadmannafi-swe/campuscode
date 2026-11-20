import { supabase } from "@/lib/supabase";
import { AppError } from "@/lib/errors";
import type { Achievement, Announcement, DailyActivity, Notification, Profile, UserStats } from "@/types/db";

export type ProfilePatch = Partial<Pick<Profile,
  "username" | "full_name" | "avatar_url" | "bio" | "institution" | "preferred_language" |
  "editor_theme" | "editor_font_size" | "auto_save">>;

export async function updateProfile(userId: string, patch: ProfilePatch): Promise<Profile> {
  const { data, error } = await supabase.from("profiles").update(patch).eq("id", userId).select("*").single();
  if (error) throw error;
  return data as Profile;
}

const AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp"];
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  if (!AVATAR_TYPES.includes(file.type)) throw new AppError("invalid_file", "Use a PNG, JPG or WebP image.");
  if (file.size > 2 * 1024 * 1024) throw new AppError("file_too_large", "The image must be 2 MB or smaller.");
  const ext = file.type.split("/")[1].replace("jpeg", "jpg");
  const path = `${userId}/avatar-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  await updateProfile(userId, { avatar_url: data.publicUrl });
  // best-effort cleanup of older avatars
  const { data: files } = await supabase.storage.from("avatars").list(userId);
  const stale = (files ?? []).map((f) => `${userId}/${f.name}`).filter((p) => p !== path);
  if (stale.length) await supabase.storage.from("avatars").remove(stale);
  return data.publicUrl;
}

export async function changePassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

export async function getStats(userId: string): Promise<UserStats | null> {
  const { data, error } = await supabase.from("user_stats").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data as UserStats | null;
}

export async function listAchievements(): Promise<Achievement[]> {
  const { data, error } = await supabase.from("achievements").select("*").order("sort_order");
  if (error) throw error;
  return data as Achievement[];
}

export async function listMyAchievements(userId: string): Promise<{ achievement_id: string; awarded_at: string }[]> {
  const { data, error } = await supabase.from("user_achievements").select("achievement_id, awarded_at").eq("user_id", userId);
  if (error) throw error;
  return data ?? [];
}

export async function getActivity(userId: string, days = 84): Promise<DailyActivity[]> {
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const { data, error } = await supabase.from("daily_activity").select("activity_date, runs, submissions, accepted, lessons_completed")
    .eq("user_id", userId).gte("activity_date", since).order("activity_date");
  if (error) throw error;
  return data as DailyActivity[];
}

export async function listSolved(userId: string): Promise<{ solved_at: string; problems: { slug: string; title: string; difficulty: string } | null }[]> {
  const { data, error } = await supabase.from("user_problem_progress")
    .select("solved_at, problems(slug, title, difficulty)").eq("user_id", userId)
    .not("solved_at", "is", null).order("solved_at", { ascending: false }).limit(50);
  if (error) throw error;
  return data as unknown as { solved_at: string; problems: { slug: string; title: string; difficulty: string } | null }[];
}

export async function listNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase.from("notifications").select("*").eq("user_id", userId)
    .order("created_at", { ascending: false }).limit(30);
  if (error) throw error;
  return data as Notification[];
}

export async function markNotificationsRead(userId: string) {
  const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() })
    .eq("user_id", userId).is("read_at", null);
  if (error) throw error;
}

export async function listActiveAnnouncements(): Promise<Announcement[]> {
  const { data, error } = await supabase.from("announcements").select("*").eq("is_active", true)
    .order("created_at", { ascending: false }).limit(3);
  if (error) throw error;
  return data as Announcement[];
}
