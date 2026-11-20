import { supabase } from "@/lib/supabase";
import type { ExecutionLog, Lang, SavedCode } from "@/types/db";

export async function listSnippets(userId: string, limit = 200): Promise<SavedCode[]> {
  const { data, error } = await supabase.from("saved_codes").select("*")
    .eq("user_id", userId).order("updated_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return data as SavedCode[];
}

export async function getSnippet(id: string): Promise<SavedCode | null> {
  const { data, error } = await supabase.from("saved_codes").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as SavedCode | null;
}

export interface SnippetInput {
  title: string;
  language: Lang;
  source_code: string;
  stdin?: string;
  description?: string | null;
  problem_id?: string | null;
  topic_id?: string | null;
}

export async function createSnippet(userId: string, input: SnippetInput): Promise<SavedCode> {
  const { data, error } = await supabase.from("saved_codes")
    .insert({ ...input, user_id: userId }).select("*").single();
  if (error) throw error;
  return data as SavedCode;
}

export async function updateSnippet(id: string, patch: Partial<SnippetInput>): Promise<SavedCode> {
  const { data, error } = await supabase.from("saved_codes").update(patch).eq("id", id).select("*").single();
  if (error) throw error;
  return data as SavedCode;
}

export async function deleteSnippet(id: string): Promise<void> {
  const { error } = await supabase.from("saved_codes").delete().eq("id", id);
  if (error) throw error;
}

export async function listExecutionHistory(userId: string, limit = 50): Promise<(ExecutionLog & { problems: { slug: string; title: string } | null })[]> {
  const { data, error } = await supabase.from("code_execution_logs")
    .select("id, kind, language, status, time_ms, memory_kb, problem_id, created_at, problems(slug, title)")
    .eq("user_id", userId).order("created_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return data as unknown as (ExecutionLog & { problems: { slug: string; title: string } | null })[];
}
