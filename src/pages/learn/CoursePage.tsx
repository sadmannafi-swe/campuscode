import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Circle, Hammer, PlayCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";
import { ErrorState, PageLoader, ProgressBar } from "@/components/ui/misc";
import { getCourseOutline, getMyLessonProgress, type CourseOutline } from "@/services/courses";
import { friendlyError } from "@/lib/errors";
import { cn, pick } from "@/lib/utils";
import type { LessonProgress, LessonSummary } from "@/types/db";
import NotFoundPage from "../NotFoundPage";

const pad = (x: number) => String(x).padStart(2, "0");

function LessonRow({ l, courseSlug, state }: { l: LessonSummary; courseSlug: string; state?: LessonProgress["state"] }) {
  const { t, lang, n } = useI18n();
  return (
    <li>
      <Link to={`/learn/${courseSlug}/${l.slug}`} className="flex items-center gap-4 rounded px-3 py-3 hover:bg-ink-700">
        <span className="w-7 font-mono text-sm text-lime">{n(pad(l.number))}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{pick(l, "title", lang)}</span>
          <span className="block truncate text-xs text-paper/50">{pick(l, "summary", lang)}</span>
        </span>
        {l.is_project && <span className="hidden items-center gap-1 rounded bg-ink-700 px-2 py-0.5 text-xs sm:inline-flex"><Hammer className="size-3" />{t("learn.project")}</span>}
        <span className="hidden font-mono text-xs text-paper/40 sm:block">{n(l.estimated_minutes)} {t("common.minutes")}</span>
        {state === "completed" ? <CheckCircle2 className="size-5 shrink-0 text-lime" aria-label={t("learn.completed")} />
          : state === "started" ? <PlayCircle className="size-5 shrink-0 text-paper/60" /> : <Circle className="size-5 shrink-0 text-paper/25" />}
      </Link>
    </li>
  );
}

function useProgress() {
  const { user } = useAuth();
  const q = useQuery({ queryKey: ["progress", "lessons", user?.id], enabled: Boolean(user), queryFn: () => getMyLessonProgress(user!.id) });
  return useMemo(() => new Map((q.data ?? []).map((p) => [p.lesson_id, p.state])), [q.data]);
}

function Header({ outline, done }: { outline: CourseOutline; done: number }) {
  const { t } = useI18n();
  const { user } = useAuth();
  return (
    <div className="mb-10">
      <Link to="/learn" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-paper/60 hover:text-paper"><ArrowLeft className="size-4" />{t("learn.title")}</Link>
      {user && (
        <div className="mt-6 max-w-md">
          <ProgressBar dark value={done} max={outline.lessons.length} />
          <p className="mt-2 font-mono text-xs text-paper/60">{t("learn.progress", { done, total: outline.lessons.length })}</p>
        </div>
      )}
    </div>
  );
}

function CRoadmap({ outline }: { outline: CourseOutline }) {
  const { t, lang, n } = useI18n();
  const progress = useProgress();
  const [open, setOpen] = useState<string>(() => outline.chapters[0]?.id ?? "");
  const done = outline.lessons.filter((l) => progress.get(l.id) === "completed").length;
  const resume = outline.lessons.find((l) => progress.get(l.id) !== "completed") ?? outline.lessons[0];
  const chapter = outline.chapters.find((c) => c.id === open);
  return (
    <>
      <Header outline={outline} done={done} />
      <h1 className="text-[34px] font-extrabold leading-tight text-paper sm:text-5xl">{t("learn.roadmapTitle", { n: outline.lessons.length })}</h1>
      <p className="mt-3 max-w-xl text-[15px] text-paper/80">{t("learn.roadmapBody")}</p>
      {resume && (
        <Button asChild className="mt-6"><Link to={`/learn/${outline.course.slug}/${resume.slug}`}><PlayCircle /> {done ? t("learn.continue") : t("learn.start")} · {n(pad(resume.number))}</Link></Button>
      )}

      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {outline.chapters.map((ch) => {
          const first = ch.lessons[0]?.number ?? 0;
          const last = ch.lessons[ch.lessons.length - 1]?.number ?? 0;
          const chDone = ch.lessons.filter((l) => progress.get(l.id) === "completed").length;
          const active = open === ch.id;
          return (
            <button key={ch.id} onClick={() => setOpen(ch.id)} aria-expanded={active}
              className={cn("rounded border p-6 text-left transition-colors",
                active ? "border-lime/70 bg-ink-700" : "border-ink-600 bg-ink-800 hover:border-paper/30")}>
              <span className="font-mono text-sm font-medium text-lime">{n(pad(first))}{first !== last && `–${n(pad(last))}`}</span>
              <span className="mt-3 block font-heading text-lg font-bold text-paper">{pick(ch, "title", lang)}</span>
              <span className="mt-1 block text-xs text-paper/50">{n(chDone)}/{n(ch.lessons.length)}</span>
            </button>
          );
        })}
      </div>

      {chapter && (
        <section className="mt-6 rounded-md border border-ink-600 bg-ink-800 p-2 text-paper sm:p-4" aria-label={pick(chapter, "title", lang)}>
          <p className="px-3 pb-2 pt-2 text-sm text-paper/60">{pick(chapter, "description", lang)}</p>
          <ul>{chapter.lessons.map((l) => <LessonRow key={l.id} l={l} courseSlug={outline.course.slug} state={progress.get(l.id)} />)}</ul>
        </section>
      )}
      <p className="mt-10 text-[15px] text-paper/80">{t("learn.roadmapFoot")} <Link to="/practice" className="font-semibold text-lime hover:underline">{t("nav.practice")} →</Link></p>
    </>
  );
}

