import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Award, CheckCircle2, Circle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/misc";
import { cn } from "@/lib/utils";
import { getMyBestRatios, getMyCertificateProgress, listCourseRequirements } from "@/services/certificates";
import type { CourseRequirement } from "@/types/db";

function Req({ done, children }: { done: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 py-2">
      {done ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-lime" aria-hidden /> : <Circle className="mt-0.5 size-5 shrink-0 text-paper/30" aria-hidden />}
      <span className={cn("text-[15px]", done ? "text-paper" : "text-paper/80")}>{children}</span>
    </li>
  );
}

function ProblemList({ title, items, ratios }: { title: string; items: CourseRequirement[]; ratios: Map<string, number> }) {
  const { t, n } = useI18n();
  if (!items.length) return null;
  return (
    <div>
      <p className="eyebrow mb-2 text-paper/50">{title}</p>
      <ul className="divide-y divide-ink-600 rounded border border-ink-600">
        {items.map((r) => r.problems && (
          <li key={r.problem_id}>
            <Link to={`/problems/${r.problems.slug}`} className="flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-ink-700">
              <span className="min-w-0 flex-1 truncate font-semibold text-paper">{r.problems.title}</span>
              {ratios.has(r.problem_id) ? (
                ratios.get(r.problem_id) === 1
                  ? <span className="font-mono text-xs text-lime">{t("cert.solved")}</span>
                  : <span className="font-mono text-xs text-paper/60">{t("cert.best", { pct: n(Math.floor(ratios.get(r.problem_id)! * 100)) })}</span>
              ) : <span className="font-mono text-xs text-paper/40">—</span>}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Certificate requirements for a course (dark card on the course page). All numbers come from the server. */
export function CourseCertificateCard({ courseId }: { courseId: string }) {
  const { t, n } = useI18n();
  const { user } = useAuth();
  const reqs = useQuery({ queryKey: ["course-requirements", courseId], queryFn: () => listCourseRequirements(courseId) });
  const prog = useQuery({ queryKey: ["certificate-progress", courseId, user?.id], enabled: Boolean(user), queryFn: () => getMyCertificateProgress(courseId) });
  const published = (reqs.data ?? []).filter((r) => r.problems?.status === "published");
  const ids = published.map((r) => r.problem_id);
  const ratios = useQuery({
    queryKey: ["requirement-ratios", courseId, user?.id, ids.join(",")], enabled: Boolean(user) && ids.length > 0,
    queryFn: () => getMyBestRatios(user!.id, ids),
  });

  if (reqs.isLoading || (user && prog.isLoading)) return <Skeleton className="mt-12 h-40 bg-ink-800" />;
  // Guests: only advertise a certificate when the course actually has one configured.
  if (!user) {
    if (!published.some((r) => r.kind === "assessment")) return null;
    return (
      <section className="mt-12 flex flex-wrap items-center gap-4 rounded border border-ink-600 bg-ink-800 p-6 text-paper">
        <Award className="size-7 text-lime" aria-hidden />
        <div className="min-w-0 flex-1"><p className="font-heading text-lg font-bold">{t("cert.courseTitle")}</p><p className="text-sm text-paper/70">{t("cert.signInToEarn")}</p></div>
        <Button asChild variant="outline-dark"><Link to={`/login?next=${encodeURIComponent(window.location.pathname)}`}>{t("nav.signIn")}</Link></Button>
      </section>
    );
  }
  const p = prog.data;
  if (!p) return null;
  if (!p.configured) {
    return <p className="mt-12 inline-flex items-center gap-2 text-sm text-paper/50"><Award className="size-4" aria-hidden />{t("cert.notAvailable")}</p>;
  }

  const practice = published.filter((r) => r.kind === "practice");
  const assessment = published.filter((r) => r.kind === "assessment");
  const pass = p.assessment.passing_score;
  return (
    <section aria-labelledby="course-certificate" className="mt-12 rounded border border-ink-600 bg-ink-800 p-6 text-paper sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Award className="size-7 text-lime" aria-hidden />
          <h2 id="course-certificate" className="font-heading text-2xl font-bold">{t("cert.courseTitle")}</h2>
        </div>
        {p.certificate && (
          <Button asChild><Link to="/profile#certificates">{p.certificate.status === "valid" ? t("cert.viewCertificate") : t("cert.revoked")}</Link></Button>
        )}
      </div>
      {p.certificate?.status === "valid" && (
        <p className="mt-3 inline-flex items-center gap-2 rounded bg-lime/15 px-3 py-1.5 text-sm font-semibold text-lime"><CheckCircle2 className="size-4" />{t("cert.earned")} · {p.certificate.certificate_number}</p>
      )}
      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <ul aria-label={t("cert.courseTitle")}>
          <Req done={p.lessons.done === p.lessons.total}>{t("cert.reqLessons")} <span className="font-mono text-xs text-paper/50">· {n(p.lessons.done)}/{n(p.lessons.total)}</span></Req>
          {(p.quizzes?.total ?? 0) > 0 && (
            <Req done={p.quizzes!.passed === p.quizzes!.total}>{t("cert.reqQuizzes")} <span className="font-mono text-xs text-paper/50">· {n(p.quizzes!.passed)}/{n(p.quizzes!.total)}</span></Req>
          )}
          {p.practice.total > 0 && (
            <Req done={p.practice.done === p.practice.total}>{t("cert.reqPractice")} <span className="font-mono text-xs text-paper/50">· {n(p.practice.done)}/{n(p.practice.total)}</span></Req>
          )}
          {p.assessment.total > 0 && (
            <Req done={p.assessment.passed}>
              {t("cert.reqAssessment", { pass: n(Number(pass)) })}
              <span className="block font-mono text-xs text-paper/50">
                {p.assessment.score === null || p.assessment.attempted === 0 ? t("cert.notAttempted") : t("cert.score", { score: n(Number(p.assessment.score)) })}
              </span>
            </Req>
          )}
          {!p.name_present && <Req done={false}><Link to="/profile/settings" className="underline decoration-lime underline-offset-4">{t("cert.reqName")}</Link></Req>}
        </ul>
        {(practice.length > 0 || assessment.length > 0) && (
          <div className="space-y-5">
            <ProblemList title={t("cert.practiceProblems")} items={practice} ratios={ratios.data ?? new Map()} />
            <ProblemList title={t("cert.assessmentProblems")} items={assessment} ratios={ratios.data ?? new Map()} />
            {assessment.length > 0 && <p className="text-xs text-paper/50">{t("cert.howScored")}</p>}
          </div>
        )}
      </div>
    </section>
  );
}
