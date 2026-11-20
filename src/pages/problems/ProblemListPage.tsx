import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { DifficultyBadge, EmptyState, ErrorState, SectionTitle, Skeleton } from "@/components/ui/misc";
import { getMyProgress, listPublishedProblems, listTopics } from "@/services/problems";
import { friendlyError } from "@/lib/errors";
import { cn, pick } from "@/lib/utils";

const DIFF_ORDER = { easy: 0, medium: 1, hard: 2 } as const;

export default function ProblemListPage() {
  const { t, lang, n } = useI18n();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const topic = params.get("topic") ?? "";
  const difficulty = params.get("difficulty") ?? "";
  const status = params.get("status") ?? "";
  const sort = params.get("sort") ?? "default";
  const source = params.get("source") ?? "";

  const set = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v); else next.delete(k);
    setParams(next, { replace: true });
  };

  const problems = useQuery({ queryKey: ["problems", "published"], queryFn: listPublishedProblems });
  const topics = useQuery({ queryKey: ["topics"], queryFn: listTopics, staleTime: 600_000 });
  const progress = useQuery({ queryKey: ["progress", "problems", user?.id], queryFn: () => getMyProgress(user!.id), enabled: Boolean(user) });

  const progressMap = useMemo(() => new Map((progress.data ?? []).map((p) => [p.problem_id, p])), [progress.data]);
  const topicMap = useMemo(() => new Map((topics.data ?? []).map((tp) => [tp.id, tp])), [topics.data]);
  const topicId = topics.data?.find((tp) => tp.slug === topic)?.id;

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    let list = (problems.data ?? []).filter((p) => {
      if (term && !p.title.toLowerCase().includes(term) && !(p.title_bn ?? "").includes(term)) return false;
      if (topic && p.topic_id !== topicId) return false;
      if (difficulty && p.difficulty !== difficulty) return false;
      if (source === "official" && !p.is_official) return false;
      if (source === "community" && p.is_official) return false;
      const pr = progressMap.get(p.id);
      if (status === "solved" && !pr?.solved_at) return false;
      if (status === "unsolved" && pr?.solved_at) return false;
      if (status === "attempted" && !(pr && !pr.solved_at)) return false;
      return true;
    });
    if (sort === "newest") list = [...list].sort((a, b) => b.created_at.localeCompare(a.created_at));
    if (sort === "easiest") list = [...list].sort((a, b) => DIFF_ORDER[a.difficulty] - DIFF_ORDER[b.difficulty]);
    if (sort === "acceptance") {
      const rate = (p: { accepted_count: number; submission_count: number }) => (p.submission_count ? p.accepted_count / p.submission_count : -1);
      list = [...list].sort((a, b) => rate(b) - rate(a));
    }
    return list;
  }, [problems.data, q, topic, topicId, difficulty, status, sort, source, progressMap]);

  const pill = (active: boolean) => cn("h-10 rounded px-4 text-sm font-semibold transition-colors",
    active ? "bg-lime text-ink" : "bg-paper text-ink hover:bg-line");

  return (
    <div className="page">
      <SectionTitle title={t("problems.title")} subtitle={t("problems.subtitle")}
        action={user && <Button asChild variant="ink"><Link to="/problems/new"><Plus /> {t("problems.create")}</Link></Button>} />

      <div className="surface p-4 sm:p-8">
        {/* Filters */}
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate" aria-hidden />
            <Input type="search" placeholder={t("problems.search")} value={q} onChange={(e) => set("q", e.target.value)} className="pl-9" aria-label={t("common.search")} />
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="w-full sm:w-52">
              <NativeSelect value={topic} onChange={(e) => set("topic", e.target.value)} aria-label={t("editor.topic")} className="h-10 border-transparent bg-paper text-sm font-semibold">
                <option value="">{t("problems.allTopics")}</option>
                {(topics.data ?? []).map((tp) => <option key={tp.id} value={tp.slug}>{pick(tp, "name", lang)}</option>)}
              </NativeSelect>
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label={t("editor.difficulty")}>
              {(["easy", "medium", "hard"] as const).map((d) => (
                <button key={d} className={pill(difficulty === d)} aria-pressed={difficulty === d} onClick={() => set("difficulty", difficulty === d ? "" : d)}>
                  {t(`common.${d}`)}
                </button>
              ))}
            </div>
            {user && (
              <div className="flex flex-wrap gap-2" role="group" aria-label={t("common.status")}>
                {(["unsolved", "attempted", "solved"] as const).map((s) => (
                  <button key={s} className={pill(status === s)} aria-pressed={status === s} onClick={() => set("status", status === s ? "" : s)}>
                    {t(`problems.${s}`)}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2 sm:ml-auto">
              <NativeSelect value={source} onChange={(e) => set("source", e.target.value)} aria-label="Source" className="h-10 w-36 border-transparent bg-paper text-sm font-semibold">
                <option value="">{t("common.all")}</option>
                <option value="official">{t("problems.official")}</option>
                <option value="community">{t("problems.community")}</option>
              </NativeSelect>
              <NativeSelect value={sort} onChange={(e) => set("sort", e.target.value)} aria-label="Sort" className="h-10 w-44 border-transparent bg-paper text-sm font-semibold">
                <option value="default">{t("problems.sortDefault")}</option>
                <option value="easiest">{t("problems.sortEasiest")}</option>
                <option value="newest">{t("problems.sortNewest")}</option>
                <option value="acceptance">{t("problems.sortAcceptance")}</option>
              </NativeSelect>
            </div>
          </div>
        </div>

        {/* List */}
        <div className="mt-6 border-t border-line">
          {problems.isLoading ? (
            <div className="space-y-3 pt-4">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14" />)}</div>
          ) : problems.isError ? (
            <div className="pt-6"><ErrorState message={friendlyError(problems.error, t)} onRetry={() => problems.refetch()} /></div>
          ) : rows.length === 0 ? (
            <div className="pt-6"><EmptyState title={t("problems.empty")} /></div>
          ) : (
            <ul>
              {rows.map((p, i) => {
                const pr = progressMap.get(p.id);
                const tp = p.topic_id ? topicMap.get(p.topic_id) : undefined;
                const acc = p.submission_count ? Math.round((p.accepted_count / p.submission_count) * 100) : null;
                return (
                  <li key={p.id} className="border-b border-line">
                    <Link to={`/problems/${p.slug}`} className="group grid grid-cols-[32px_1fr_auto] items-center gap-x-3 gap-y-1 py-4 sm:grid-cols-[48px_1fr_150px_110px_110px] sm:py-6">
                      <span className="font-mono text-sm text-slate">{n(String(i + 1).padStart(2, "0"))}</span>
                      <span className="min-w-0">
                        <span className="block truncate font-heading text-base font-bold group-hover:underline group-hover:decoration-lime group-hover:decoration-2 group-hover:underline-offset-4 sm:text-lg">
                          {lang === "bn" && p.title_bn ? p.title_bn : p.title}
                        </span>
                        <span className="mt-0.5 flex items-center gap-2 text-xs text-slate sm:hidden">
                          {tp && pick(tp, "name", lang)}
                          {!p.is_official && <span className="inline-flex items-center gap-1"><Users className="size-3" />{t("problems.community")}</span>}
                        </span>
                        <span className="hidden items-center gap-2 font-mono text-xs text-slate sm:flex">
                          {acc !== null && <>{t("problems.acceptance")} {n(acc)}% · </>}{t("problems.solvers", { n: p.solver_count })}
                          {!p.is_official && <span className="inline-flex items-center gap-1"><Users className="size-3" />{t("problems.community")}</span>}
                        </span>
                      </span>
                      <span className="hidden text-[15px] text-slate sm:block">{tp ? pick(tp, "name", lang) : "—"}</span>
                      <span className="row-span-2 sm:row-span-1"><DifficultyBadge difficulty={p.difficulty} /></span>
                      <span className={cn("col-start-2 font-mono text-xs sm:col-start-auto sm:text-sm", pr?.solved_at ? "text-solved" : "text-slate")}>
                        {pr?.solved_at ? t("problems.solved") : pr ? t("problems.attempted") : t("problems.open")}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