const PY_SNIPPET = ["def count_vowels(text):", "    total = 0", "    for ch in text:", "        if ch in 'aeiou':", "            total += 1", "    return total"];

function PythonCourse({ outline }: { outline: CourseOutline }) {
  const { t, lang, n } = useI18n();
  const progress = useProgress();
  const [open, setOpen] = useState<string | null>(outline.chapters[0]?.id ?? null);
  const done = outline.lessons.filter((l) => progress.get(l.id) === "completed").length;
  return (
    <>
      <Header outline={outline} done={done} />
      <h1 className="text-[34px] font-extrabold leading-tight text-paper sm:text-5xl">{t("learn.pyTitle")}</h1>
      <p className="mt-3 max-w-xl text-[15px] text-paper/80">{t("learn.pyBody")}</p>
      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_1fr]">
        <div className="hidden rounded border border-ink-600 bg-ink-800 p-8 lg:block" aria-hidden>
          <pre className="font-mono text-[15px] leading-9">
            {PY_SNIPPET.map((line, i) => (
              <div key={i}><span className={i === 0 ? "text-lime" : "text-paper/80"}>{pad(i + 1)}</span>{"  "}<span className={i === 0 ? "text-lime" : "text-paper"}>{line}</span></div>
            ))}
          </pre>
        </div>
        <ol className="min-w-0 text-paper">
          {outline.chapters.map((ch, i) => (
            <li key={ch.id} className="border-b border-ink-600">
              <button onClick={() => setOpen(open === ch.id ? null : ch.id)} aria-expanded={open === ch.id}
                className="flex w-full items-center gap-6 py-6 text-left">
                <span className="font-mono text-sm font-bold text-lime">{n(pad(i + 1))}</span>
                <span className="flex-1 font-heading text-2xl font-bold">{pick(ch, "title", lang)}</span>
                <span className="font-mono text-xs text-paper/50">{n(ch.lessons.length)}</span>
              </button>
              {open === ch.id && <ul className="pb-4">{ch.lessons.map((l) => <LessonRow key={l.id} l={l} courseSlug={outline.course.slug} state={progress.get(l.id)} />)}</ul>}
            </li>
          ))}
        </ol>
      </div>
    </>
  );
}

export default function CoursePage() {
  const { courseSlug } = useParams();
  const { t } = useI18n();
  const q = useQuery({ queryKey: ["course", courseSlug], queryFn: () => getCourseOutline(courseSlug!) });
  if (q.isLoading) return <div className="min-h-[70vh] bg-ink"><PageLoader /></div>;
  if (q.isError) return <div className="page"><ErrorState message={friendlyError(q.error, t)} onRetry={() => q.refetch()} /></div>;
  if (!q.data) return <NotFoundPage />;
  return (
    <div className="min-h-full bg-ink">
      <div className="page">{q.data.course.language === "c" ? <CRoadmap outline={q.data} /> : <PythonCourse outline={q.data} />}</div>
    </div>
  );
}
