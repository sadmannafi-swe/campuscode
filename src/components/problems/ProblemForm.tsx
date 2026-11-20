import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/misc";
import type { Difficulty, Problem, TestCase, Topic, Visibility } from "@/types/db";
import type { ProblemDraft, TestDraft } from "@/services/problems";
import { cn, pick } from "@/lib/utils";

export interface ProblemFormValue extends ProblemDraft {
  status?: Problem["status"];
  is_official?: boolean;
  is_featured?: boolean;
}

export function emptyProblem(): ProblemFormValue {
  return {
    title: "", title_bn: "", statement: "", statement_bn: "", input_format: "", output_format: "", constraints: "",
    explanation: "", hints: [], difficulty: "easy", topic_id: null, starter_code_c: "", starter_code_python: "",
    visibility: "private", time_limit_ms: 2000, memory_limit_kb: 131072,
  };
}

export function fromProblem(p: Problem): ProblemFormValue {
  return {
    title: p.title, title_bn: p.title_bn ?? "", statement: p.statement, statement_bn: p.statement_bn ?? "",
    input_format: p.input_format, output_format: p.output_format, constraints: p.constraints, explanation: p.explanation,
    hints: p.hints, difficulty: p.difficulty, topic_id: p.topic_id, starter_code_c: p.starter_code_c ?? "",
    starter_code_python: p.starter_code_python ?? "", visibility: p.visibility, time_limit_ms: p.time_limit_ms,
    memory_limit_kb: p.memory_limit_kb, status: p.status, is_official: p.is_official, is_featured: p.is_featured,
  };
}

export const testsFrom = (tests: TestCase[]): TestDraft[] =>
  tests.map((tc) => ({ id: tc.id, input: tc.input, expected_output: tc.expected_output, is_sample: tc.is_sample }));

