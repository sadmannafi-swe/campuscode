import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, PlayCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";
import { ErrorState, PageLoader, ProgressBar } from "@/components/ui/misc";
import { getCourseOutline } from "@/services/courses";
import { friendlyError } from "@/lib/errors";
import { pick } from "@/lib/utils";
import { LessonRow, lessonRange, pad, useCourseVideos, useLessonStates } from "@/components/learn/courseParts";
import NotFoundPage from "../NotFoundPage";

/** /learn/:courseSlug/chapter/:chapterSlug — the lessons of one chapter, in course order. */
export default function ChapterPage() {
  const { courseSlug, chapterSlug } = useParams();
  const { t, lang, n } = useI18n();
  const { user } = useAuth();
  const q = useQuery({ queryKey: ["course", courseSlug], queryFn: () => getCourseOutline(courseSlug!) });
  const states = useLessonStates();
  const videos = useCourseVideos(q.data?.course.id);

  if (q.isLoading) return <div className="min-h-[70vh] bg-ink"><PageLoader /></div>;
  if (q.isError) return <div className="page"><ErrorState message={friendlyError(q.error, t)} onRetry={() => q.refetch()} /></div>;
  const outline = q.data;
  const index = outline?.chapters.findIndex((c) => c.slug === chapterSlug) ?? -1;
  if (!outline || index < 0) return <NotFoundPage />;

  const chapter = outline.chapters[index];
  const prev = outline.chapters[index - 1];
  const next = outline.chapters[index + 1];
  const [first, last] = lessonRange(chapter.lessons);
  const done = chapter.lessons.filter((l) => states.get(l.id) === "completed").length;
  const resume = chapter.lessons.find((l) => states.get(l.id) !== "completed") ?? chapter.lessons[0];
  const coursePath = `/learn/${outline.course.slug}`;

  return (
    <div className="min-h-full bg-ink text-paper">
      <div className="page">
        <Link to={coursePath} className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-paper/60 hover:text-paper">
          <ArrowLeft className="size-4" />{pick(outline.course, "title", lang)} · {t("learn.backToCourse")}
        </Link>

        <p className="font-mono text-sm text-lime">
          {n(pad(first))}{first !== last && `–${n(pad(last))}`}
          <span className="ml-3 text-paper/50">{t("learn.chapterOf", { n: index + 1, total: outline.chapters.length })}</span>
        </p>
        <h1 className="mt-2 text-[32px] font-extrabold leading-tight sm:text-5xl">{pick(chapter, "title", lang)}</h1>
        {pick(chapter, "description", lang) && <p className="mt-3 max-w-2xl text-[15px] text-paper/75">{pick(chapter, "description", lang)}</p>}

        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-4">
          {resume && (
            <Button asChild>
              <Link to={`${coursePath}/${resume.slug}`}><PlayCircle /> {done ? t("learn.continue") : t("learn.start")} · {n(pad(resume.number))}</Link>
            </Button>
          )}
          {user && (
            <div className="w-full max-w-xs">
              <ProgressBar dark value={done} max={chapter.lessons.length} />
              <p className="mt-1.5 font-mono text-xs text-paper/55">{t("learn.progress", { done, total: chapter.lessons.length })}</p>
            </div>
          )}
        </div>

        <section aria-label={pick(chapter, "title", lang)} className="mt-8 rounded-md border border-ink-600 bg-ink-800 p-2 sm:p-3">
          <ul>
            {chapter.lessons.map((l) => (
              <LessonRow key={l.id} l={l} courseSlug={outline.course.slug} state={states.get(l.id)} video={videos.byLesson.get(l.id)} />
            ))}
          </ul>
        </section>

        <nav aria-label={t("learn.chapters")} className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-between">
          {prev ? (
            <Link to={`${coursePath}/chapter/${prev.slug}`} className="group flex items-center gap-3 rounded border border-ink-600 px-4 py-3 transition-colors hover:border-lime/60 active:bg-ink-700">
              <ArrowLeft className="size-4 text-paper/50 group-hover:text-lime" />
              <span><span className="block text-xs text-paper/50">{t("learn.prevChapter")}</span><span className="font-semibold">{pick(prev, "title", lang)}</span></span>
            </Link>
          ) : <span />}
          {next && (
            <Link to={`${coursePath}/chapter/${next.slug}`} className="group flex items-center justify-end gap-3 rounded border border-ink-600 px-4 py-3 text-right transition-colors hover:border-lime/60 active:bg-ink-700">
              <span><span className="block text-xs text-paper/50">{t("learn.nextChapter")}</span><span className="font-semibold">{pick(next, "title", lang)}</span></span>
              <ArrowRight className="size-4 text-paper/50 group-hover:text-lime" />
            </Link>
          )}
        </nav>
      </div>
    </div>
  );
}
