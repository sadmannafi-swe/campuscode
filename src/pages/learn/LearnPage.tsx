import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Target } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";
import { ErrorState, ProgressBar, SectionTitle, Skeleton } from "@/components/ui/misc";
import { getCourseProgress, listCourses } from "@/services/courses";
import { friendlyError } from "@/lib/errors";
import { cn, pick } from "@/lib/utils";

export default function LearnPage() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const courses = useQuery({ queryKey: ["courses"], queryFn: listCourses });
  const progress = useQuery({ queryKey: ["progress", "courses", user?.id], queryFn: getCourseProgress, enabled: Boolean(user) });

  return (
    <div className="page">
      <SectionTitle title={t("learn.title")} subtitle={t("learn.subtitle")}
        action={<Button asChild variant="outline"><Link to="/practice"><Target /> {t("nav.practice")}</Link></Button>} />
      {courses.isLoading ? <div className="grid gap-5 md:grid-cols-2"><Skeleton className="h-64" /><Skeleton className="h-64" /></div>
        : courses.isError ? <ErrorState message={friendlyError(courses.error, t)} onRetry={() => courses.refetch()} />
        : (
          <div className="grid gap-5 md:grid-cols-[1.2fr_1fr]">
            {(courses.data ?? []).map((c, i) => {
              const p = progress.data?.find((x) => x.course_id === c.id);
              const total = c.lessons[0]?.count ?? 0;
              const primary = i === 0;
              return (
                <Link key={c.id} to={`/learn/${c.slug}`}
                  className={cn("group flex flex-col rounded-md p-6 transition-colors sm:p-8",
                    primary ? "bg-ink text-paper hover:bg-ink-800" : "surface hover:border-ink/30")}>
                  <span className={cn("font-mono text-xs uppercase tracking-wider", primary ? "text-lime" : "text-slate")}>
                    {c.language === "c" ? "#include <stdio.h>" : "def learn():"}
                  </span>
                  <h2 className="mt-5 text-3xl font-extrabold">{pick(c, "title", lang)}</h2>
                  <p className={cn("mt-1 text-sm font-semibold", primary ? "text-paper/70" : "text-slate")}>{pick(c, "level", lang)} · {t("learn.lessons", { n: total })}</p>
                  <p className={cn("mt-4 text-[15px]", primary ? "text-paper/80" : "text-ink/80")}>{pick(c, "description", lang)}</p>
                  <div className="mt-auto pt-8">
                    {user && p && (
                      <>
                        <ProgressBar dark={primary} value={p.completed} max={p.total} />
                        <p className={cn("mt-2 font-mono text-xs", primary ? "text-paper/60" : "text-slate")}>{t("learn.progress", { done: p.completed, total: p.total })}</p>
                      </>
                    )}
                    <span className={cn("mt-4 inline-flex items-center gap-2 text-sm font-bold", primary ? "text-lime" : "text-ink")}>
                      {p && p.completed > 0 ? t("learn.continue") : t("learn.start")} <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
    </div>
  );
}