export function ProblemForm({ initial, initialTests, topics, onSubmit, saving, admin }: {
  initial: ProblemFormValue; initialTests: TestDraft[]; topics: Topic[];
  onSubmit: (v: ProblemFormValue, tests: TestDraft[]) => void; saving: boolean; admin?: boolean;
}) {
  const { t, lang } = useI18n();
  const [v, setV] = useState<ProblemFormValue>(initial);
  const [tests, setTests] = useState<TestDraft[]>(initialTests.length ? initialTests : [{ input: "", expected_output: "", is_sample: true }]);
  const [hintsText, setHintsText] = useState(initial.hints.join("\n"));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const dark = !admin;
  const tone = dark ? "dark" : "light";
  const set = <K extends keyof ProblemFormValue>(k: K, val: ProblemFormValue[K]) => setV((x) => ({ ...x, [k]: val }));
  const setTest = (i: number, patch: Partial<TestDraft>) => setTests((ts) => ts.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (v.title.trim().length < 3 || v.title.trim().length > 120) errs.title = t("editor.titleRule");
    if (v.statement.trim().length < 10) errs.statement = t("editor.statementRule");
    if (!tests.some((x) => x.is_sample)) errs.tests = t("editor.needSample");
    if (tests.some((x) => !x.expected_output.trim())) errs.tests = t("editor.expectedRule");
    if (tests.length > 30) errs.tests = "≤ 30";
    setErrors(errs);
    if (Object.keys(errs).length) {
      document.getElementById(`pf-${Object.keys(errs)[0]}`)?.focus();
      return;
    }
    onSubmit({
      ...v,
      title: v.title.trim(),
      title_bn: v.title_bn?.trim() || null,
      statement_bn: v.statement_bn?.trim() || null,
      hints: hintsText.split("\n").map((h) => h.trim()).filter(Boolean),
      starter_code_c: v.starter_code_c?.trim() ? v.starter_code_c : null,
      starter_code_python: v.starter_code_python?.trim() ? v.starter_code_python : null,
    }, tests.map((x) => ({ ...x, expected_output: x.expected_output.replace(/\s+$/, "") })));
  };

  const card = dark ? "rounded-md border border-ink-600 bg-ink-800 p-5 text-paper sm:p-10" : "surface p-5 sm:p-8";

  return (
    <form onSubmit={submit} noValidate className={card}>
      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          <Field label={t("editor.title")} htmlFor="pf-title" error={errors.title} dark={dark}>
            <Input id="pf-title" tone={tone} className="font-mono" value={v.title} maxLength={120} onChange={(e) => set("title", e.target.value)} invalid={Boolean(errors.title)} />
          </Field>
          <Field label={t("editor.statement")} htmlFor="pf-statement" error={errors.statement} dark={dark} hint="Markdown">
            <Textarea id="pf-statement" tone={tone} rows={5} value={v.statement} maxLength={10000} onChange={(e) => set("statement", e.target.value)} invalid={Boolean(errors.statement)} />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label={t("editor.difficulty")} htmlFor="pf-difficulty" dark={dark}>
              <NativeSelect id="pf-difficulty" tone={tone} value={v.difficulty} onChange={(e) => set("difficulty", e.target.value as Difficulty)}>
                {(["easy", "medium", "hard"] as const).map((d) => <option key={d} value={d}>{t(`common.${d}`)}</option>)}
              </NativeSelect>
            </Field>
            <Field label={t("editor.topic")} htmlFor="pf-topic" dark={dark}>
              <NativeSelect id="pf-topic" tone={tone} value={v.topic_id ?? ""} onChange={(e) => set("topic_id", e.target.value || null)}>
                <option value="">—</option>
                {topics.map((tp) => <option key={tp.id} value={tp.id}>{pick(tp, "name", lang)}</option>)}
              </NativeSelect>
            </Field>
          </div>
          <Field label={t("editor.inputFormat")} htmlFor="pf-in" dark={dark}>
            <Textarea id="pf-in" tone={tone} rows={2} value={v.input_format} maxLength={3000} onChange={(e) => set("input_format", e.target.value)} />
          </Field>
          <Field label={t("editor.outputFormat")} htmlFor="pf-out" dark={dark}>
            <Textarea id="pf-out" tone={tone} rows={2} value={v.output_format} maxLength={3000} onChange={(e) => set("output_format", e.target.value)} />
          </Field>
          <Field label={t("editor.constraints")} htmlFor="pf-constraints" dark={dark}>
            <Input id="pf-constraints" tone={tone} className="font-mono" value={v.constraints} maxLength={2000} onChange={(e) => set("constraints", e.target.value)} placeholder="1 ≤ N ≤ 10^9" />
          </Field>
          <Field label={t("editor.explanation")} htmlFor="pf-expl" dark={dark}>
            <Textarea id="pf-expl" tone={tone} rows={3} value={v.explanation} maxLength={5000} onChange={(e) => set("explanation", e.target.value)} />
          </Field>
          <Field label={t("editor.hints")} htmlFor="pf-hints" dark={dark}>
            <Textarea id="pf-hints" tone={tone} rows={3} value={hintsText} onChange={(e) => setHintsText(e.target.value)} />
          </Field>
          <details className={cn("rounded border p-4", dark ? "border-ink-600" : "border-line")}>
            <summary className="cursor-pointer text-sm font-semibold">{t("editor.statementBn")} · {t("editor.starterC")} · {t("editor.starterPy")}</summary>
            <div className="mt-4 space-y-5">
              <Field label={`${t("editor.title")} (বাংলা)`} htmlFor="pf-title-bn" dark={dark}>
                <Input id="pf-title-bn" tone={tone} lang="bn" value={v.title_bn ?? ""} maxLength={120} onChange={(e) => set("title_bn", e.target.value)} />
              </Field>
              <Field label={t("editor.statementBn")} htmlFor="pf-statement-bn" dark={dark}>
                <Textarea id="pf-statement-bn" tone={tone} lang="bn" rows={4} value={v.statement_bn ?? ""} maxLength={10000} onChange={(e) => set("statement_bn", e.target.value)} />
              </Field>
              <Field label={t("editor.starterC")} htmlFor="pf-sc" dark={dark}>
                <Textarea id="pf-sc" tone={tone} mono rows={6} value={v.starter_code_c ?? ""} onChange={(e) => set("starter_code_c", e.target.value)} />
              </Field>
              <Field label={t("editor.starterPy")} htmlFor="pf-sp" dark={dark}>
                <Textarea id="pf-sp" tone={tone} mono rows={4} value={v.starter_code_python ?? ""} onChange={(e) => set("starter_code_python", e.target.value)} />
              </Field>
            </div>
          </details>
        </div>

        <div className="space-y-6">
          <div>
            <p className="eyebrow mb-1.5">{t("editor.tests")}</p>
            <p className={cn("mb-3 text-xs", dark ? "text-paper/50" : "text-slate")}>{t("editor.testsHint")}</p>
            {errors.tests && <p id="pf-tests" tabIndex={-1} role="alert" className="mb-2 text-xs font-medium text-error-dark">{errors.tests}</p>}
            <ol className="space-y-3">
              {tests.map((tc, i) => (
                <li key={i} className={cn("rounded border p-4", dark ? "border-ink-600 bg-ink" : "border-line bg-paper/50")}>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-mono text-xs">#{i + 1}</span>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setTest(i, { is_sample: !tc.is_sample })}
                        className={cn("inline-flex h-7 items-center gap-1 rounded px-2 text-xs font-semibold",
                          tc.is_sample ? "bg-lime text-ink" : dark ? "bg-ink-700 text-paper" : "bg-line text-ink")}>
                        {tc.is_sample ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
                        {tc.is_sample ? t("editor.sample") : t("editor.hidden")}
                      </button>
                      {tests.length > 1 && (
                        <Button type="button" variant={dark ? "ghost-dark" : "ghost"} size="icon-sm" aria-label={t("common.delete")}
                          onClick={() => setTests((ts) => ts.filter((_, j) => j !== i))}><Trash2 /></Button>
                      )}
                    </div>
                  </div>
                  <label className="mb-1 block text-xs">{t("editor.input")}</label>
                  <Textarea tone={tone} mono rows={2} value={tc.input} onChange={(e) => setTest(i, { input: e.target.value })} aria-label={`${t("editor.input")} #${i + 1}`} />
                  <label className="mb-1 mt-2 block text-xs">{t("editor.expected")}</label>
                  <Textarea tone={tone} mono rows={2} value={tc.expected_output} onChange={(e) => setTest(i, { expected_output: e.target.value })} aria-label={`${t("editor.expected")} #${i + 1}`} />
                </li>
              ))}
            </ol>
            {tests.length < 30 && (
              <Button type="button" variant={dark ? "outline-dark" : "outline"} size="sm" className="mt-3"
                onClick={() => setTests((ts) => [...ts, { input: "", expected_output: "", is_sample: false }])}><Plus /> {t("editor.addTest")}</Button>
            )}
          </div>

          <Field label={t("editor.visibility")} htmlFor="pf-vis" dark={dark}>
            <NativeSelect id="pf-vis" tone={tone} value={v.visibility} onChange={(e) => set("visibility", e.target.value as Visibility)}>
              <option value="private">{t("editor.private")}</option>
              <option value="public">{t("editor.public")}</option>
            </NativeSelect>
          </Field>

          {admin && (
            <div className="space-y-4 rounded border border-line p-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label={t("editor.timeLimit")} htmlFor="pf-tl">
                  <Input id="pf-tl" type="number" min={500} max={5000} step={100} value={v.time_limit_ms} onChange={(e) => set("time_limit_ms", Number(e.target.value))} />
                </Field>
                <Field label={t("editor.memoryLimit")} htmlFor="pf-ml">
                  <Input id="pf-ml" type="number" min={16} max={256} value={Math.round((v.memory_limit_kb ?? 131072) / 1024)} onChange={(e) => set("memory_limit_kb", Number(e.target.value) * 1024)} />
                </Field>
              </div>
              <Field label="Status" htmlFor="pf-status">
                <NativeSelect id="pf-status" value={v.status ?? "draft"} onChange={(e) => set("status", e.target.value as Problem["status"])}>
                  {(["draft", "pending_review", "published", "rejected", "removed"] as const).map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                </NativeSelect>
              </Field>
              <label className="flex items-center justify-between text-sm font-medium">Official problem <Switch label="Official" checked={Boolean(v.is_official)} onCheckedChange={(c) => set("is_official", c)} /></label>
              <label className="flex items-center justify-between text-sm font-medium">Featured <Switch label="Featured" checked={Boolean(v.is_featured)} onCheckedChange={(c) => set("is_featured", c)} /></label>
            </div>
          )}

          <div className="flex justify-end">
            <Button type="submit" size="lg" variant={dark ? "lime" : "ink"} loading={saving} className="px-8">{t("editor.save")}</Button>
          </div>
        </div>
      </div>
    </form>
  );
}
