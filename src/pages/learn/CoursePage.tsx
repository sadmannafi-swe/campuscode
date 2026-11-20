import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, PlayCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";
import { ErrorState, PageLoader, ProgressBar } from "@/components/ui/misc";
import { getCourseOutline, type CourseOutline } from "@/services/courses";
import { friendlyError } from "@/lib/errors";
import { cn, pick } from "@/lib/utils";
import NotFoundPage from "../NotFoundPage";
import { LessonVideo } from "@/components/learn/LessonVideo";
import { LessonRow, lessonRange, pad, useCourseVideos, useLessonStates } from "@/components/learn/courseParts";

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
  const progress = useLessonStates();
  const done = outline.lessons.filter((l) => progress.get(l.id) === "completed").length;
  const resume = outline.lessons.find((l) => progress.get(l.id) !== "completed") ?? outline.lessons[0];
  const videos = useCourseVideos(outline.course.id);
  return (
    <>
      <Header outline={outline} done={done} />
      <div className={cn("grid items-center gap-8", videos.intro && "lg:grid-cols-[1fr_minmax(0,460px)]")}>
        <div>
          <h1 className="text-[34px] font-extrabold leading-tight text-paper sm:text-5xl">{t("learn.roadmapTitle", { n: outline.lessons.length })}</h1>
          <p className="mt-3 max-w-xl text-[15px] text-paper/80">{t("learn.roadmapBody")}</p>
          {resume && (
            <Button asChild className="mt-6"><Link to={`/learn/${outline.course.slug}/${resume.slug}`}><PlayCircle /> {done ? t("learn.continue") : t("learn.start")} · {n(pad(resume.number))}</Link></Button>
          )}
        </div>
        {videos.intro && (
          <LessonVideo video={videos.intro} poster={{ eyebrow: t("video.courseIntro"), title: pick(outline.course, "title", lang) }} />
        )}
      </div>

      {/* Every card is a real link to its chapter page (URL + Back button work). */}
      <nav aria-label={t("learn.chapters")} className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {outline.chapters.map((ch) => {
          const [first, last] = lessonRange(ch.lessons);
          const chDone = ch.lessons.filter((l) => progress.get(l.id) === "completed").length;
          const withVideo = ch.lessons.filter((l) => videos.byLesson.has(l.id)).length;
          return (
            <Link key={ch.id} to={`/learn/${outline.course.slug}/chapter/${ch.slug}`}
              aria-label={`${pick(ch, "title", lang)} — ${t("learn.lessonsRange", { from: n(pad(first)), to: n(pad(last)) })}`}
              className="group relative flex flex-col rounded border border-ink-600 bg-ink-800 p-6 text-left transition-all duration-150
                hover:-translate-y-0.5 hover:border-lime/60 hover:bg-ink-700 hover:shadow-[0_8px_24px_-16px_rgba(183,243,107,0.5)]
                active:translate-y-0 active:scale-[0.98] active:border-lime active:bg-ink-600">
              <span className="font-mono text-sm font-medium text-lime">{n(pad(first))}{first !== last && `–${n(pad(last))}`}</span>
              <span className="mt-3 block pr-6 font-heading text-lg font-bold text-paper">{pick(ch, "title", lang)}</span>
              <span className="mt-1 flex items-center gap-3 text-xs text-paper/50">
                <span>{n(chDone)}/{n(ch.lessons.length)}</span>
                {withVideo > 0 && <span className="inline-flex items-center gap-1"><PlayCircle className="size-3" aria-hidden />{t("learn.videosCount", { n: withVideo })}</span>}
              </span>
              <ArrowRight className="absolute right-5 top-6 size-4 text-paper/30 transition-all group-hover:translate-x-0.5 group-hover:text-lime" aria-hidden />
            </Link>
          );
        })}
      </nav>
      <p className="mt-10 text-[15px] text-paper/80">{t("learn.roadmapFoot")} <Link to="/practice" className="font-semibold text-lime hover:underline">{t("nav.practice")} →</Link></p>
    </>
  );
}

const PY_SNIPPET = ["def count_vowels(text):", "    total = 0", "    for ch in text:", "        if ch in 'aeiou':", "            total += 1", "    return total"];

function PythonCourse({ outline }: { outline: CourseOutline }) {
  const { t, lang, n } = useI18n();
  const progress = useLessonStates();
  const [open, setOpen] = useState<string | null>(outline.chapters[0]?.id ?? null);
  const videos = useCourseVideos(outline.course.id);
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
              {open === ch.id && <ul className="pb-4">{ch.lessons.map((l) => <LessonRow key={l.id} l={l} courseSlug={outline.course.slug} state={progress.get(l.id)} video={videos.byLesson.get(l.id)} />)}</ul>}
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
