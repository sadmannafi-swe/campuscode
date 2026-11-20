import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, ArrowRight, BookOpen, CheckCircle2, ClipboardCheck, Code2, ListChecks, Lock, PlayCircle, Target } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";
import { ErrorState, PageLoader, ProgressBar } from "@/components/ui/misc";
import { Markdown } from "@/components/common/Markdown";
import { CodeBlock } from "@/components/common/CodeBlock";
import { getCourseOutline, getLesson, getMyLessonProgress, markLessonCompleted, markLessonStarted } from "@/services/courses";
import { listTopics } from "@/services/problems";
import { friendlyError } from "@/lib/errors";
import { cn, pick, pickArr } from "@/lib/utils";
import type { LessonExample, LessonProgress, LessonSummary, UiLang } from "@/types/db";
import { IDE_HANDOFF_KEY } from "@/pages/IdePage";
import { LessonVideo } from "@/components/learn/LessonVideo";
import { getVideoProgress, listCourseVideos } from "@/services/videos";
import { formatClock } from "@/lib/youtube";
import NotFoundPage from "../NotFoundPage";
import { useModuleOverview } from "@/components/learn/courseParts";
import { lockedModuleError } from "@/services/quizzes";

/** Completion + previous/next — sits directly under the lesson video (or the lesson header when there is none). */
function LessonActions({ courseSlug, lessonSlug, prev, next, completed, signedIn, onComplete, completing, locked, quizHref }: {
  courseSlug: string; lessonSlug: string; prev: LessonSummary | null; next: LessonSummary | null;
  completed: boolean; signedIn: boolean; onComplete: () => void; completing: boolean;
  /** Module locked for this student: readable, but completion waits for the previous module quiz. */
  locked?: boolean;
  /** Set on a module's last lesson while its quiz is not passed: "Next" leads to the quiz. */
  quizHref?: string | null;
}) {
  const { t, lang, n } = useI18n();
  const navBtn = "h-12 min-w-0 w-full justify-start gap-3 px-4 sm:w-auto sm:max-w-[260px]";
  const label = (dir: "prev" | "next", l: LessonSummary | null) => (
    <span className={cn("flex min-w-0 flex-col leading-tight", dir === "next" ? "items-end text-right" : "items-start text-left")}>
      <span className="text-[11px] font-semibold uppercase tracking-wide opacity-70">{dir === "prev" ? t("learn.prevLesson") : t("learn.nextLesson")}</span>
      {l && <span className="max-w-full truncate text-sm">{n(l.number)} · {pick(l, "title", lang)}</span>}
    </span>
  );
  return (
    <nav aria-label={t("learn.lessonActions")} data-testid="lesson-actions"
      className="mt-4 flex flex-col gap-3 rounded border border-line bg-white p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
      <div className="sm:min-w-0 sm:flex-1">
        {!signedIn ? (
          <p className="text-sm text-slate"><Link to={`/login?next=${encodeURIComponent(`/learn/${courseSlug}/${lessonSlug}`)}`} className="font-semibold text-ink underline decoration-lime decoration-2 underline-offset-4">{t("nav.signIn")}</Link> — {t("learn.signInToTrack")}</p>
        ) : completed ? (
          <p role="status" className="inline-flex h-12 items-center gap-2 font-semibold text-success"><CheckCircle2 className="size-5" />{t("learn.completed")}</p>
        ) : locked ? (
          <p className="flex items-start gap-2 text-sm text-slate" data-testid="lesson-locked"><Lock className="mt-0.5 size-4 shrink-0" aria-hidden />{t("learn.moduleLocked")}</p>
        ) : (
          <Button variant="lime" size="lg" className="w-full sm:w-auto" onClick={onComplete} loading={completing}><CheckCircle2 /> {t("learn.markComplete")}</Button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
        {prev ? (
          <Button asChild variant="outline" className={navBtn}><Link to={`/learn/${courseSlug}/${prev.slug}`} rel="prev"><ArrowLeft />{label("prev", prev)}</Link></Button>
        ) : (
          <Button variant="outline" className={navBtn} disabled aria-disabled="true"><ArrowLeft />{label("prev", null)}</Button>
        )}
        {quizHref ? (
          <Button asChild variant="ink" className={cn(navBtn, "justify-end")}><Link to={quizHref}>
            <span className="flex min-w-0 flex-col items-end text-right leading-tight">
              <span className="text-[11px] font-semibold uppercase tracking-wide opacity-70">{t("learn.nextLesson")}</span>
              <span className="max-w-full truncate text-sm">{t("quiz.takeQuiz")}</span>
            </span><ClipboardCheck /></Link></Button>
        ) : next ? (
          <Button asChild variant="ink" className={cn(navBtn, "justify-end")}><Link to={`/learn/${courseSlug}/${next.slug}`} rel="next">{label("next", next)}<ArrowRight /></Link></Button>
        ) : (
          <Button variant="ink" className={cn(navBtn, "justify-end")} disabled aria-disabled="true">{label("next", null)}<ArrowRight /></Button>
        )}
      </div>
    </nav>
  );
}

function ExampleCard({ ex, contentLang }: { ex: LessonExample; contentLang: UiLang }) {
  const { t } = useI18n();
  const nav = useNavigate();
  const tryIt = () => {
    sessionStorage.setItem(IDE_HANDOFF_KEY, JSON.stringify({ language: ex.language, code: ex.code, stdin: ex.stdin }));
    nav("/ide?from=lesson");
  };
  return (
    <div className="space-y-4">
      <CodeBlock code={ex.code} language={ex.language} title={pick(ex, "title", contentLang) || undefined} />
      {ex.stdin && (
        <div className="surface px-5 py-4">
          <p className="eyebrow mb-1">{t("learn.input")}</p>
          <pre className="whitespace-pre-wrap font-mono text-sm">{ex.stdin}</pre>
        </div>
      )}
      <div className="surface px-5 py-4">
        <p className="flex items-start gap-3 font-mono">
          <span className="pt-0.5 font-sans text-sm font-bold uppercase tracking-wide">{t("learn.output")}</span>
          <pre className="min-w-0 flex-1 overflow-x-auto whitespace-pre font-mono text-[15px] font-semibold leading-6">{ex.expected_output}</pre>
        </p>
      </div>
      {pick(ex, "explanation", contentLang) && (
        <p className={cn("text-[15px] leading-7 text-ink/80", contentLang === "bn" && "font-bn")} lang={contentLang}>
          <span className="font-semibold text-ink">{t("learn.howItWorks")}: </span>{pick(ex, "explanation", contentLang)}
        </p>
      )}
      <Button variant="ink" onClick={tryIt}><Code2 /> {t("learn.tryInIde")}</Button>
    </div>
  );
}

function ChapterLessons({ lessons, currentId, courseSlug, videoSeconds, completedIds }: {
  lessons: LessonSummary[]; currentId: string; courseSlug: string;
  videoSeconds: Map<string, number | null>; completedIds: Set<string>;
}) {
  const { t, lang, n } = useI18n();
  return (
    <nav aria-label={t("video.inChapter")} className="surface p-4">
      <p className="eyebrow mb-2">{t("video.inChapter")}</p>
      <ol className="space-y-0.5">
        {lessons.map((l) => {
          const current = l.id === currentId;
          const hasVideo = videoSeconds.has(l.id);
          const secs = videoSeconds.get(l.id);
          return (
            <li key={l.id}>
              <Link to={`/learn/${courseSlug}/${l.slug}`} aria-current={current ? "page" : undefined}
                className={cn("flex items-start gap-2.5 rounded px-2 py-2 text-sm transition-colors",
                  current ? "bg-ink text-paper" : "hover:bg-paper")}>
                <span className={cn("mt-0.5 w-6 shrink-0 font-mono text-xs", current ? "text-lime" : "text-slate")}>{n(String(l.number).padStart(2, "0"))}</span>
                <span className="min-w-0 flex-1">
                  <span className={cn("block leading-snug", current && "font-semibold")}>{pick(l, "title", lang)}</span>
                  <span className={cn("mt-0.5 flex items-center gap-1 text-[11px]", current ? "text-paper/60" : "text-slate")}>
                    {hasVideo
                      ? <><PlayCircle className="size-3" aria-hidden />{t("video.hasVideo")}{secs ? ` · ${formatClock(secs)}` : ""}</>
                      : <><BookOpen className="size-3" aria-hidden />{t("video.noVideo")}</>}
                    {current && <span className="ml-1 rounded bg-lime px-1 font-semibold text-ink">{t("video.now")}</span>}
                  </span>
                </span>
                {completedIds.has(l.id) && <CheckCircle2 className={cn("mt-0.5 size-4 shrink-0", current ? "text-lime" : "text-success")} aria-label={t("learn.completed")} />}
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default function LessonPage() {
  const { courseSlug, lessonSlug } = useParams();
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();
  const [contentLang, setContentLang] = useState<UiLang>(lang);
  useEffect(() => setContentLang(lang), [lang]);

  const outline = useQuery({ queryKey: ["course", courseSlug], queryFn: () => getCourseOutline(courseSlug!) });
  const lessonQ = useQuery({
    queryKey: ["lesson", courseSlug, lessonSlug],
    enabled: Boolean(outline.data),
    queryFn: () => getLesson(outline.data!.course.id, lessonSlug!),
  });
  const progress = useQuery({ queryKey: ["progress", "lessons", user?.id], enabled: Boolean(user), queryFn: () => getMyLessonProgress(user!.id) });
  const topics = useQuery({ queryKey: ["topics"], queryFn: listTopics, staleTime: 600_000 });
  const courseId = outline.data?.course.id;
  const videos = useQuery({ queryKey: ["course-videos", courseId], enabled: Boolean(courseId), queryFn: () => listCourseVideos(courseId!) });
  const modules = useModuleOverview(courseId);

  const lesson = lessonQ.data?.lesson;
  const lessonVideo = videos.data?.find((v) => v.lesson_id === lesson?.id && v.is_published) ?? null;
  const videoProgress = useQuery({
    queryKey: ["video-progress", user?.id, lessonVideo?.id],
    enabled: Boolean(user && lessonVideo),
    queryFn: async () => (await getVideoProgress(user!.id, [lessonVideo!.id]))[0] ?? null,
  });
  const completed = progress.data?.some((p) => p.lesson_id === lesson?.id && p.state === "completed");

  useEffect(() => {
    if (user && lesson) markLessonStarted(user.id, lesson.id).then(() => qc.invalidateQueries({ queryKey: ["progress"] })).catch(() => {});
  }, [user, lesson, qc]);

  const progressKey = ["progress", "lessons", user?.id];
  const complete = useMutation({
    mutationFn: () => markLessonCompleted(user!.id, lesson!.id),
    // Show it as completed immediately (checkmarks, progress bars, chapter list); roll back on failure.
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: progressKey });
      const previous = qc.getQueryData<LessonProgress[]>(progressKey);
      const now = new Date().toISOString();
      qc.setQueryData<LessonProgress[]>(progressKey, (rows = []) => {
        const row = rows.find((r) => r.lesson_id === lesson!.id);
        const done: LessonProgress = { ...(row ?? { user_id: user!.id, lesson_id: lesson!.id, started_at: now }), state: "completed", completed_at: now, updated_at: now } as LessonProgress;
        return row ? rows.map((r) => (r.lesson_id === lesson!.id ? done : r)) : [...rows, done];
      });
      return { previous };
    },
    onSuccess: () => toast.success(t("learn.completed")),
    onError: (e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(progressKey, ctx.previous);
      toast.error(friendlyError(lockedModuleError(e) ?? e, t));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["progress"] });          // lesson states + course progress
      qc.invalidateQueries({ queryKey: ["stats"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["certificate-progress"] });
      qc.invalidateQueries({ queryKey: ["certificates"] });
      qc.invalidateQueries({ queryKey: ["quiz-overview"] });
    },
  });

  const videoSeconds = useMemo(
    () => new Map((videos.data ?? []).filter((v) => v.lesson_id).map((v) => [v.lesson_id!, v.duration_seconds])),
    [videos.data]);

  const { prev, next, total } = useMemo(() => {
    const list = outline.data?.lessons ?? [];
    const i = list.findIndex((l) => l.slug === lessonSlug);
    return { prev: i > 0 ? list[i - 1] : null, next: i >= 0 && i < list.length - 1 ? list[i + 1] : null, total: list.length };
  }, [outline.data, lessonSlug]);

  if (outline.isLoading || lessonQ.isLoading) return <PageLoader />;
  if (outline.isError || lessonQ.isError) return <div className="page"><ErrorState message={friendlyError(outline.error ?? lessonQ.error, t)} onRetry={() => lessonQ.refetch()} /></div>;
  if (!outline.data || !lessonQ.data || !lesson) return <NotFoundPage />;

  const { examples } = lessonQ.data;
  const chapter = outline.data.chapters.find((c) => c.id === lesson.chapter_id);
  const topic = topics.data?.find((tp) => tp.id === lesson.practice_topic_id);
  const objectives = pickArr(lesson, "objectives", contentLang);
  const mistakes = pickArr(lesson, "common_mistakes", contentLang);
  const practice = pickArr(lesson, "practice", contentLang);
  const bnClass = contentLang === "bn" ? "font-bn" : "";
  const completedIds = new Set((progress.data ?? []).filter((p) => p.state === "completed").map((p) => p.lesson_id));
  const objectivesCard = objectives.length > 0 && (
    <section className="rounded bg-white p-4 surface" lang={contentLang}>
      <h2 className={cn("mb-2 flex items-center gap-2 text-sm font-bold", bnClass)}><Target className="size-4" />{t("learn.objectives")}</h2>
      <ul className={cn("list-disc space-y-1 pl-5 text-sm", bnClass)}>{objectives.map((o) => <li key={o}>{o}</li>)}</ul>
    </section>
  );
  const doneCount = (progress.data ?? []).filter((p) => p.state === "completed" && outline.data!.lessons.some((l) => l.id === p.lesson_id)).length;
  const mod = chapter ? modules.byChapter.get(chapter.id) : undefined;
  const quizHref = user && chapter && mod?.quiz && mod.quiz.status !== "passed" && (!next || next.chapter_id !== chapter.id)
    ? `/learn/${courseSlug}/chapter/${chapter.slug}/quiz` : null;
  const actions = (
    <LessonActions courseSlug={courseSlug!} lessonSlug={lessonSlug!} prev={prev} next={next} completed={Boolean(completed)}
      signedIn={Boolean(user)} onComplete={() => complete.mutate()} completing={complete.isPending}
      locked={Boolean(user && mod && !mod.unlocked)} quizHref={quizHref} />
  );

  return (
    <div className="page">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link to={`/learn/${courseSlug}`} className="inline-flex items-center gap-1 text-sm font-medium text-slate hover:text-ink">
          <ArrowLeft className="size-4" />{pick(outline.data.course, "title", lang)}{chapter && <span className="hidden sm:inline"> · {pick(chapter, "title", lang)}</span>}
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate">{t("learn.readIn")}</span>
          <div role="group" className="inline-flex h-8 rounded border border-line bg-white p-0.5 text-xs font-semibold">
            {(["en", "bn"] as const).map((l) => (
              <button key={l} onClick={() => setContentLang(l)} aria-pressed={contentLang === l}
                className={cn("rounded-sm px-2.5", l === "bn" && "font-bn", contentLang === l ? "bg-ink text-paper" : "text-slate")}>
                {l === "en" ? "English" : "বাংলা"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="font-mono text-xs text-slate">{t("learn.lessonOf", { n: lesson.number, total })}{lesson.is_project && ` · ${t("learn.project")}`}</p>
      <h1 className={cn("mt-2 text-[28px] font-extrabold leading-tight sm:text-4xl", bnClass)} lang={contentLang}>{pick(lesson, "title", contentLang)}</h1>
      <p className={cn("mt-2 max-w-3xl text-[15px] text-slate", bnClass)} lang={contentLang}>{pick(lesson, "summary", contentLang)}</p>
      {user && <ProgressBar className="mt-5 max-w-sm" value={doneCount} max={total} />}

      {!lessonVideo && !videos.isLoading && <div className="max-w-3xl">{actions}</div>}

      {lessonVideo && !videoProgress.isLoading && (
        <div className="mt-8 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="lg:hidden">{objectivesCard}</div>
          <div className="min-w-0">
            <LessonVideo key={lessonVideo.id} video={lessonVideo} progress={videoProgress.data}
              poster={{ eyebrow: t("learn.lessonVideoEyebrow", { n: lesson.number }), title: pick(lesson, "title", lang) }}
              autoplay={searchParams.get("autoplay") === "1"}
              next={next ? { href: `/learn/${courseSlug}/${next.slug}`, title: pick(next, "title", lang), hasVideo: videoSeconds.has(next.id) } : null}
              onProgressSaved={() => qc.invalidateQueries({ queryKey: ["video-progress", user?.id] })} />
            {actions}
          </div>
          <aside className="space-y-5">
            <div className="hidden lg:block">{objectivesCard}</div>
            {chapter && (
              <ChapterLessons lessons={chapter.lessons} currentId={lesson.id} courseSlug={courseSlug!}
                videoSeconds={videoSeconds} completedIds={completedIds} />
            )}
          </aside>
        </div>
      )}

      <div className="mt-8 grid items-start gap-5 lg:grid-cols-[1fr_1fr]">
        {/* Explanation card */}
        <article className="surface p-6 sm:p-10" lang={contentLang}>
          {!lessonVideo && objectives.length > 0 && (
            <section className="mb-6 rounded bg-paper p-4">
              <h2 className={cn("mb-2 flex items-center gap-2 text-sm font-bold", bnClass)}><Target className="size-4" />{t("learn.objectives")}</h2>
              <ul className={cn("list-disc space-y-1 pl-5 text-sm", bnClass)}>{objectives.map((o) => <li key={o}>{o}</li>)}</ul>
            </section>
          )}
          <Markdown className={bnClass}>{pick(lesson, "body", contentLang)}</Markdown>
          {mistakes.length > 0 && (
            <section className="mt-8">
              <h2 className={cn("mb-2 flex items-center gap-2 font-heading text-base font-bold", bnClass)}><AlertTriangle className="size-4 text-warning" />{t("learn.mistakes")}</h2>
              <ul className={cn("space-y-2 text-[15px]", bnClass)}>
                {mistakes.map((m) => <li key={m} className="rounded border-l-2 border-warning bg-warning/5 px-3 py-2">{m}</li>)}
              </ul>
            </section>
          )}
          {practice.length > 0 && (
            <section className="mt-8">
              <h2 className={cn("mb-2 flex items-center gap-2 font-heading text-base font-bold", bnClass)}><ListChecks className="size-4" />{t("learn.practice")}</h2>
              <ol className={cn("list-decimal space-y-1.5 pl-5 text-[15px]", bnClass)}>{practice.map((p) => <li key={p}>{p}</li>)}</ol>
            </section>
          )}
        </article>

        {/* Code + output (slide 9 right column) */}
        <div className="space-y-6 lg:sticky lg:top-20">
          {examples.map((ex) => <ExampleCard key={ex.id} ex={ex} contentLang={contentLang} />)}
          {topic && (
            <Button asChild variant="outline" className="w-full"><Link to={`/practice/${topic.slug}`}><Target /> {t("learn.practiceTopic", { topic: pick(topic, "name", lang) })}</Link></Button>
          )}
        </div>
      </div>

    </div>
  );
}
