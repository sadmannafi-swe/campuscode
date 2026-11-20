import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight, BookOpen, CheckCircle2, Circle, Code2, Flame, Megaphone, Play, Target, Terminal,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";
import { DifficultyBadge, ErrorState, ProgressBar, Skeleton } from "@/components/ui/misc";
import { listSnippets, listExecutionHistory } from "@/services/snippets";
import { getStats, listActiveAnnouncements } from "@/services/profile";
import { getCourseProgress, getLessonById, listCourses } from "@/services/courses";
import { getDailyProblem, getTopicProgress, listTopics } from "@/services/problems";
import { friendlyError } from "@/lib/errors";
import { cn, langLabel, pick, relativeTime } from "@/lib/utils";
import { isSupabaseConfigured } from "@/lib/supabase";

// ============================================================ Guest landing (slide 1)
const HERO_CODE: [string, string][] = [
  ["01", "#include <stdio.h>"], ["02", ""], ["03", "int main() {"], ["04", "  int n;"],
  ["05", "  scanf(\"%d\", &n);"], ["06", "  printf(\"%d\\n\", n * 2);"], ["07", "  return 0;"], ["08", "}"],
];

function Landing() {
  const { t } = useI18n();
  return (
    <div>
      <section className="relative overflow-hidden bg-ink text-paper">
        <div className="absolute inset-y-0 left-0 w-1.5 bg-lime sm:w-2.5" aria-hidden />
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-14 sm:px-10 lg:grid-cols-[1.05fr_1fr] lg:py-24">
          <div>
            <h1 className="text-[44px] font-extrabold leading-[1.02] sm:text-6xl lg:text-7xl">
              {t("landing.title1")}<br />{t("landing.title2")}
            </h1>
            <p className="mt-6 max-w-md text-lg text-paper/80">{t("landing.lead")}</p>
            <div className="mt-10 flex flex-wrap items-center gap-6">
              <Button asChild size="lg" className="px-7 text-base"><Link to="/ide">{t("landing.openIde")} <ArrowRight /></Link></Button>
              <Link to="/problems" className="text-[15px] font-semibold text-paper hover:text-lime">{t("landing.browse")}</Link>
            </div>
            <p className="mt-8 font-mono text-xs text-paper/50">{t("landing.free")}</p>
          </div>
          <div className="rounded-md border border-ink-600 bg-ink-800" aria-label="Example program">
            <div className="flex items-center justify-between border-b border-ink-700 bg-ink-700/60 px-6 py-3">
              <span className="font-mono text-[15px]">main.c</span>
              <Link to="/ide" className="inline-flex items-center gap-1.5 rounded bg-lime px-4 py-1.5 text-sm font-bold text-ink hover:bg-lime-600">
                <Play className="size-3.5 fill-current" /> Run
              </Link>
            </div>
            <pre className="overflow-x-auto px-6 py-5 font-mono text-[13px] leading-8 sm:text-[15px]">
              {HERO_CODE.map(([n, c], i) => (
                <div key={n}><span className={i === 0 ? "text-lime" : "text-paper/80"}>{n}</span>{"  "}<span className={i === 0 ? "text-lime" : "text-paper"}>{c}</span></div>
              ))}
            </pre>
            <div className="mx-5 mb-5 border border-ink-600 bg-ink px-6 py-5">
              <p className="eyebrow mb-3">Output</p>
              <p className="font-mono text-[15px] leading-7 text-lime">42<br />Process finished in 0.08s</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-6 py-14 sm:px-10 md:grid-cols-3">
        {[
          { icon: Terminal, title: t("landing.f1Title"), body: t("landing.f1Body"), to: "/ide" },
          { icon: BookOpen, title: t("landing.f2Title"), body: t("landing.f2Body"), to: "/learn/c-programming" },
          { icon: Target, title: t("landing.f3Title"), body: t("landing.f3Body"), to: "/problems" },
        ].map(({ icon: Icon, title, body, to }) => (
          <Link key={title} to={to} className="surface group p-6 transition-colors hover:border-ink/30">
            <Icon className="size-5 text-ink" aria-hidden />
            <h2 className="mt-4 text-lg font-bold">{title}</h2>
            <p className="mt-2 text-sm text-slate">{body}</p>
            <ArrowRight className="mt-4 size-4 text-slate transition-transform group-hover:translate-x-1 group-hover:text-ink" />
          </Link>
        ))}
      </section>
    </div>
  );
}

