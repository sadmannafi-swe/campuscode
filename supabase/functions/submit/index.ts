// POST /functions/v1/submit  { problem_id, language, source_code }
// Judges a solution against ALL test cases, including hidden ones, entirely server-side.
// Hidden inputs/outputs never leave this function. The verdict is stored with the service role;
// database triggers then update stats, streaks, solved counts and achievements.
import { HttpError, requireLanguage, requireString, serve, UUID_RE } from "../_shared/http.ts";
import { clip, executionVerdict, normalise, runBatch, type Verdict } from "../_shared/judge0.ts";
import { admin, asUser, enforceRateLimit, requireActiveUser } from "../_shared/supabase.ts";

const MAX_SOURCE = 64 * 1024;

serve(async (req, body) => {
  const user = await requireActiveUser(req);
  const language = requireLanguage(body);
  const source = requireString(body, "source_code", MAX_SOURCE);
  const problemId = body.problem_id;
  if (typeof problemId !== "string" || !UUID_RE.test(problemId)) {
    throw new HttpError(400, "invalid_input", "A valid problem_id is required.");
  }

  await enforceRateLimit({ userId: user.id, ipHash: "", kinds: ["submit"], perMinute: 6, perDay: 150 });

  // Visibility is checked with the caller's own RLS context.
  const { data: problem } = await asUser(req).from("problems")
    .select("id, status, author_id, time_limit_ms, memory_limit_kb, allowed_languages")
    .eq("id", problemId).maybeSingle();
  if (!problem || problem.status === "removed") {
    throw new HttpError(404, "problem_not_found", "This problem does not exist or is not available.");
  }
  if (!(problem.allowed_languages as string[]).includes(language)) {
    throw new HttpError(400, "unsupported_language", "This problem does not accept that language.");
  }

  // Service role: hidden tests are readable here and nowhere else.
  const { data: tests, error } = await admin.from("test_cases")
    .select("input, expected_output, is_sample, sort_order")
    .eq("problem_id", problemId).order("is_sample", { ascending: false }).order("sort_order");
  if (error) throw error;
  if (!tests?.length) throw new HttpError(409, "no_tests", "This problem has no test cases yet, so it cannot be judged.");

  const cpuSeconds = problem.time_limit_ms / 1000;
  const results = await runBatch(tests.map((t) => ({
    language, source, stdin: t.input, cpuSeconds, memoryKb: problem.memory_limit_kb,
  })), 55_000);

  let verdict = "accepted" as Verdict;
  let failedIndex: number | null = null;
  let passed = 0;
  for (let i = 0; i < results.length; i++) {
    const outcome = executionVerdict(results[i], problem.memory_limit_kb);
    const ok = outcome === "ok" && normalise(results[i].stdout) === normalise(tests[i].expected_output);
    if (ok) passed++;
    else if (failedIndex === null) {
      failedIndex = i;
      verdict = outcome === "ok" ? "wrong_answer" : outcome;
    }
  }

  const times = results.map((r) => r.timeMs ?? 0);
  const mems = results.map((r) => r.memoryKb ?? 0);
  const compileOutput = verdict === "compilation_error" ? clip(results[failedIndex ?? 0].compileOutput, 7_900) : null;

  const { data: saved, error: insErr } = await admin.from("submissions").insert({
    user_id: user.id,
    problem_id: problemId,
    language,
    source_code: source,
    verdict,
    passed_count: passed,
    total_count: tests.length,
    time_ms: Math.max(...times),
    memory_kb: Math.max(...mems),
    compile_output: compileOutput,
    failed_test_index: failedIndex === null ? null : failedIndex + 1,
  }).select("id, created_at").single();
  if (insErr) throw insErr;

  await admin.from("code_execution_logs").insert({
    user_id: user.id, kind: "submit", language, status: verdict,
    time_ms: Math.max(...times), memory_kb: Math.max(...mems),
    source_size: new TextEncoder().encode(source).length, problem_id: problemId,
  });

  // Only sample tests may be shown in detail. Hidden tests reveal nothing but their number.
  let failedTest: Record<string, unknown> | null = null;
  if (failedIndex !== null && verdict !== "compilation_error") {
    const t = tests[failedIndex];
    const r = results[failedIndex];
    failedTest = t.is_sample
      ? { number: failedIndex + 1, hidden: false, input: t.input, expected: t.expected_output,
          actual: clip(r.stdout, 4_000), stderr: clip(r.stderr, 4_000) }
      // No stdout/stderr for hidden tests: a program could echo the hidden input to either stream.
      : { number: failedIndex + 1, hidden: true };
  }

  return {
    submission_id: saved.id,
    created_at: saved.created_at,
    verdict,
    passed,
    total: tests.length,
    time_ms: Math.max(...times),
    memory_kb: Math.max(...mems),
    compile_output: compileOutput,
    failed_test: failedTest,
  };
});
