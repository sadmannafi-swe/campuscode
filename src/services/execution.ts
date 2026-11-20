import { FUNCTIONS_URL, isSupabaseConfigured, supabase } from "@/lib/supabase";
import { AppError } from "@/lib/errors";
import type { Lang, RunResult, SamplesResult, SubmitResult } from "@/types/db";

const MAX_SOURCE_BYTES = 64 * 1024;

async function callFunction<T>(name: string, payload: Record<string, unknown>): Promise<T> {
  if (!isSupabaseConfigured) throw new AppError("not_configured", "This deployment isn't connected to its backend yet.");
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY;
  let res: Response;
  try {
    res = await fetch(`${FUNCTIONS_URL}/${name}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new AppError("network", "Can't reach the code runner. Check your connection and try again.");
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new AppError(body.error ?? "execution_error", body.message ?? "The code runner returned an error.", res.status);
  }
  return body as T;
}

function checkSize(source: string) {
  if (new TextEncoder().encode(source).length > MAX_SOURCE_BYTES) {
    throw new AppError("payload_too_large", "Your code is larger than the 64 KB limit.");
  }
}

export function runCode(language: Lang, source: string, stdin: string) {
  checkSize(source);
  return callFunction<RunResult>("execute", { language, source_code: source, stdin });
}

export function runSamples(language: Lang, source: string, problemId: string) {
  checkSize(source);
  return callFunction<SamplesResult>("execute", { language, source_code: source, problem_id: problemId, mode: "samples" });
}

export function submitSolution(language: Lang, source: string, problemId: string) {
  checkSize(source);
  return callFunction<SubmitResult>("submit", { language, source_code: source, problem_id: problemId });
}