// ============================================================ Dashboard (slide 12)
function StatTile({ icon: Icon, label, value }: { icon: typeof Flame; label: string; value: string }) {
  return (
    <div className="surface flex items-center gap-3 p-4">
      <span className="flex size-9 items-center justify-center rounded bg-paper"><Icon className="size-4" aria-hidden /></span>
      <div>
        <p className="font-heading text-xl font-extrabold leading-none">{value}</p>
        <p className="mt-1 text-xs text-slate">{label}</p>
      </div>
    </div>
  );
}

function Dashboard() {
  const { t, lang, n } = useI18n();
  const { user, profile } = useAuth();
  const uid = user!.id;

  const stats = useQuery({ queryKey: ["stats", uid], queryFn: () => getStats(uid) });
  const snippets = useQuery({ queryKey: ["snippets", uid], queryFn: () => listSnippets(uid, 20) });
  const courses = useQuery({ queryKey: ["courses"], queryFn: listCourses });
  const progress = useQuery({ queryKey: ["progress", "courses", uid], queryFn: getCourseProgress });
  const daily = useQuery({ queryKey: ["daily-problem"], queryFn: getDailyProblem });
  const topics = useQuery({ queryKey: ["topic-progress", uid], queryFn: getTopicProgress });
  const topicList = useQuery({ queryKey: ["topics"], queryFn: listTopics, staleTime: 600_000 });
  const history = useQuery({ queryKey: ["history", uid], queryFn: () => listExecutionHistory(uid, 5) });
  const announcements = useQuery({ queryKey: ["announcements"], queryFn: listActiveAnnouncements });

  const cCourse = courses.data?.find((c) => c.slug === "c-programming");
  const pyCourse = courses.data?.find((c) => c.slug === "python-programming");
  const cProg = progress.data?.find((p) => p.course_id === cCourse?.id);
  const lastLesson = useQuery({
    queryKey: ["lesson-by-id", cProg?.last_lesson_id],
    enabled: Boolean(cProg?.last_lesson_id),
    queryFn: () => getLessonById(cProg!.last_lesson_id!),
  });
  const recent = snippets.data?.[0];
  const s = stats.data;
  const isNew = s && s.total_runs === 0 && s.lessons_completed === 0 && s.total_submissions === 0;
  const dailyTopic = topicList.data?.find((x) => x.id === daily.data?.topic_id);
  const recommended = (topics.data ?? []).filter((x) => x.total > 0 && x.solved < x.total).slice(0, 4);
  const firstName = (profile?.full_name || profile?.username || "").split(" ")[0];

  return (
    <div className="page">
      <div className="mb-8">
        <h1 className="text-[28px] font-extrabold leading-tight sm:text-4xl">{t("home.greeting", { name: firstName })}</h1>
        <p className="mt-2 text-slate">{t("home.subtitle")}</p>
      </div>

      {(announcements.data ?? []).map((a) => (
        <div key={a.id} className="mb-4 flex items-start gap-3 rounded-md border border-ink/10 bg-lime/30 px-4 py-3 text-sm">
          <Megaphone className="mt-0.5 size-4 shrink-0" aria-hidden />
          <div>
            <p className="font-semibold">{pick(a, "title", lang)}</p>
            {pick(a, "body", lang) && <p className="text-ink/80">{pick(a, "body", lang)}</p>}
            {a.link && <a href={a.link} className="font-semibold underline underline-offset-2">{a.link}</a>}
          </div>
        </div>
      ))}

      {isNew && (
        <section className="surface mb-6 p-5">
          <h2 className="font-heading text-lg font-bold">{t("home.onboardTitle")}</h2>
          <ol className="mt-3 grid gap-2 sm:grid-cols-3">
            {[
              { done: (s?.total_runs ?? 0) > 0, label: t("home.onboard1"), to: "/ide" },
              { done: (s?.lessons_completed ?? 0) > 0, label: t("home.onboard2"), to: "/learn/c-programming" },
              { done: (s?.problems_solved ?? 0) > 0, label: t("home.onboard3"), to: "/problems" },
            ].map((step) => (
              <li key={step.label}>
                <Link to={step.to} className="flex items-center gap-2 rounded border border-line px-3 py-2.5 text-sm hover:bg-paper">
                  {step.done ? <CheckCircle2 className="size-4 text-success" /> : <Circle className="size-4 text-slate" />} {step.label}
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        {/* Recent code */}
        <section className="rounded-md bg-ink p-6 text-paper sm:p-8">
          <p className="eyebrow">{t("home.recentCode")}</p>
          {snippets.isLoading ? <Skeleton className="mt-6 h-16 bg-ink-700" /> : snippets.isError ? (
            <p className="mt-6 text-sm text-paper/70">{friendlyError(snippets.error, t)}</p>
          ) : recent ? (
            <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate font-heading text-2xl font-bold">{recent.title}</p>
                <p className="mt-2 font-mono text-sm text-lime">{t("home.edited", { time: relativeTime(recent.updated_at, lang) })}</p>
              </div>
              <Button asChild className="px-8"><Link to={`/ide?snippet=${recent.id}`}>{t("home.resume")}</Link></Button>
            </div>
          ) : (
            <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="font-heading text-xl font-bold">{t("home.noRecent")}</p>
                <p className="mt-1 text-sm text-paper/60">{t("home.noRecentBody")}</p>
              </div>
              <Button asChild><Link to="/ide"><Code2 /> {t("home.openIde")}</Link></Button>
            </div>
          )}
        </section>

        {/* Continue learning */}
        <section className="surface p-6 sm:p-8">
          <p className="eyebrow">{t("home.continueLearning")}</p>
          {courses.isLoading || progress.isLoading ? <Skeleton className="mt-6 h-12" /> : cCourse ? (
            <Link to={lastLesson.data ? `/learn/c-programming/${lastLesson.data.slug}` : "/learn/c-programming"} className="group mt-6 block">
              <p className="font-heading text-2xl font-bold group-hover:underline group-hover:decoration-lime group-hover:decoration-2 group-hover:underline-offset-4">
                {lastLesson.data
                  ? `${langLabel("c")} · ${t("home.lessonOf", { n: lastLesson.data.number })}`
                  : t("home.startLearning")}
              </p>
              {lastLesson.data && <p className="mt-1 truncate text-sm text-slate">{pick(lastLesson.data, "title", lang)}</p>}
              <ProgressBar className="mt-5" value={cProg?.completed ?? 0} max={cProg?.total || cCourse.lessons[0]?.count || 1} />
              <p className="mt-2 font-mono text-xs text-slate">{t("learn.progress", { done: cProg?.completed ?? 0, total: cProg?.total ?? cCourse.lessons[0]?.count ?? 0 })}</p>
            </Link>
          ) : <p className="mt-6 text-sm text-slate">—</p>}
        </section>
      </div>

      {/* Daily problem */}
      <section className="surface mt-5 flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div className="min-w-0">
          <p className="eyebrow">{t("home.dailyProblem")}</p>
          {daily.isLoading ? <Skeleton className="mt-4 h-8 w-64" /> : daily.data ? (
            <>
              <p className="mt-4 font-heading text-2xl font-bold">{lang === "bn" && daily.data.title_bn ? daily.data.title_bn : daily.data.title}</p>
              <div className="mt-2 flex items-center gap-2">
                <DifficultyBadge difficulty={daily.data.difficulty} />
                {dailyTopic && <span className="mono-meta">{pick(dailyTopic, "name", lang)}</span>}
              </div>
            </>
          ) : <p className="mt-4 text-sm text-slate">{t("problems.empty")}</p>}
        </div>
        {daily.data && (
          <Button asChild variant="ink" size="lg" className="px-10"><Link to={`/problems/${daily.data.slug}`}>{t("home.startSolving")}</Link></Button>
        )}
      </section>

      {/* Stats */}
      <section className="mt-8">
        <h2 className="mb-3 font-heading text-lg font-bold">{t("home.stats")}</h2>
        {stats.isError ? <ErrorState message={friendlyError(stats.error, t)} onRetry={() => stats.refetch()} /> : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatTile icon={Target} label={t("home.solved")} value={n(s?.problems_solved ?? 0)} />
            <StatTile icon={BookOpen} label={t("home.lessons")} value={n(s?.lessons_completed ?? 0)} />
            <StatTile icon={Flame} label={t("home.streak")} value={n(s?.current_streak ?? 0)} />
            <StatTile icon={Play} label={t("home.runs")} value={n(s?.total_runs ?? 0)} />
          </div>
        )}
      </section>

      <div className="mt-8 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        {/* Recommended topics */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-heading text-lg font-bold">{t("home.recommended")}</h2>
            <Link to="/practice" className="text-sm font-semibold text-slate hover:text-ink">{t("common.viewAll")}</Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {topics.isLoading && [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
            {recommended.map((tp, i) => (
              <Link key={tp.topic_id} to={`/practice/${tp.slug}`}
                className={cn("rounded-md p-5 transition-colors", i === 0 ? "bg-ink text-paper hover:bg-ink-800" : "surface hover:border-ink/30")}>
                <p className="font-heading text-lg font-bold">{pick(tp, "name", lang)}</p>
                <p className={cn("mt-1 font-mono text-xs", i === 0 ? "text-lime" : "text-slate")}>
                  {t("practice.problems", { n: tp.total })} · {t("practice.solved", { n: tp.solved })}
                </p>
                <ProgressBar className="mt-4" dark={i === 0} value={tp.solved} max={tp.total} />
              </Link>
            ))}
          </div>
        </section>

        <div className="space-y-5">
          {/* Python entry */}
          {pyCourse && (
            <section className="rounded-md border border-ink-600 bg-ink-800 p-6 text-paper">
              <p className="font-mono text-xs text-lime">def next_step():</p>
              <h2 className="mt-2 font-heading text-lg font-bold">{t("home.pythonTitle")}</h2>
              <p className="mt-1 text-sm text-paper/70">{t("home.pythonBody")}</p>
              <Button asChild variant="outline-dark" size="sm" className="mt-4"><Link to="/learn/python-programming">{t("home.pythonCta")} <ArrowRight /></Link></Button>
            </section>
          )}
          {/* Recent activity */}
          <section className="surface p-5">
            <h2 className="mb-3 font-heading text-base font-bold">{t("home.activity")}</h2>
            {history.isLoading ? <Skeleton className="h-20" /> : (history.data ?? []).length === 0 ? (
              <p className="text-sm text-slate">{t("home.noActivity")}</p>
            ) : (
              <ul className="divide-y divide-line">
                {history.data!.map((h) => (
                  <li key={h.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="min-w-0 truncate">
                      <span className="font-mono text-xs text-slate">{langLabel(h.language)}</span>{" "}
                      {h.problems ? h.problems.title : t(h.kind === "submit" ? "snippets.submit" : h.kind === "samples" ? "snippets.samples" : "snippets.run")}
                      <span className={cn("ml-2 font-mono text-xs", /accept|passed/i.test(h.status) ? "text-success" : "text-slate")}>{h.status.replace(/_/g, " ")}</span>
                    </span>
                    <span className="mono-meta shrink-0">{relativeTime(h.created_at, lang)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { user, loading } = useAuth();
  if (loading && isSupabaseConfigured) return <div className="page"><Skeleton className="h-64" /></div>;
  return user ? <Dashboard /> : <Landing />;
}
