// Judge0 client. Works with a self-hosted Judge0 (X-Auth-Token) or Judge0 CE on RapidAPI.
// All configuration comes from Edge Function secrets — never from the browser.
// With no JUDGE0_URL secret, it falls back to Judge0's free public instance (ce.judge0.com),
// which needs no key but is shared and rate-limited. Set JUDGE0_URL (+ key) for real scale.
// Set JUDGE0_URL to "off" to disable execution entirely.
import { HttpError, type Lang } from "./http.ts";

export const PUBLIC_JUDGE0_URL = "https://ce.judge0.com";
const RAW_URL = (Deno.env.get("JUDGE0_URL") ?? "").trim();
const URL_ = (RAW_URL === "" ? PUBLIC_JUDGE0_URL : RAW_URL.toLowerCase() === "off" ? "" : RAW_URL).replace(/\/+$/, "");
const KEY = Deno.env.get("JUDGE0_API_KEY") ?? "";
const RAPID_HOST = Deno.env.get("JUDGE0_RAPIDAPI_HOST") ?? (URL_.includes("rapidapi.com") ? new URL(URL_).host : "");
const AUTH_HEADER = Deno.env.get("JUDGE0_AUTH_HEADER") ?? (RAPID_HOST ? "X-RapidAPI-Key" : "X-Auth-Token");

const LANGUAGE_IDS: Record<Lang, number> = {
  c: Number(Deno.env.get("JUDGE0_LANGUAGE_ID_C") ?? 50),           // C (GCC 9.2.0)
  python: Number(Deno.env.get("JUDGE0_LANGUAGE_ID_PYTHON") ?? 71), // Python (3.8.1)
};

export const judge0Configured = () => URL_ !== "";

export interface Judge0Result {
  token: string;
  statusId: number;
  status: string;
  stdout: string;
  stderr: string;
  compileOutput: string;
  message: string;
  timeMs: number | null;
  memoryKb: number | null;
}

export interface RunSpec {
  language: Lang;
  source: string;
  stdin: string;
  cpuSeconds: number;
  memoryKb: number;
}

const b64 = (s: string) => {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
};
const unb64 = (s: string | null | undefined) => {
  if (!s) return "";
  const bin = atob(s);
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
};

function headers(): HeadersInit {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (KEY) h[AUTH_HEADER] = KEY;
  if (RAPID_HOST) h["X-RapidAPI-Host"] = RAPID_HOST;
  return h;
}

async function call(path: string, init?: RequestInit): Promise<unknown> {
  if (!judge0Configured()) {
    throw new HttpError(503, "execution_not_configured",
      "Code execution is not configured on this server yet. An administrator must set the Judge0 secrets.");
  }
  let res: Response;
  try {
    res = await fetch(`${URL_}${path}`, { ...init, headers: headers(), signal: AbortSignal.timeout(15_000) });
  } catch (e) {
    console.error("Judge0 unreachable:", e);
    throw new HttpError(502, "execution_unavailable", "The code execution service is unreachable. Please try again shortly.");
  }
  if (res.status === 429) throw new HttpError(429, "execution_quota", "The execution service is busy (quota reached). Please try again later.");
  if (res.status === 401 || res.status === 403) {
    console.error("Judge0 auth failed", res.status, await res.text());
    throw new HttpError(502, "execution_auth", "The execution service rejected our credentials. An administrator must check the Judge0 key.");
  }
  if (!res.ok) {
    console.error("Judge0 error", res.status, await res.text());
    throw new HttpError(502, "execution_failed", "The execution service returned an error. Please try again.");
  }
  return res.json();
}

function payload(spec: RunSpec) {
  return {
    language_id: LANGUAGE_IDS[spec.language],
    source_code: b64(spec.source),
    stdin: b64(spec.stdin),
    cpu_time_limit: spec.cpuSeconds,
    cpu_extra_time: 0.5,
    wall_time_limit: Math.min(spec.cpuSeconds * 3, 15),
    memory_limit: spec.memoryKb,
    max_file_size: 1024,           // KB a program may write to disk
    enable_network: false,
  };
}

