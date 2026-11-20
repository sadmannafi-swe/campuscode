import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getAdminStats } from "@/services/admin";
import { ErrorState, PageLoader } from "@/components/ui/misc";
import { useI18n } from "@/i18n";
import { friendlyError } from "@/lib/errors";
import { relativeTime } from "@/lib/utils";
import { VerdictText } from "../problems/SubmissionList";
import type { Verdict } from "@/types/db";

export default function AdminDashboard() {
  const { t, lang } = useI18n();
  const q = useQuery({ queryKey: ["admin", "stats"], queryFn: getAdminStats, refetchInterval: 60_000 });
  if (q.isLoading) return <PageLoader />;
  if (q.isError) return <ErrorState message={friendlyError(q.error, t)} onRetry={() => q.refetch()} />;
  const s = q.data!;
  const acc = s.total_submissions ? Math.round((s.accepted_submissions / s.total_submissions) * 100) : 0;
  const cards: [string, number | string, string?][] = [
    ["Total users", s.total_users], ["Active (7 days)", s.active_users_7d], ["Suspended", s.suspended_users],
    ["Published problems", s.total_problems], ["Awaiting review", s.pending_problems, "/admin/problems?status=pending_review"],
    ["Open reports", s.open_reports, "/admin/reports"], ["Submissions", s.total_submissions], ["Accepted", `${s.accepted_submissions} (${acc}%)`],
    ["Code runs (7 days)", s.runs_7d], ["Courses", s.courses], ["Published lessons", s.published_lessons], ["Lesson completions", s.lesson_completions],
  ];
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-extrabold">Dashboard</h1>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {cards.map(([label, value, to]) => {
          const inner = (<><p className="font-heading text-3xl font-extrabold">{value}</p><p className="mt-1 text-sm text-slate">{label}</p></>);
          return to ? <Link key={label} to={to} className="surface p-5 hover:border-ink/40">{inner}</Link> : <div key={label} className="surface p-5">{inner}</div>;
        })}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="surface p-5">
          <h2 className="mb-3 font-heading text-lg font-bold">Recent submissions</h2>
          {s.recent_submissions.length === 0 ? <p className="text-sm text-slate">No submissions yet.</p> : (
            <ul className="divide-y divide-line text-sm">
              {s.recent_submissions.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0 truncate"><span className="font-semibold">@{r.username}</span> · {r.problem_title}</span>
                  <span className="flex shrink-0 items-center gap-3"><VerdictText verdict={r.verdict as Verdict} /><span className="mono-meta">{relativeTime(r.created_at, lang)}</span></span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="surface p-5">
          <h2 className="mb-3 font-heading text-lg font-bold">Recent sign-ups</h2>
          {s.recent_signups.length === 0 ? <p className="text-sm text-slate">No users yet.</p> : (
            <ul className="divide-y divide-line text-sm">
              {s.recent_signups.map((u) => (
                <li key={u.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="truncate"><span className="font-semibold">{u.full_name || u.username}</span> <span className="text-slate">@{u.username}</span></span>
                  <span className="mono-meta">{relativeTime(u.created_at, lang)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
