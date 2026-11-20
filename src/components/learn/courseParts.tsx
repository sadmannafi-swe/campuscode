import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Circle, Hammer, PlayCircle, Video } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/i18n";
import { getMyLessonProgress } from "@/services/courses";
import { listCourseVideos } from "@/services/videos";
import { formatClock } from "@/lib/youtube";
import { pick } from "@/lib/utils";
import type { LearningVideo, LessonProgress, LessonSummary } from "@/types/db";

export const pad = (x: number) => String(x).padStart(2, "0");

/** Published course videos: the course-level intro and a lesson → video map. */
export function useCourseVideos(courseId: string | undefined) {
  const q = useQuery({ queryKey: ["course-videos", courseId], enabled: Boolean(courseId), queryFn: () => listCourseVideos(courseId!) });
  return useMemo(() => {
    const list: LearningVideo[] = q.data ?? [];
    return {
      intro: list.find((v) => !v.lesson_id && v.is_published) ?? null,
      byLesson: new Map(list.filter((v) => v.lesson_id && v.is_published).map((v) => [v.lesson_id!, v])),
    };
  }, [q.data]);
}

/** The signed-in student's lesson states (empty for guests). */
export function useLessonStates() {
  const { user } = useAuth();
  const q = useQuery({ queryKey: ["progress", "lessons", user?.id], enabled: Boolean(user), queryFn: () => getMyLessonProgress(user!.id) });
  return useMemo(() => new Map((q.data ?? []).map((p) => [p.lesson_id, p.state])), [q.data]);
}

export function LessonRow({ l, courseSlug, state, video }: {
  l: LessonSummary; courseSlug: string; state?: LessonProgress["state"]; video?: LearningVideo;
}) {
  const { t, lang, n } = useI18n();
  return (
    <li>
      <Link to={`/learn/${courseSlug}/${l.slug}`}
        className="flex items-center gap-4 rounded px-3 py-3 transition-colors hover:bg-ink-700 active:bg-ink-600">
        <span className="w-7 font-mono text-sm text-lime">{n(pad(l.number))}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{pick(l, "title", lang)}</span>
          <span className="block truncate text-xs text-paper/50">{pick(l, "summary", lang)}</span>
        </span>
        {l.is_project && <span className="hidden items-center gap-1 rounded bg-ink-700 px-2 py-0.5 text-xs sm:inline-flex"><Hammer className="size-3" />{t("learn.project")}</span>}
        {video && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded bg-lime/15 px-2 py-0.5 font-mono text-[11px] text-lime" title={t("video.hasVideo")}>
            <Video className="size-3" aria-hidden /><span className="sr-only">{t("video.hasVideo")}</span>{video.duration_seconds ? formatClock(video.duration_seconds) : ""}
          </span>
        )}
        <span className="hidden font-mono text-xs text-paper/40 sm:block">{n(l.estimated_minutes)} {t("common.minutes")}</span>
        {state === "completed" ? <CheckCircle2 className="size-5 shrink-0 text-lime" aria-label={t("learn.completed")} />
          : state === "started" ? <PlayCircle className="size-5 shrink-0 text-paper/60" /> : <Circle className="size-5 shrink-0 text-paper/25" />}
      </Link>
    </li>
  );
}

/** "01–05" style range from a chapter's actual lessons. */
export function lessonRange(lessons: LessonSummary[]): [number, number] {
  const nums = lessons.map((l) => l.number);
  return nums.length ? [Math.min(...nums), Math.max(...nums)] : [0, 0];
}
