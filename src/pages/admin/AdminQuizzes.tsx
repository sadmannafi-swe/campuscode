import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Code2, Eye, Search, XCircle } from "lucide-react";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, NativeSelect } from "@/components/ui/input";
import { Badge, EmptyState, ErrorState, PageLoader } from "@/components/ui/misc";
import { friendlyError } from "@/lib/errors";
import { formatDate } from "@/lib/utils";
import { adminListQuizAttempts, adminQuizStats, getQuizAttempt } from "@/services/quizzes";

const STATUS_TONE = { passed: "success", failed: "error", in_progress: "warning" } as const;

/** Admin → Quizzes: completion statistics, every attempt, and the graded answers (including judge verdicts). */
export default function AdminQuizzes() {
  const { t, lang } = useI18n();
  const stats = useQuery({ queryKey: ["admin", "quiz-stats"], queryFn: adminQuizStats });
  const [draft, setDraft] = useState({ search: "", quizId: "", status: "" });
  const [filters, setFilters] = useState(draft);
  const [page, setPage] = useState(0);
  const [detailId, setDetailId] = useState<string | null>(null);
  const attempts = useQuery({ queryKey: ["admin", "quiz-attempts", filters, page], queryFn: () => adminListQuizAttempts(filters, page) });
  const detail = useQuery({ queryKey: ["quiz-attempt", detailId], enabled: Boolean(detailId), queryFn: () => getQuizAttempt(detailId!) });
  const total = attempts.data?.[0]?.total_count_rows ?? 0;

  return (
    <div className="space-y-6">
      <section className="surface p-5 sm:p-8">
        <h1 className="text-3xl font-extrabold">Module quizzes</h1>
        <p className="mb-6 mt-1 max-w-3xl text-sm text-slate">
          Each module quiz has 6 multiple-choice questions (graded against hidden keys) and 2 programming problems
          (correct only when the judge accepted a submission during the attempt). Pass mark: 6 of 8. Statistics count submitted attempts.
        </p>
        {stats.isLoading ? <PageLoader /> : stats.isError ? <ErrorState message={friendlyError(stats.error, t)} onRetry={() => stats.refetch()} /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-line text-xs uppercase tracking-wide text-slate">
                <tr><th className="py-2 pr-3">Module</th><th className="px-3">Attempts</th><th className="px-3">Students</th><th className="px-3">Passed</th><th className="px-3">Failed attempts</th><th className="px-3">Pass rate</th><th className="pl-3">Avg score</th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {stats.data!.map((s) => (
                  <tr key={s.quiz_id}>
                    <td className="py-2.5 pr-3"><span className="font-semibold">{s.module_number}. {s.chapter_title}</span><span className="block text-xs text-slate">{s.course_title}</span></td>
                    <td className="px-3 font-mono">{s.attempts}</td>
                    <td className="px-3 font-mono">{s.students}</td>
                    <td className="px-3 font-mono text-success">{s.passed_students}</td>
                    <td className="px-3 font-mono text-error">{s.failed_attempts}</td>
                    <td className="px-3 font-mono">{s.students ? `${Math.round((100 * s.passed_students) / s.students)}%` : "—"}</td>
                    <td className="pl-3 font-mono">{s.avg_score != null ? `${s.avg_score}%` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="surface p-5 sm:p-8">
        <h2 className="mb-4 text-xl font-extrabold">Attempts</h2>
        <form className="mb-5 grid gap-3 sm:grid-cols-[2fr_1.5fr_1fr_auto]"
          onSubmit={(e) => { e.preventDefault(); setPage(0); setFilters({ ...draft, search: draft.search.trim() }); }}>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate" />
            <Input className="pl-9" aria-label="Search students" placeholder="Student name or username…" value={draft.search} onChange={(e) => setDraft({ ...draft, search: e.target.value })} />
          </div>
          <NativeSelect aria-label="Quiz" value={draft.quizId} onChange={(e) => setDraft({ ...draft, quizId: e.target.value })}>
            <option value="">All quizzes</option>
            {(stats.data ?? []).map((s) => <option key={s.quiz_id} value={s.quiz_id}>{s.module_number}. {s.chapter_title}</option>)}
          </NativeSelect>
          <NativeSelect aria-label="Result" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>
            <option value="">Any result</option><option value="passed">Passed</option><option value="failed">Failed</option><option value="in_progress">In progress</option>
          </NativeSelect>
          <Button type="submit" variant="ink">Apply</Button>
        </form>
        {attempts.isLoading ? <PageLoader /> : attempts.isError ? <ErrorState message={friendlyError(attempts.error, t)} onRetry={() => attempts.refetch()} />
          : attempts.data!.length === 0 ? <EmptyState title="No attempts yet" body="Attempts appear here as students take module quizzes." /> : (
          <>
            <ul className="divide-y divide-line border-t border-line">
              {attempts.data!.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{a.full_name || "—"} {a.username && <span className="font-normal text-slate">@{a.username}</span>}</p>
                    <p className="truncate text-sm">{a.quiz_title}</p>
                    <p className="font-mono text-xs text-slate">
                      attempt #{a.attempt_number} · started {formatDate(a.started_at, lang)}
                      {a.submitted_at && ` · ${a.correct_count}/${a.total_count} (${Number(a.score)}%) · code ${a.code_correct}/2`}
                    </p>
                  </div>
                  <Badge tone={STATUS_TONE[a.status]}>{a.status.replace("_", " ")}</Badge>
                  <Button size="sm" variant="ghost" onClick={() => setDetailId(a.id)}><Eye /> Review</Button>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center justify-between text-sm text-slate">
              <span>{total} attempt{total === 1 ? "" : "s"}</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                <Button size="sm" variant="outline" disabled={(page + 1) * 25 >= total} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          </>
        )}
      </section>

      <Dialog open={Boolean(detailId)} onOpenChange={(o) => !o && setDetailId(null)} title="Attempt review" size="lg">
        {detail.isLoading ? <PageLoader /> : detail.isError ? <ErrorState message={friendlyError(detail.error, t)} /> : detail.data && (
          <div className="space-y-3">
            <p className="text-sm"><span className="font-semibold">{detail.data.quiz.title_en}</span> · {detail.data.status}
              {detail.data.correct != null && ` · ${detail.data.correct}/${detail.data.total} (${Number(detail.data.score)}%)`}</p>
            <ol className="space-y-2">
              {detail.data.questions.map((q) => (
                <li key={q.id} className="rounded border border-line p-3 text-sm">
                  <div className="flex items-start gap-2">
                    {detail.data!.status === "in_progress" ? <span className="font-mono text-xs text-slate">{q.number}.</span>
                      : q.is_correct ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" /> : <XCircle className="mt-0.5 size-4 shrink-0 text-error" />}
                    <div className="min-w-0">
                      {q.kind === "mcq" ? (
                        <>
                          <p className="font-semibold">{q.prompt}</p>
                          <p className="mt-1 text-xs text-slate">Chosen: <span className="font-mono">{q.options?.find((o) => o.id === q.selected)?.text ?? "—"}</span>
                            {q.correct_option && <> · Key: <span className="font-mono">{q.options?.find((o) => o.id === q.correct_option)?.text}</span></>}</p>
                        </>
                      ) : (
                        <>
                          <p className="flex items-center gap-1.5 font-semibold"><Code2 className="size-4" />{q.problem?.title}</p>
                          <p className="mt-1 text-xs text-slate">
                            Judge: {q.evaluation?.accepted ? "accepted during the attempt" : q.evaluation?.latest
                              ? `${q.evaluation.latest.verdict.replace(/_/g, " ")} (${q.evaluation.latest.passed}/${q.evaluation.latest.total} tests)` : "no submission during the attempt"}
                            {q.evaluation ? ` · ${q.evaluation.attempts} submission(s)` : ""}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}
      </Dialog>
    </div>
  );
}
