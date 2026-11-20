// Integration test for the Judge0 client against a local fake that speaks the Judge0 batch API
// and really compiles/executes programs with gcc / python3.
// Run: deno test --allow-all supabase/functions/_shared/judge0_test.ts
import { assertEquals, assert } from "jsr:@std/assert@1.0.8";

const PORT = 18_765;
Deno.env.set("JUDGE0_URL", `http://127.0.0.1:${PORT}`);
Deno.env.set("JUDGE0_API_KEY", "test-key");

const store = new Map<string, Record<string, unknown>>();
const enc = (s: string) => btoa(String.fromCharCode(...new TextEncoder().encode(s)));
const dec = (s: string) => new TextDecoder().decode(Uint8Array.from(atob(s), (c) => c.charCodeAt(0)));

async function execute(sub: Record<string, string | number>) {
  const dir = await Deno.makeTempDir();
  const src = dec(String(sub.source_code));
  const stdin = new TextEncoder().encode(dec(String(sub.stdin ?? "")));
  const run = async (cmd: string, args: string[]) => {
    const p = new Deno.Command(cmd, { args, cwd: dir, stdin: "piped", stdout: "piped", stderr: "piped" }).spawn();
    const w = p.stdin.getWriter(); await w.write(stdin); await w.close();
    const timer = setTimeout(() => { try { p.kill("SIGKILL"); } catch { /* exited */ } }, Number(sub.cpu_time_limit) * 1000);
    const o = await p.output(); clearTimeout(timer);
    return { code: o.code, signal: o.signal, out: new TextDecoder().decode(o.stdout), err: new TextDecoder().decode(o.stderr) };
  };
  const t0 = performance.now();
  let res;
  if (sub.language_id === 50) {
    await Deno.writeTextFile(`${dir}/main.c`, src);
    const c = await run("gcc", ["-o", "main", "main.c", "-lm"]);
    if (c.code !== 0) return { status: { id: 6, description: "Compilation Error" }, compile_output: enc(c.err), time: null, memory: null };
    res = await run(`${dir}/main`, []);
  } else {
    await Deno.writeTextFile(`${dir}/main.py`, src);
    res = await run("python3", ["-I", "main.py"]);
  }
  const time = ((performance.now() - t0) / 1000).toFixed(3);
  const status = res.signal === "SIGKILL" ? { id: 5, description: "Time Limit Exceeded" }
    : res.code !== 0 ? { id: 11, description: "Runtime Error (NZEC)" } : { id: 3, description: "Accepted" };
  return { status, stdout: enc(res.out), stderr: enc(res.err), time, memory: 1024 };
}

const server = Deno.serve({ port: PORT, onListen() {} }, async (req) => {
  assertEquals(req.headers.get("X-Auth-Token"), "test-key");
  const url = new URL(req.url);
  if (req.method === "POST" && url.pathname === "/submissions/batch") {
    const { submissions } = await req.json();
    const tokens = submissions.map((s: Record<string, string | number>) => {
      const token = crypto.randomUUID();
      store.set(token, { token, status: { id: 1, description: "In Queue" } });
      execute(s).then((r) => store.set(token, { token, ...r }));
      return { token };
    });
    return Response.json(tokens);
  }
  if (req.method === "GET" && url.pathname === "/submissions/batch") {
    const tokens = (url.searchParams.get("tokens") ?? "").split(",");
    return Response.json({ submissions: tokens.map((t) => store.get(t)) });
  }
  return new Response("not found", { status: 404 });
});

const { runBatch, runOne, executionVerdict, normalise } = await import("./judge0.ts");
const spec = (language: "c" | "python", source: string, stdin = "") =>
  ({ language, source, stdin, cpuSeconds: 2, memoryKb: 131072 });

Deno.test("C program with stdin and UTF-8 output", async () => {
  const r = await runOne(spec("c", '#include <stdio.h>\nint main(){int a,b;scanf("%d %d",&a,&b);printf("%d সম্পন্ন\\n",a+b);}', "12 30"));
  assertEquals(executionVerdict(r, 131072), "ok");
  assertEquals(normalise(r.stdout), "42 সম্পন্ন");
});

Deno.test("compile error is reported with compiler output", async () => {
  const r = await runOne(spec("c", "int main(){ return 0 }"));
  assertEquals(executionVerdict(r, 131072), "compilation_error");
  assert(r.compileOutput.includes("expected"));
});

Deno.test("python runtime error and time limit", async () => {
  const [rt, tle] = await runBatch([spec("python", "print(1/0)"), spec("python", "while True: pass")]);
  assertEquals(executionVerdict(rt, 131072), "runtime_error");
  assert(rt.stderr.includes("ZeroDivisionError"));
  assertEquals(executionVerdict(tle, 131072), "time_limit_exceeded");
});

Deno.test("batch of 25 is chunked and returned in order", async () => {
  const specs = Array.from({ length: 25 }, (_, i) => spec("python", `print(${i} * 2)`));
  const results = await runBatch(specs);
  assertEquals(results.map((r) => r.stdout.trim()), specs.map((_, i) => String(i * 2)));
});

Deno.test("judge-style output normalisation", () => {
  assertEquals(normalise("1 2 3  \r\n4\n\n\n"), "1 2 3\n4");
  assert(normalise("1 2") !== normalise("12"));
});

Deno.test({ name: "shutdown", fn: async () => { await server.shutdown(); }, sanitizeOps: false, sanitizeResources: false });
