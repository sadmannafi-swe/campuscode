import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BookOpen } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/i18n";
import { DifficultyBadge, EmptyState, ErrorState, PageLoader, ProgressBar, SectionTitle } from "@/components/ui/misc";
import { getMyProgress, listPublishedProblems, listTopics } from "@/services/problems";
import { supabase } from "@/lib/supabase";
import { friendlyError } from "@/lib/errors";
import { cn, pick } from "@/lib/utils";
import type { Difficulty } from "@/types/db";
import NotFoundPage from "../NotFoundPage";

export default function PracticeTopicPage() {
  const { topicSlug } = useParams();
  const { t, lang, n } = useI18n();
  const { user } = useAuth();
  const [diff, setDiff] = useState<Difficulty | "">("");
  const topics = useQuery({ queryKey: ["topics"], queryFn: listTopics, staleTime: 600_000 });
  const problems = useQuery({ queryKey: ["problems", "published"], queryFn: listPublishedProblems });
  const progress = useQuery({ queryKey: ["progress", "problems", user?.id], queryFn: () => getMyProgress(user!.id), enabled: Boolean(user) });
  const topic = topics.data?.find((x) => x.slug === topicSlug);
  const lessons = useQuery({
    queryKey: ["topic-lessons", topic?.id],
    enabled: Boolean(topic),
    queryFn: async () => {
      const { data, error } = await supabase.from("lessons").select("slug, number, title_en, title_bn, courses(slug)").eq("practice_topic_id", topic!.id).order("number");
      if (error) throw error;
      return data as unknown as { slug: string; number: number; title_en: string; title_bn: string; courses: { slug: string } }[];
    },
  });
  const solved = useMemo(() => new Set((progress.data ?? []).filter((p) => p.solved_at).map((p) => p.problem_id)), [progress.data]);
  const list = (problems.data ?? []).filter((p) => p.topic_id === topic?.id);
  const shown = list.filter((p) => !diff || p.difficulty === diff);

  if (topics.isLoading || problems.isLoading) return <PageLoader />;
  if (problems.isError) return <div className="page"><ErrorState message={friendlyError(problems.error, t)} onRetry={() => problems.refetch()} /></div>;
  if (!topic) return <NotFoundPage />;
  const solvedCount = list.filter((p) => solved.has(p.id)).length;

  return (
    <div className="page">
      <Link to="/practice" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate hover:text-ink"><ArrowLeft className="size-4" />{t("nav.practice")}</Link>
      <SectionTitle title={pick(topic, "name", lang)} subtitle={pick(topic, "description", lang)} />
      <div className="mb-6 max-w-sm">
        <ProgressBar value={solvedCount} max={list.length} />
        <p className="mt-2 font-mono text-xs text-slate">{t("practice.problems", { n: list.length })} · {t("practice.solved", { n: solvedCount })}</p>
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-[1fr_300px]">
        <div className="surface p-4 sm:p-6">
          <div className="mb-4 flex flex-wrap gap-2">
            {(["", "easy", "medium", "hard"] as const).map((d) => (
              <button key={d || "all"} onClick={() => setDiff(d)} aria-pressed={diff === d}
                className={cn("h-9 rounded px-4 text-sm font-semibold", diff === d ? "bg-lime text-ink" : "bg-paper hover:bg-line")}>
                {d ? t(`common.${d}`) : t("common.all")}
              </button>
            ))}
          </div>
          {shown.length === 0 ? <EmptyState title={t("practice.empty")} /> : (
            <ul className="divide-y divide-line border-t border-line">
              {shown.map((p, i) => (
                <li key={p.id}>
                  <Link to={`/problems/${p.slug}`} className="flex items-center gap-4 py-4 hover:bg-paper/60 sm:px-2">
                    <span className="w-6 font-mono text-sm text-slate">{n(String(i + 1).padStart(2, "0"))}</span>
                    <span className="min-w-0 flex-1 truncate font-heading font-bold">{lang === "bn" && p.title_bn ? p.title_bn : p.title}</span>
                    <DifficultyBadge difficulty={p.difficulty} />
                    <span className={cn("hidden w-20 text-right font-mono text-sm sm:block", solved.has(p.id) ? "text-solved" : "text-slate")}>
                      {solved.has(p.id) ? t("problems.solved") : t("problems.open")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        {(lessons.data ?? []).length > 0 && (
          <aside className="surface p-5">
            <h2 className="mb-3 flex items-center gap-2 font-heading text-base font-bold"><BookOpen className="size-4" />{t("practice.relatedLessons")}</h2>
            <ul className="space-y-1">
              {lessons.data!.map((l) => (
                <li key={l.slug}><Link to={`/learn/${l.courses.slug}/${l.slug}`} className="flex gap-3 rounded px-2 py-1.5 text-sm hover:bg-paper">
                  <span className="font-mono text-xs text-slate">{n(String(l.number).padStart(2, "0"))}</span>{pick(l, "title", lang)}
                </Link></li>
              ))}
            </ul>
          </aside>
        )}
      </div>
    </div>
  );
}