const FIELDS = "token,status,stdout,stderr,compile_output,message,time,memory";

function parse(r: Record<string, unknown>): Judge0Result {
  const status = (r.status ?? {}) as { id?: number; description?: string };
  return {
    token: String(r.token ?? ""),
    statusId: status.id ?? 0,
    status: status.description ?? "Unknown",
    stdout: unb64(r.stdout as string),
    stderr: unb64(r.stderr as string),
    compileOutput: unb64(r.compile_output as string),
    message: unb64(r.message as string),
    timeMs: r.time != null ? Math.round(Number(r.time) * 1000) : null,
    memoryKb: r.memory != null ? Number(r.memory) : null,
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Submits up to N programs (chunked by 20, Judge0's batch limit) and polls until all finish. */
export async function runBatch(specs: RunSpec[], deadlineMs = 45_000): Promise<Judge0Result[]> {
  const tokens: string[] = [];
  for (let i = 0; i < specs.length; i += 20) {
    const chunk = specs.slice(i, i + 20).map(payload);
    const created = (await call("/submissions/batch?base64_encoded=true", {
      method: "POST",
      body: JSON.stringify({ submissions: chunk }),
    })) as Array<{ token?: string; error?: unknown }>;
    for (const c of created) {
      if (!c.token) {
        console.error("Judge0 batch item rejected:", c);
        throw new HttpError(502, "execution_failed", "The execution service rejected the submission.");
      }
      tokens.push(c.token);
    }
  }

  const results = new Map<string, Judge0Result>();
  const started = Date.now();
  let delay = 400;
  while (results.size < tokens.length) {
    if (Date.now() - started > deadlineMs) {
      throw new HttpError(504, "execution_timeout", "The execution service took too long to respond. Please try again.");
    }
    await sleep(delay);
    delay = Math.min(delay * 1.5, 2000);
    const pending = tokens.filter((t) => !results.has(t));
    for (let i = 0; i < pending.length; i += 20) {
      const part = pending.slice(i, i + 20).join(",");
      const data = (await call(`/submissions/batch?tokens=${part}&base64_encoded=true&fields=${FIELDS}`)) as {
        submissions: Record<string, unknown>[];
      };
      for (const s of data.submissions ?? []) {
        const r = parse(s);
        if (r.statusId > 2) results.set(r.token, r);   // 1 = queued, 2 = processing
      }
    }
  }
  return tokens.map((t) => results.get(t)!);
}

export async function runOne(spec: RunSpec): Promise<Judge0Result> {
  return (await runBatch([spec]))[0];
}

// ---------- Verdict mapping --------------------------------------------
export type Verdict =
  | "accepted" | "wrong_answer" | "compilation_error" | "runtime_error"
  | "time_limit_exceeded" | "memory_limit_exceeded" | "internal_error";

/** Judge0 status → verdict, ignoring Judge0's own output comparison (we compare ourselves). */
export function executionVerdict(r: Judge0Result, memoryLimitKb: number): Verdict | "ok" {
  switch (r.statusId) {
    case 3: case 4: return "ok";
    case 5: return "time_limit_exceeded";
    case 6: return "compilation_error";
    case 13: case 14: return "internal_error";
    default:
      if (r.statusId >= 7 && r.statusId <= 12) {
        if (r.memoryKb != null && r.memoryKb >= memoryLimitKb * 0.95) return "memory_limit_exceeded";
        if (/memory|MemoryError|bad_alloc/i.test(r.stderr + r.message)) return "memory_limit_exceeded";
        return "runtime_error";
      }
      return "internal_error";
  }
}

/** Online-judge style comparison: ignore trailing spaces per line and trailing blank lines. */
export function normalise(s: string): string {
  return s.replace(/\r\n?/g, "\n").split("\n").map((l) => l.replace(/[ \t]+$/, "")).join("\n").replace(/\n+$/, "");
}

export const clip = (s: string, max: number) => (s.length > max ? s.slice(0, max) + "\n… (output truncated)" : s);
