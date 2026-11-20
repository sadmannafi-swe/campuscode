import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PenSquare, Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Badge, DifficultyBadge, EmptyState, ErrorState, SectionTitle, Skeleton } from "@/components/ui/misc";
import { listMyProblems } from "@/services/problems";
import { friendlyError } from "@/lib/errors";
import { relativeTime } from "@/lib/utils";
import type { ProblemStatus } from "@/types/db";

const STATUS_TONE: Record<ProblemStatus, "neutral" | "lime" | "warning" | "error" | "outline"> = {
  draft: "outline", pending_review: "warning", published: "lime", rejected: "error", removed: "error",
};

export default function MyProblemsPage() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const q = useQuery({ queryKey: ["problems", "mine", user!.id], queryFn: () => listMyProblems(user!.id) });
  const label = (s: ProblemStatus) => s === "draft" ? t("problems.statusPrivate") : s === "pending_review" ? t("problems.pendingReview")
    : s === "published" ? t("problems.statusPublished") : s === "rejected" ? t("problems.rejected") : t("problems.removed");
  return (
    <div className="page">
      <SectionTitle title={t("problems.mineTitle")} action={<Button asChild variant="ink"><Link to="/problems/new"><Plus /> {t("problems.create")}</Link></Button>} />
      {q.isLoading ? <Skeleton className="h-40" /> : q.isError ? <ErrorState message={friendlyError(q.error, t)} onRetry={() => q.refetch()} />
        : !q.data?.length ? (
          <EmptyState icon={<PenSquare className="size-6" />} title={t("problems.mineEmpty")}
            action={<Button asChild variant="ink"><Link to="/problems/new"><Plus /> {t("problems.create")}</Link></Button>} />
        ) : (
          <ul className="surface divide-y divide-line">
            {q.data.map((p) => (
              <li key={p.id}>
                <Link to={`/problems/${p.slug}`} className="flex flex-wrap items-center gap-3 px-5 py-4 hover:bg-paper/60">
                  <span className="min-w-0 flex-1 truncate font-heading font-bold">{p.title}</span>
                  <DifficultyBadge difficulty={p.difficulty} />
                  <Badge tone={STATUS_TONE[p.status]}>{label(p.status)}</Badge>
                  <span className="mono-meta">{relativeTime(p.created_at, lang)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
    </div>
  );
}
