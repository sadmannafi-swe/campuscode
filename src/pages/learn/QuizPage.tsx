import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Award, CheckCircle2, Circle, Code2, Lock, PlayCircle, RefreshCw, RotateCcw, XCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Badge, ErrorState, PageLoader, ProgressBar } from "@/components/ui/misc";
import { CodeBlock } from "@/components/common/CodeBlock";
import { SignInPrompt } from "@/components/layout/Guards";
import { getCourseOutline, getCourseProgress } from "@/services/courses";
import { getCourseQuizOverview, getQuizAttempt, saveQuizAnswer, startQuizAttempt, submitQuizAttempt } from "@/services/quizzes";
import { friendlyError } from "@/lib/errors";
import { cn, pick } from "@/lib/utils";
import type { MessageKey } from "@/i18n/en";
import type { ModuleQuizStatus, QuizAttempt, QuizAttemptQuestion, QuizStatus } from "@/types/db";
import NotFoundPage from "../NotFoundPage";

export const QUIZ_TONE: Record<QuizStatus, "neutral" | "lime" | "ink" | "success" | "warning" | "error" | "outline"> = {
  locked: "outline", available: "lime", in_progress: "warning", passed: "success", failed: "error",
};

export function QuizStatusBadge({ status, className }: { status: QuizStatus; className?: string }) {
  const { t } = useI18n();
  return (
    <Badge tone={QUIZ_TONE[status]} className={cn("gap-1", className)}>
      {status === "locked" && <Lock className="size-3" aria-hidden />}
      {status === "passed" && <CheckCircle2 className="size-3" aria-hidden />}
      {t(`quiz.status.${status}` as MessageKey)}
    </Badge>
  );
}

/** /learn/:courseSlug/chapter/:chapterSlug/quiz  (?attempt=<id> to resume or review a specific attempt) */
export default function QuizPage() {
  const { courseSlug, chapterSlug } = useParams();
  const [params, setParams] = useSearchParams();
  const { t, lang } = useI18n();
  const { user, loading } = useAuth();
  const outline = useQuery({ queryKey: ["course", courseSlug], queryFn: () => getCourseOutline(courseSlug!) });
  const courseId = outline.data?.course.id;
  const overview = useQuery({
    queryKey: ["quiz-overview", courseId, user?.id], enabled: Boolean(courseId && user),
    queryFn: () => getCourseQuizOverview(courseId!),
  });
  const chapterIndex = outline.data?.chapters.findIndex((c) => c.slug === chapterSlug) ?? -1;
  const chapter = chapterIndex >= 0 ? outline.data!.chapters[chapterIndex] : undefined;
  const entry = overview.data?.find((m) => m.chapter_id === chapter?.id);
  const quiz = entry?.quiz ?? null;
  const attemptId = params.get("attempt") ?? (quiz?.status === "in_progress" ? quiz.open_attempt_id : null);
  const attempt = useQuery({
    queryKey: ["quiz-attempt", attemptId], enabled: Boolean(attemptId && user),
    queryFn: () => getQuizAttempt(attemptId!), refetchOnWindowFocus: true, staleTime: 0,
  });

  if (loading || outline.isLoading) return <PageLoader />;
  if (outline.isError) return <div className="page"><ErrorState message={friendlyError(outline.error, t)} onRetry={() => outline.refetch()} /></div>;
  if (!outline.data || !chapter) return <NotFoundPage />;
  const back = `/learn/${courseSlug}/chapter/${chapterSlug}`;
  const header = (
    <>
      <Link to={back} className="mb-5 inline-flex items-center gap-1 text-sm font-medium text-slate hover:text-ink">
        <ArrowLeft className="size-4" />{pick(chapter, "title", lang)}
      </Link>
      <p className="eyebrow">{t("quiz.moduleQuiz", { n: chapterIndex + 1 })}</p>
      <h1 className="mt-1 text-[28px] font-extrabold leading-tight sm:text-4xl">{quiz ? pick(quiz, "title", lang) : pick(chapter, "title", lang)}</h1>
    </>
  );
  if (!user) return <div className="page max-w-3xl">{header}<div className="mt-8"><SignInPrompt /></div></div>;
  if (overview.isLoading || (attemptId && attempt.isLoading)) return <PageLoader />;
  if (overview.isError) return <div className="page"><ErrorState message={friendlyError(overview.error, t)} onRetry={() => overview.refetch()} /></div>;
  if (!quiz) return <NotFoundPage />;
  if (attempt.isError) return <div className="page max-w-3xl">{header}<div className="mt-8"><ErrorState message={friendlyError(attempt.error, t)} onRetry={() => setParams({})} /></div></div>;

  const next = outline.data.chapters[chapterIndex + 1];
  const nextHref = next ? `/learn/${courseSlug}/chapter/${next.slug}` : `/learn/${courseSlug}`;
  return (
    <div className="page max-w-3xl">
      {header}
      {attempt.data?.status === "in_progress" ? (
        <QuizRunner attempt={attempt.data} onSubmitted={(a) => setParams({ attempt: a.id })} />
      ) : attempt.data ? (
        <QuizResult attempt={attempt.data} quiz={quiz} back={back} nextHref={nextHref} courseId={courseId!}
          onRetake={() => setParams({})} />
      ) : (
        <QuizIntro quiz={quiz} onStarted={(id) => setParams({ attempt: id })} nextHref={nextHref} />
      )}
    </div>
  );
}

