import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Bookmark, BookmarkCheck, ClipboardCheck, Flag, Lightbulb, Pencil, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Dialog, ConfirmDialog } from "@/components/ui/dialog";
import { Field, NativeSelect, Textarea } from "@/components/ui/input";
import { Badge, ErrorState, PageLoader } from "@/components/ui/misc";
import { Markdown } from "@/components/common/Markdown";
import { SubmissionList } from "./SubmissionList";
import {
  deleteProblem, getAuthorName, getProblemBySlug, getSampleTests, isBookmarked, listMySubmissions, listTopics,
  reportProblem, setBookmark,
} from "@/services/problems";
import { friendlyError } from "@/lib/errors";
import { cn, formatMemory, langLabel, pick } from "@/lib/utils";
import type { Lang, ProblemReport } from "@/types/db";
import NotFoundPage from "../NotFoundPage";
import { getQuizAttempt } from "@/services/quizzes";

export default function ProblemDetailPage() {
  const { slug } = useParams();
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [language, setLanguage] = useState<Lang>("c");
  const [hintsShown, setHintsShown] = useState(0);
  // Opened from a module quiz ("Solve in IDE"): show the way back. Grading happens on the server.
  const quizAttemptId = useSearchParams()[0].get("quiz");
  const quizAttempt = useQuery({ queryKey: ["quiz-attempt", quizAttemptId], enabled: Boolean(quizAttemptId && user), queryFn: () => getQuizAttempt(quizAttemptId!) });
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState<ProblemReport["reason"]>("incorrect");
  const [details, setDetails] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const q = useQuery({
    queryKey: ["problem", slug],
    queryFn: async () => {
      const p = await getProblemBySlug(slug!);
      if (!p) return null;
      return { problem: p, samples: await getSampleTests(p.id) };
    },
  });
  const topics = useQuery({ queryKey: ["topics"], queryFn: listTopics, staleTime: 600_000 });
  const problem = q.data?.problem;
  const author = useQuery({
    queryKey: ["author", problem?.author_id],
    enabled: Boolean(problem?.author_id && !problem.is_official),
    queryFn: () => getAuthorName(problem!.author_id!),
  });
  const bookmark = useQuery({
    queryKey: ["bookmark", user?.id, problem?.id],
    enabled: Boolean(user && problem),
    queryFn: () => isBookmarked(user!.id, problem!.id),
  });
  const subs = useQuery({
    queryKey: ["submissions", user?.id, problem?.id],
    enabled: Boolean(user && problem),
    queryFn: () => listMySubmissions(user!.id, problem!.id, 10),
  });

  const toggleBookmark = useMutation({
    mutationFn: () => setBookmark(user!.id, problem!.id, !bookmark.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookmark", user?.id, problem?.id] }),
    onError: (e) => toast.error(friendlyError(e, t)),
  });
  const report = useMutation({
    mutationFn: () => reportProblem(user!.id, problem!.id, reason, details.trim()),
    onSuccess: () => { setReportOpen(false); setDetails(""); toast.success(t("problems.reportSent")); },
    onError: (e) => toast.error(friendlyError(e, t)),
  });
  const remove = useMutation({
    mutationFn: () => deleteProblem(problem!.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["problems"] }); nav("/problems/mine"); },
    onError: (e) => toast.error(friendlyError(e, t)),
  });

  if (q.isLoading) return <PageLoader />;
  if (q.isError) return <div className="page"><ErrorState message={friendlyError(q.error, t)} onRetry={() => q.refetch()} /></div>;
  if (!problem) return <NotFoundPage />;

  const samples = q.data!.samples;
  const topic = topics.data?.find((tp) => tp.id === problem.topic_id);
  const title = lang === "bn" && problem.title_bn ? problem.title_bn : problem.title;
  const statement = lang === "bn" && problem.statement_bn ? problem.statement_bn : problem.statement;
  const isAuthor = user && problem.author_id === user.id;
  const acc = problem.submission_count ? Math.round((problem.accepted_count / problem.submission_count) * 100) : null;
  const allowed = problem.allowed_languages;
  const chosen = allowed.includes(language) ? language : allowed[0];
  const statusNote = problem.status === "pending_review" ? t("problems.pendingReview") : problem.status === "draft" ? t("problems.draftPrivate")
    : problem.status === "rejected" ? t("problems.rejected") : problem.status === "removed" ? t("problems.removed") : null;

  return (
    <div className="page">
      {quizAttempt.data ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-lime/60 bg-lime/10 px-4 py-3 text-sm" data-testid="quiz-banner">
          <p className="flex items-start gap-2"><ClipboardCheck className="mt-0.5 size-4 shrink-0" aria-hidden />{t("quiz.partOfQuiz")}</p>
          <Button asChild size="sm" variant="ink"><Link to={`/learn/${quizAttempt.data.quiz.course_slug}/chapter/${quizAttempt.data.quiz.chapter_slug}/quiz?attempt=${quizAttempt.data.id}`}><ArrowLeft /> {t("quiz.backToQuiz")}</Link></Button>
        </div>
      ) : (
        <Link to="/problems" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate hover:text-ink"><ArrowLeft className="size-4" />{t("nav.problems")}</Link>
      )}

      {statusNote && (
        <div className={cn("mb-4 rounded-md border px-4 py-3 text-sm", problem.status === "rejected" || problem.status === "removed" ? "border-error/30 bg-error/5" : "border-warning/30 bg-warning/5")}>
          <p className="font-semibold">{statusNote}</p>
          {problem.moderation_note && <p className="mt-1 text-slate">{problem.moderation_note}</p>}
        </div>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[1fr_360px]">
        {/* Statement (slide 5 left card) */}
        <article className="surface p-6 sm:p-10">
          <h1 className="text-2xl font-extrabold leading-tight sm:text-[32px]">{title}</h1>
          {!problem.is_official && author.data && <p className="mt-1 text-sm text-slate">{t("problems.by", { name: author.data })}</p>}
          <div className="mt-5 text-slate"><Markdown className="text-slate">{statement}</Markdown></div>

          {problem.input_format && (<section className="mt-8"><h2 className="font-mono text-sm font-medium uppercase tracking-wide">{t("problems.inputFormat")}</h2><Markdown className="mt-1">{problem.input_format}</Markdown></section>)}
          {problem.output_format && (<section className="mt-6"><h2 className="font-mono text-sm font-medium uppercase tracking-wide">{t("problems.outputFormat")}</h2><Markdown className="mt-1">{problem.output_format}</Markdown></section>)}
          {problem.constraints && (<section className="mt-6"><h2 className="font-mono text-sm font-medium uppercase tracking-wide">{t("problems.constraints")}</h2><p className="mt-1 font-mono text-[15px]">{problem.constraints}</p></section>)}

          {samples.map((s, i) => (
            <section key={s.id} className="mt-8">
              <h2 className="font-mono text-sm font-medium uppercase tracking-wide">{t("problems.example")}{samples.length > 1 ? ` ${i + 1}` : ""}</h2>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="eyebrow mb-1">{t("problems.sampleInput")}</p>
                  <pre className="overflow-x-auto rounded bg-paper p-3 font-mono text-sm">{s.input || " "}</pre>
                </div>
                <div>
                  <p className="eyebrow mb-1">{t("problems.sampleOutput")}</p>
                  <pre className="overflow-x-auto rounded bg-paper p-3 font-mono text-sm">{s.expected_output}</pre>
                </div>
              </div>
            </section>
          ))}

          {problem.explanation && (<section className="mt-8"><h2 className="font-mono text-sm font-medium uppercase tracking-wide">{t("problems.explanation")}</h2><Markdown className="mt-1">{problem.explanation}</Markdown></section>)}

          {problem.hints.length > 0 && (
            <section className="mt-8">
              <h2 className="font-mono text-sm font-medium uppercase tracking-wide">{t("problems.hints")}</h2>
              <ol className="mt-2 space-y-2">
                {problem.hints.slice(0, hintsShown).map((h, i) => (
                  <li key={i} className="flex gap-2 rounded bg-lime/25 px-3 py-2 text-sm"><Lightbulb className="mt-0.5 size-4 shrink-0" />{h}</li>
                ))}
              </ol>
              {hintsShown < problem.hints.length && (
                <Button variant="outline" size="sm" className="mt-2" onClick={() => setHintsShown((n) => n + 1)}>
                  <Lightbulb /> {t("problems.showHint", { n: hintsShown + 1 })}
                </Button>
              )}
            </section>
          )}
        </article>

        {/* Solve card (slide 5 right) */}
        <aside className="space-y-4 lg:sticky lg:top-20">
          <div className="rounded-md bg-ink p-6 text-paper sm:p-8">
            <p className="font-sans text-sm font-bold uppercase tracking-wide text-lime">
              {topic ? pick(topic, "name", lang) : "—"} <span aria-hidden>•</span> {t(`common.${problem.difficulty}`)}
            </p>
            <p className="mt-6 font-heading text-[26px] font-bold leading-tight">{t("problems.readyTitle")}</p>
            <div className="mt-6 flex gap-1.5" role="radiogroup" aria-label={t("common.language")}>
              {(["c", "python"] as const).filter((l) => allowed.includes(l)).map((l) => (
                <button key={l} role="radio" aria-checked={chosen === l} onClick={() => setLanguage(l)}
                  className={cn("h-8 rounded px-4 text-sm font-bold", chosen === l ? "bg-lime text-ink" : "bg-ink-700 text-paper")}>{langLabel(l)}</button>
              ))}
            </div>
            <Button asChild size="lg" className="mt-6 w-full">
              <Link to={`/ide?problem=${problem.slug}&lang=${chosen}`}>{t("problems.solveInIde")} <ArrowRight /></Link>
            </Button>
            <p className="mt-4 font-mono text-xs text-paper/50">
              {t("problems.limits", { time: `${problem.time_limit_ms / 1000}s`, mem: formatMemory(problem.memory_limit_kb) })}
            </p>
            <p className="mt-1 font-mono text-xs text-paper/50">
              {acc !== null ? `${t("problems.acceptance")} ${acc}% · ` : ""}{t("problems.solvers", { n: problem.solver_count })}
            </p>
          </div>

          {user && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => toggleBookmark.mutate()} loading={toggleBookmark.isPending}>
                {bookmark.data ? <BookmarkCheck /> : <Bookmark />} {bookmark.data ? t("problems.bookmarked") : t("problems.bookmark")}
              </Button>
              {!isAuthor && <Button variant="outline" size="sm" onClick={() => setReportOpen(true)}><Flag /> {t("problems.report")}</Button>}
              {isAuthor && problem.status !== "removed" && (
                <>
                  <Button asChild variant="outline" size="sm"><Link to={`/problems/${problem.slug}/edit`}><Pencil /> {t("common.edit")}</Link></Button>
                  <Button variant="outline" size="sm" className="text-error" onClick={() => setConfirmDelete(true)}><Trash2 /> {t("common.delete")}</Button>
                </>
              )}
            </div>
          )}

          {user && (
            <div className="surface p-5">
              <h2 className="mb-3 font-heading text-base font-bold">{t("problems.yourSubmissions")}</h2>
              <SubmissionList query={subs} compact />
            </div>
          )}
          {!problem.is_official && <Badge tone="outline">{t("problems.community")}</Badge>}
        </aside>
      </div>

      <Dialog open={reportOpen} onOpenChange={setReportOpen} title={t("problems.report")}
        footer={<>
          <Button variant="outline" onClick={() => setReportOpen(false)}>{t("common.cancel")}</Button>
          <Button variant="ink" onClick={() => report.mutate()} loading={report.isPending}>{t("common.confirm")}</Button>
        </>}>
        <div className="space-y-4">
          <Field label={t("problems.reportReason")} htmlFor="reason">
            <NativeSelect id="reason" value={reason} onChange={(e) => setReason(e.target.value as ProblemReport["reason"])}>
              {(["incorrect", "inappropriate", "duplicate", "spam", "other"] as const).map((r) => <option key={r} value={r}>{t(`problems.reason.${r}`)}</option>)}
            </NativeSelect>
          </Field>
          <Field label={<>{t("problems.reportDetails")} <span className="normal-case tracking-normal">({t("common.optional")})</span></>} htmlFor="details">
            <Textarea id="details" value={details} maxLength={1000} onChange={(e) => setDetails(e.target.value)} />
          </Field>
        </div>
      </Dialog>
      <ConfirmDialog open={confirmDelete} onOpenChange={setConfirmDelete} danger title={t("common.delete")} body={t("problems.deleteConfirm")}
        confirmLabel={t("common.delete")} loading={remove.isPending} onConfirm={() => remove.mutate()} />
    </div>
  );
}
