// POST /functions/v1/execute
// Runs C or Python code in the Judge0 sandbox.
//   { language, source_code, stdin? }                      → custom run
//   { language, source_code, problem_id, mode: "samples" } → run the problem's PUBLIC sample tests
// Guests may run code (lower limits); signed-in runs are logged and count towards stats.
import { clientIp, HttpError, requireLanguage, requireString, serve, sha256, UUID_RE } from "../_shared/http.ts";
import { clip, executionVerdict, normalise, runBatch, runOne } from "../_shared/judge0.ts";
import { admin, asUser, enforceRateLimit, getUser } from "../_shared/supabase.ts";

const MAX_SOURCE = 64 * 1024;
const MAX_STDIN = 64 * 1024;
const MAX_OUTPUT = 64 * 1024;
const RUN_CPU_SECONDS = 3;
const RUN_MEMORY_KB = 131072;

serve(async (req, body) => {
  const language = requireLanguage(body);
  const source = requireString(body, "source_code", MAX_SOURCE);
  const mode = body.mode === "samples" ? "samples" : "custom";

  const { data: setting } = await admin.from("platform_settings").select("value").eq("key", "execution.enabled").maybeSingle();
  if (setting && setting.value === false) {
    throw new HttpError(503, "execution_disabled", "Code execution is temporarily paused by the administrators.");
  }

  const user = await getUser(req);
  if (user) {
    const { data: profile } = await admin.from("profiles").select("status").eq("id", user.id).maybeSingle();
    if (profile?.status !== "active") throw new HttpError(403, "account_suspended", "Your account is suspended.");
  }
  const ipHash = await sha256(`${Deno.env.get("IP_HASH_SALT") ?? "campuscode"}:${clientIp(req)}`);
  await enforceRateLimit({
    userId: user?.id ?? null,
    ipHash,
    kinds: ["run", "samples"],
    perMinute: user ? 15 : 5,
    perDay: user ? 400 : 40,
  });

  const log = async (status: string, timeMs: number | null, memoryKb: number | null, problemId: string | null) => {
    const { error } = await admin.from("code_execution_logs").insert({
      user_id: user?.id ?? null,
      ip_hash: user ? null : ipHash,
      kind: mode === "samples" ? "samples" : "run",
      language, status, time_ms: timeMs, memory_kb: memoryKb,
      source_size: new TextEncoder().encode(source).length,
      problem_id: problemId,
    });
    if (error) console.error("log insert failed", error);
  };

  // ------------------------------------------------------ custom stdin run
  if (mode === "custom") {
    const stdin = typeof body.stdin === "string" ? requireString(body, "stdin", MAX_STDIN, true) : "";
    const r = await runOne({ language, source, stdin, cpuSeconds: RUN_CPU_SECONDS, memoryKb: RUN_MEMORY_KB });
    const outcome = executionVerdict(r, RUN_MEMORY_KB);
    await log(r.status, r.timeMs, r.memoryKb, null);
    return {
      mode,
      outcome: outcome === "ok" ? "success" : outcome,
      status: r.status,
      stdout: clip(r.stdout, MAX_OUTPUT),
      stderr: clip(r.stderr, 16_000),
      compile_output: clip(r.compileOutput, 16_000),
      message: r.message,
      time_ms: r.timeMs,
      memory_kb: r.memoryKb,
    };
  }

  // ------------------------------------------------------ public samples
  const problemId = body.problem_id;
  if (typeof problemId !== "string" || !UUID_RE.test(problemId)) {
    throw new HttpError(400, "invalid_input", "A valid problem_id is required for sample runs.");
  }
  // Read through the caller's RLS context so only visible problems and *sample* tests are reachable.
  const db = user ? asUser(req) : admin;
  const { data: problem } = await db.from("problems")
    .select("id, status, time_limit_ms, memory_limit_kb, allowed_languages, author_id")
    .eq("id", problemId).maybeSingle();
  if (!problem || (!user && problem.status !== "published")) {
    throw new HttpError(404, "problem_not_found", "This problem does not exist or is not available.");
  }
  if (!(problem.allowed_languages as string[]).includes(language)) {
    throw new HttpError(400, "unsupported_language", "This problem does not accept that language.");
  }
  const { data: samples } = await admin.from("test_cases")
    .select("input, expected_output, sort_order").eq("problem_id", problemId).eq("is_sample", true)
    .order("sort_order").limit(10);
  if (!samples?.length) throw new HttpError(404, "no_samples", "This problem has no sample tests.");

  const cpuSeconds = problem.time_limit_ms / 1000;
  const results = await runBatch(samples.map((s) => ({
    language, source, stdin: s.input, cpuSeconds, memoryKb: problem.memory_limit_kb,
  })));
  const items = results.map((r, i) => {
    const outcome = executionVerdict(r, problem.memory_limit_kb);
    const passed = outcome === "ok" && normalise(r.stdout) === normalise(samples[i].expected_output);
    return {
      index: i + 1,
      input: samples[i].input,
      expected: samples[i].expected_output,
      actual: clip(r.stdout, 16_000),
      stderr: clip(r.stderr, 8_000),
      outcome: outcome === "ok" ? (passed ? "passed" : "wrong_answer") : outcome,
      passed,
      time_ms: r.timeMs,
      memory_kb: r.memoryKb,
    };
  });
  const compileError = results.find((r) => r.statusId === 6);
  const maxTime = Math.max(0, ...results.map((r) => r.timeMs ?? 0));
  await log(items.every((x) => x.passed) ? "Samples passed" : "Samples failed", maxTime, null, problemId);
  return {
    mode,
    compile_output: compileError ? clip(compileError.compileOutput, 16_000) : "",
    passed: items.filter((x) => x.passed).length,
    total: items.length,
    results: items,
  };
});