function QuizIntro({ quiz, onStarted, nextHref }: { quiz: ModuleQuizStatus; onStarted: (id: string) => void; nextHref: string }) {
  const { t, n } = useI18n();
  const qc = useQueryClient();
  const start = useMutation({
    mutationFn: () => startQuizAttempt(quiz.quiz_id),
    onSuccess: (id) => { qc.invalidateQueries({ queryKey: ["quiz-overview"] }); onStarted(id); },
    onError: (e) => toast.error(friendlyError(e, t)),
  });
  const locked = quiz.status === "locked";
  return (
    <section className="surface mt-8 p-6 sm:p-8" aria-label={t("quiz.moduleQuiz", { n: "" })}>
      <div className="flex flex-wrap items-center gap-3">
        <QuizStatusBadge status={quiz.status} />
        {quiz.attempts > 0 && <span className="font-mono text-xs text-slate">{t("quiz.attempts", { n: quiz.attempts })}</span>}
        {quiz.latest && <span className="font-mono text-xs text-slate">{t("quiz.latest", { correct: quiz.latest.correct, total: quiz.latest.total, score: n(Math.round(Number(quiz.latest.score))) })}</span>}
      </div>
      <p className="mt-4 text-[15px]">{t("quiz.rules")}</p>
      {locked && (
        <p className="mt-4 flex items-start gap-2 rounded bg-paper px-4 py-3 text-sm">
          <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
          {quiz.module_unlocked ? t("quiz.lockedLessons", { done: quiz.lessons_done, total: quiz.lessons_total }) : t("quiz.lockedPrev")}
        </p>
      )}
      {quiz.module_unlocked && (
        <div className="mt-5 max-w-sm">
          <ProgressBar value={quiz.lessons_done} max={Math.max(quiz.lessons_total, 1)} />
          <p className="mt-1.5 font-mono text-xs text-slate">{t("learn.progress", { done: quiz.lessons_done, total: quiz.lessons_total })}</p>
        </div>
      )}
      <div className="mt-6 flex flex-wrap gap-3">
        {quiz.status === "passed" ? (
          <>
            {quiz.latest && <Button asChild variant="outline"><Link to={`?attempt=${quiz.latest.attempt_id}`}>{t("quiz.viewResult")}</Link></Button>}
            <Button asChild variant="ink"><Link to={nextHref}>{t("quiz.nextModule")} <ArrowRight /></Link></Button>
          </>
        ) : (
          <>
            <Button size="lg" disabled={locked} loading={start.isPending} onClick={() => start.mutate()}>
              {quiz.status === "failed" ? <RotateCcw /> : <PlayCircle />} {quiz.status === "failed" ? t("quiz.retake") : t("quiz.start")}
            </Button>
            {quiz.status === "failed" && quiz.latest && <Button asChild variant="outline" size="lg"><Link to={`?attempt=${quiz.latest.attempt_id}`}>{t("quiz.viewResult")}</Link></Button>}
          </>
        )}
      </div>
    </section>
  );
}

