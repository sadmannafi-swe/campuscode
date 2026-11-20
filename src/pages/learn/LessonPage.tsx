import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, Code2, ListChecks, Target } from "lucide-react";
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
import type { LessonExample, UiLang } from "@/types/db";
import { IDE_HANDOFF_KEY } from "@/pages/IdePage";
import NotFoundPage from "../NotFoundPage";

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

export default function LessonPage() {
  const { courseSlug, lessonSlug } = useParams();
  const { t, lang, n } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
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

  const lesson = lessonQ.data?.lesson;
  const completed = progress.data?.some((p) => p.lesson_id === lesson?.id && p.state === "completed");

  useEffect(() => {
    if (user && lesson) markLessonStarted(user.id, lesson.id).then(() => qc.invalidateQueries({ queryKey: ["progress"] })).catch(() => {});
  }, [user, lesson, qc]);

  const complete = useMutation({
    mutationFn: () => markLessonCompleted(user!.id, lesson!.id),
    onSuccess: () => {
      toast.success(t("learn.completed"));
      qc.invalidateQueries({ queryKey: ["progress"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (e) => toast.error(friendlyError(e, t)),
  });

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
  const doneCount = (progress.data ?? []).filter((p) => p.state === "completed" && outline.data!.lessons.some((l) => l.id === p.lesson_id)).length;

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

      <div className="mt-8 grid items-start gap-5 lg:grid-cols-[1fr_1fr]">
        {/* Explanation card */}
        <article className="surface p-6 sm:p-10" lang={contentLang}>
          {objectives.length > 0 && (
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

      {/* Completion + navigation */}
      <div className="mt-10 flex flex-col gap-4 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {user ? (
            completed ? <p className="inline-flex items-center gap-2 font-semibold text-success"><CheckCircle2 className="size-5" />{t("learn.completed")}</p>
              : <Button variant="lime" size="lg" onClick={() => complete.mutate()} loading={complete.isPending}><CheckCircle2 /> {t("learn.markComplete")}</Button>
          ) : (
            <p className="text-sm text-slate"><Link to={`/login?next=${encodeURIComponent(`/learn/${courseSlug}/${lessonSlug}`)}`} className="font-semibold text-ink underline decoration-lime decoration-2 underline-offset-4">{t("nav.signIn")}</Link> — {t("learn.signInToTrack")}</p>
          )}
        </div>
        <div className="flex gap-2">
          {prev && <Button asChild variant="outline"><Link to={`/learn/${courseSlug}/${prev.slug}`}><ArrowLeft /> {t("common.previous")} · {n(prev.number)}</Link></Button>}
          {next && <Button asChild variant="ink"><Link to={`/learn/${courseSlug}/${next.slug}`}>{t("common.next")} · {n(next.number)} <ArrowRight /></Link></Button>}
        </div>
      </div>
    </div>
  );
}
