import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/i18n";
import { ErrorState, ProgressBar, SectionTitle, Skeleton } from "@/components/ui/misc";
import { getTopicProgress } from "@/services/problems";
import { friendlyError } from "@/lib/errors";
import { cn, pick } from "@/lib/utils";

export default function PracticePage() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const q = useQuery({ queryKey: ["topic-progress", user?.id], queryFn: getTopicProgress });
  // The first topic with unsolved problems is highlighted as "next up" (dark card, slide 10).
  const focus = q.data?.find((x) => x.total > 0 && x.solved < x.total)?.topic_id;
  return (
    <div className="page">
      <SectionTitle title={t("practice.title")} subtitle={t("practice.subtitle")} />
      {q.isLoading ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-36" />)}</div>
        : q.isError ? <ErrorState message={friendlyError(q.error, t)} onRetry={() => q.refetch()} />
        : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {q.data!.map((tp) => {
              const dark = tp.topic_id === focus;
              return (
                <Link key={tp.topic_id} to={`/practice/${tp.slug}`}
                  className={cn("rounded-md p-8 transition-colors", dark ? "bg-ink text-paper hover:bg-ink-800" : "surface hover:border-ink/30")}>
                  <h2 className="font-heading text-[26px] font-bold">{pick(tp, "name", lang)}</h2>
                  <p className={cn("mt-3 font-mono text-sm", dark ? "text-lime" : "text-slate")}>
                    {t("practice.problems", { n: tp.total })} <span aria-hidden className="mx-2">·</span> {t("practice.solved", { n: tp.solved })}
                  </p>
                  <ProgressBar dark={dark} className="mt-8" value={tp.solved} max={tp.total} />
                </Link>
              );
            })}
          </div>
        )}
    </div>
  );
}