function CodeQuestionStatus({ q }: { q: QuizAttemptQuestion }) {
  const { t } = useI18n();
  const ev = q.evaluation;
  if (ev?.accepted) return <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-success"><CheckCircle2 className="size-4" />{t("quiz.codeAccepted")}</p>;
  if (ev?.latest) {
    return <p className="text-sm text-error">{t("quiz.codeLatest", { verdict: t(`verdict.${ev.latest.verdict}` as MessageKey), passed: ev.latest.passed, total: ev.latest.total })}</p>;
  }
  return <p className="text-sm text-slate">{t("quiz.codeNotYet")}</p>;
}

function QuizRunner({ attempt, onSubmitted }: { attempt: QuizAttempt; onSubmitted: (a: QuizAttempt) => void }) {
  const { t, n } = useI18n();
  const qc = useQueryClient();
  const [answers, setAnswers] = useState<Record<string, string>>(() =>
    Object.fromEntries(attempt.questions.filter((q) => q.selected).map((q) => [q.id, q.selected!])));
  const [confirm, setConfirm] = useState(false);
  useEffect(() => {
    setAnswers((cur) => ({ ...Object.fromEntries(attempt.questions.filter((q) => q.selected).map((q) => [q.id, q.selected!])), ...cur }));
  }, [attempt.questions]);

  const mcqs = attempt.questions.filter((q) => q.kind === "mcq");
  const codes = attempt.questions.filter((q) => q.kind === "code");
  const unanswered = mcqs.filter((q) => !answers[q.id]).length;
  const unsolved = codes.filter((q) => !q.evaluation?.accepted).length;

  const choose = async (qid: string, oid: string) => {
    const prev = answers[qid];
    setAnswers((a) => ({ ...a, [qid]: oid }));
    try { await saveQuizAnswer(attempt.id, qid, oid); }
    catch (e) { setAnswers((a) => ({ ...a, [qid]: prev })); toast.error(friendlyError(e, t)); }
  };
  const submit = useMutation({
    mutationFn: () => submitQuizAttempt(attempt.id),
    onSuccess: (res) => {
      qc.setQueryData(["quiz-attempt", res.id], res);
      ["quiz-overview", "progress", "certificate-progress", "certificates", "notifications"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      setConfirm(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
      onSubmitted(res);
    },
    onError: (e) => toast.error(friendlyError(e, t)),
  });

  return (
    <div className="mt-8">
      <p className="mb-4 text-sm text-slate">{t("quiz.rules")}</p>
      <ol className="space-y-5">
        {attempt.questions.map((q) => (
          <li key={q.id} className="surface p-5 sm:p-6" data-testid={`quiz-q-${q.kind}`}>
            <p className="eyebrow mb-2">{t("quiz.question", { n: q.number, total: attempt.questions.length })}{q.kind === "code" && ` · ${t("quiz.codeTask")}`}</p>
            {q.kind === "mcq" ? (
              <fieldset>
                <legend className="font-heading text-[17px] font-bold leading-snug">{q.prompt}</legend>
                {q.code && <CodeBlock code={q.code} language="c" className="mt-3" />}
                <div className="mt-4 grid gap-2">
                  {q.options!.map((o) => (
                    <label key={o.id} className={cn("flex min-h-[48px] cursor-pointer items-center gap-3 rounded border px-4 py-3 text-[15px] transition-colors",
                      answers[q.id] === o.id ? "border-ink bg-ink/5" : "border-line hover:border-ink/40")}>
                      <input type="radio" name={q.id} value={o.id} checked={answers[q.id] === o.id} onChange={() => choose(q.id, o.id)}
                        className="size-4 shrink-0 accent-[#101820]" />
                      <span className="min-w-0 break-words font-mono text-[14px]">{o.text}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : (
              <div>
                <h2 className="flex items-center gap-2 font-heading text-[17px] font-bold"><Code2 className="size-5" />{q.problem?.title}</h2>
                <p className="mt-2 text-sm text-slate">{t("quiz.codeHelp")}</p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Button asChild variant="ink"><Link to={`/problems/${q.problem!.slug}?quiz=${attempt.id}`}><Code2 /> {t("quiz.solveInIde")}</Link></Button>
                  <Button variant="outline" onClick={() => qc.invalidateQueries({ queryKey: ["quiz-attempt", attempt.id] })}><RefreshCw /> {t("quiz.refresh")}</Button>
                </div>
                <div className="mt-3"><CodeQuestionStatus q={q} /></div>
              </div>
            )}
          </li>
        ))}
      </ol>
      <div className="sticky bottom-[calc(76px+var(--safe-bottom))] z-10 mt-6 flex flex-wrap items-center justify-between gap-3 rounded border border-line bg-white/95 p-3 shadow-lift backdrop-blur md:bottom-4">
        <p className="font-mono text-xs text-slate">{t("quiz.answered", { n: n(mcqs.length - unanswered), total: n(mcqs.length) })} · {n(codes.length - unsolved)}/{n(codes.length)} {t("quiz.codeTask")}</p>
        <Button size="lg" onClick={() => setConfirm(true)}>{t("quiz.submit")}</Button>
      </div>
      <Dialog open={confirm} onOpenChange={setConfirm} title={t("quiz.confirmTitle")}
        description={unanswered + unsolved > 0 ? t("quiz.confirmBody", { unanswered, unsolved }) : t("quiz.confirmAllDone")}
        footer={<>
          <Button variant="outline" onClick={() => setConfirm(false)}>{t("common.cancel")}</Button>
          <Button variant="ink" loading={submit.isPending} onClick={() => submit.mutate()}>{t("quiz.submit")}</Button>
        </>} />
    </div>
  );
}

function QuizResult({ attempt, quiz, back, nextHref, courseId, onRetake }: {
  attempt: QuizAttempt; quiz: ModuleQuizStatus; back: string; nextHref: string; courseId: string; onRetake: () => void;
}) {
  const { t, n } = useI18n();
  const { user } = useAuth();
  const passed = attempt.status === "passed";
  const correct = attempt.correct ?? 0;
  const progress = useQuery({ queryKey: ["progress", "courses", user?.id], queryFn: getCourseProgress, enabled: passed });
  const courseDone = progress.data?.find((p) => p.course_id === courseId)?.completed_at;
  const optionText = (q: QuizAttemptQuestion, id?: string | null) => q.options?.find((o) => o.id === id)?.text;
  const latestAttempt = useMemo(() => quiz.latest?.attempt_id === attempt.id, [quiz.latest, attempt.id]);

  return (
    <div className="mt-8">
      <section className={cn("rounded-md p-6 sm:p-8", passed ? "bg-ink text-paper" : "border border-error/30 bg-error/5")} aria-live="polite">
        <div className="flex items-start gap-4">
          {passed ? <Award className="size-9 shrink-0 text-lime" aria-hidden /> : <XCircle className="size-9 shrink-0 text-error" aria-hidden />}
          <div>
            <h2 className="text-2xl font-extrabold" data-testid="quiz-result" data-status={attempt.status}>
              {passed ? t("quiz.passedTitle", { correct, total: attempt.total }) : t("quiz.failedTitle", { correct, total: attempt.total })}
            </h2>
            <p className={cn("mt-1 text-[15px]", passed ? "text-paper/75" : "text-slate")}>
              {passed ? t("quiz.passedBody") : t("quiz.failedBody", { min: quiz.pass_min_correct })}
            </p>
          </div>
        </div>
        <dl className="mt-6 grid grid-cols-3 gap-3 text-center">
          {[[t("quiz.correctCount"), n(correct)], [t("quiz.incorrectCount"), n(attempt.total - correct)], [t("quiz.score"), `${n(Math.round(Number(attempt.score ?? 0)))}%`]].map(([k, v]) => (
            <div key={k} className={cn("rounded p-3", passed ? "bg-ink-800" : "bg-white")}>
              <dd className="font-heading text-2xl font-extrabold">{v}</dd><dt className={cn("text-xs", passed ? "text-paper/60" : "text-slate")}>{k}</dt>
            </div>
          ))}
        </dl>
        {passed && courseDone && (
          <p className="mt-5 flex flex-wrap items-center gap-2 rounded bg-lime/15 px-4 py-3 text-sm font-semibold text-lime">
            <CheckCircle2 className="size-4" />{t("quiz.courseComplete")}
            <Link to="/profile#certificates" className="underline underline-offset-4">{t("cert.myTitle")}</Link>
          </p>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          {!passed && latestAttempt && <Button size="lg" onClick={onRetake}><RotateCcw /> {t("quiz.retake")}</Button>}
          {passed && <Button asChild size="lg"><Link to={nextHref}>{t("quiz.nextModule")} <ArrowRight /></Link></Button>}
          <Button asChild variant={passed ? "outline-dark" : "outline"} size="lg"><Link to={back}>{t("quiz.backToModule")}</Link></Button>
        </div>
      </section>

      <ol className="mt-6 space-y-4">
        {attempt.questions.map((q) => (
          <li key={q.id} className="surface p-5">
            <div className="flex items-start justify-between gap-3">
              <p className="eyebrow">{t("quiz.question", { n: q.number, total: attempt.total })}</p>
              {q.is_correct ? <CheckCircle2 className="size-5 shrink-0 text-success" aria-label={t("quiz.correctCount")} />
                : <XCircle className="size-5 shrink-0 text-error" aria-label={t("quiz.incorrectCount")} />}
            </div>
            {q.kind === "mcq" ? (
              <>
                <p className="mt-1 font-heading font-bold">{q.prompt}</p>
                {q.code && <CodeBlock code={q.code} language="c" className="mt-3" />}
                <ul className="mt-3 space-y-1.5 text-sm">
                  {q.options!.map((o) => {
                    const isKey = o.id === q.correct_option, isMine = o.id === q.selected;
                    return (
                      <li key={o.id} className={cn("flex items-start gap-2 rounded px-3 py-2 font-mono text-[13px]",
                        isKey ? "bg-success/10 text-success" : isMine ? "bg-error/10 text-error" : "text-slate")}>
                        {isKey ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> : isMine ? <XCircle className="mt-0.5 size-4 shrink-0" /> : <Circle className="mt-0.5 size-4 shrink-0 opacity-30" />}
                        <span className="break-words">{o.text}</span>
                      </li>
                    );
                  })}
                </ul>
                {!q.selected && <p className="mt-2 text-sm text-error">{t("quiz.notAnswered")}</p>}
                {!q.is_correct && q.selected && <p className="mt-2 text-xs text-slate">{t("quiz.yourAnswer")}: <span className="font-mono">{optionText(q, q.selected)}</span> · {t("quiz.correctAnswer")}: <span className="font-mono">{optionText(q, q.correct_option)}</span></p>}
              </>
            ) : (
              <>
                <p className="mt-1 flex items-center gap-2 font-heading font-bold"><Code2 className="size-4" />{q.problem?.title}</p>
                <div className="mt-2"><CodeQuestionStatus q={q} /></div>
              </>
            )}
            {q.explanation && <p className="mt-3 border-t border-line pt-3 text-sm text-slate">{q.explanation}</p>}
          </li>
        ))}
      </ol>
    </div>
  );
}
