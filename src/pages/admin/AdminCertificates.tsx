import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Copy, Download, Eye, Plus, Search, ShieldX, Trash2, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Badge, EmptyState, ErrorState, PageLoader, Switch } from "@/components/ui/misc";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { friendlyError } from "@/lib/errors";
import { formatDate } from "@/lib/utils";
import {
  adminAddRequirement, adminCertificateCourses, adminCertificateDetail, adminGetCourseSettings, adminIssueEligible,
  adminListCertificates, adminPublishedProblems, adminRemoveRequirement, adminRevokeCertificate, adminSaveCourseSettings,
  adminUpdateRequirement, listCourseRequirements, openCertificatePdf, verificationUrl,
  type AdminCertificateCourse, type AdminCertificateRow, type CertificateFilters,
} from "@/services/certificates";
import type { RequirementKind } from "@/types/db";

const MISSING: Record<string, string> = {
  certificates_disabled: "Certificates are turned off for this course",
  course_unpublished: "The course is not published",
  no_published_lessons: "The course has no published lessons",
  no_verified_requirement: "No server-verified requirement: add module quizzes or final-assessment problems",
  no_practice_requirements: "No required practice problems",
  no_final_assessment: "No final-assessment problems",
};

const EVENT_LABEL: Record<string, string> = {
  queued: "Course completed, PDF queued", issued: "Issued (PDF stored, student notified)", pdf_generated: "PDF generated", pdf_failed: "PDF generation failed",
  revoked: "Revoked", issue_failed: "Issuance error",
};

// ---------------------------------------------------------------- issued certificates
function CertificateList({ courses }: { courses: AdminCertificateCourse[] }) {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<CertificateFilters>({ search: "", courseId: "", status: "", from: "", to: "" });
  const [filters, setFilters] = useState(draft);
  const [page, setPage] = useState(0);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<AdminCertificateRow | null>(null);
  const [reason, setReason] = useState("");
  const q = useQuery({ queryKey: ["admin", "certificates", filters, page], queryFn: () => adminListCertificates(filters, page) });
  const detail = useQuery({ queryKey: ["admin", "certificate", detailId], enabled: Boolean(detailId), queryFn: () => adminCertificateDetail(detailId!) });
  const total = q.data?.[0]?.total_count ?? 0;

  const revoke = useMutation({
    mutationFn: () => adminRevokeCertificate(revoking!.id, reason),
    onSuccess: () => {
      toast.success(`Certificate ${revoking!.certificate_number} revoked`);
      setRevoking(null); setReason("");
      qc.invalidateQueries({ queryKey: ["admin", "certificates"] });
      qc.invalidateQueries({ queryKey: ["admin", "certificate"] });
      qc.invalidateQueries({ queryKey: ["admin", "certificate-courses"] });
    },
    onError: (e) => toast.error(e instanceof Error && e.message ? e.message : friendlyError(e, t)),
  });

  const copyLink = async (token: string) => {
    try { await navigator.clipboard.writeText(verificationUrl(token)); toast.success("Verification link copied"); }
    catch { toast.message(verificationUrl(token)); }
  };
  const download = async (id: string) => {
    try { await openCertificatePdf(id, "download"); } catch (e) { toast.error(friendlyError(e, t)); }
  };

  return (
    <>
      <form className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-[2fr_1.4fr_1fr_1.2fr_1.2fr_auto]"
        onSubmit={(e) => { e.preventDefault(); setPage(0); setFilters({ ...draft, search: draft.search.trim() }); }}>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate" />
          <Input className="pl-9" aria-label="Search" placeholder="Student, username, course or certificate ID…"
            value={draft.search} onChange={(e) => setDraft({ ...draft, search: e.target.value })} />
        </div>
        <NativeSelect aria-label="Course" value={draft.courseId} onChange={(e) => setDraft({ ...draft, courseId: e.target.value })}>
          <option value="">All courses</option>
          {courses.map((c) => <option key={c.course_id} value={c.course_id}>{c.title_en}</option>)}
        </NativeSelect>
        <NativeSelect aria-label="Status" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as CertificateFilters["status"] })}>
          <option value="">Any status</option><option value="valid">Valid</option><option value="revoked">Revoked</option>
        </NativeSelect>
        <label className="flex items-center gap-2 text-sm text-slate"><span className="w-10 shrink-0 lg:w-auto">From</span>
          <Input type="date" aria-label="Issued from" value={draft.from} onChange={(e) => setDraft({ ...draft, from: e.target.value })} /></label>
        <label className="flex items-center gap-2 text-sm text-slate"><span className="w-10 shrink-0 lg:w-auto">To</span>
          <Input type="date" aria-label="Issued to" value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} /></label>
        <Button type="submit" variant="ink">Apply</Button>
      </form>

      {q.isLoading ? <PageLoader /> : q.isError ? <ErrorState message={friendlyError(q.error, t)} onRetry={() => q.refetch()} />
        : q.data!.length === 0 ? <EmptyState title="No certificates found" body="Certificates appear here automatically as students complete fully configured courses." /> : (
        <>
          <ul className="divide-y divide-line border-t border-line">
            {q.data!.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{c.student_name} {c.username && <span className="font-normal text-slate">@{c.username}</span>}</p>
                  <p className="truncate text-sm">{c.course_title}</p>
                  <p className="truncate font-mono text-xs text-slate">{c.certificate_number} · issued {formatDate(c.issued_at, lang)} · score {Number(c.final_score)}%{!c.has_pdf && " · PDF pending"}</p>
                </div>
                <Badge tone={c.status === "valid" ? "success" : "error"}>{c.status}</Badge>
                <div className="flex flex-wrap gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setDetailId(c.id)}><Eye /> Details</Button>
                  <Button size="sm" variant="ghost" onClick={() => download(c.id)}><Download /> PDF</Button>
                  <Button size="sm" variant="ghost" onClick={() => copyLink(c.verification_token)}><Copy /> Link</Button>
                  {c.status === "valid" && <Button size="sm" variant="outline" onClick={() => { setReason(""); setRevoking(c); }}><ShieldX /> Revoke</Button>}
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center justify-between text-sm text-slate">
            <span>{total} certificate{total === 1 ? "" : "s"}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <Button size="sm" variant="outline" disabled={(page + 1) * 25 >= total} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        </>
      )}

      <Dialog open={Boolean(detailId)} onOpenChange={(o) => !o && setDetailId(null)} title="Certificate details" size="lg">
        {detail.isLoading ? <PageLoader /> : detail.isError ? <ErrorState message={friendlyError(detail.error, t)} /> : detail.data && (() => {
          const c = detail.data.certificate as Record<string, string | number | null>;
          const rows: [string, React.ReactNode][] = [
            ["Certificate ID", <span className="font-mono">{c.certificate_number}</span>],
            ["Status", <Badge tone={c.status === "valid" ? "success" : "error"}>{String(c.status)}</Badge>],
            ["Student (as printed)", c.student_name], ["Username", c.username ? `@${c.username}` : "—"],
            ["Course (as printed)", c.course_title], ["Final assessment score", `${Number(c.final_score)}%`],
            ["Issued", formatDate(String(c.issued_at), lang)], ["Issuer line", c.issuer_designation ?? "CampusCode Learning Platform"],
            ["PDF", c.pdf_generated_at ? `Generated ${formatDate(String(c.pdf_generated_at), lang)}` : c.pdf_error ? `Failed: ${c.pdf_error}` : "Pending"],
          ];
          if (c.status === "revoked") rows.push(["Revoked", `${formatDate(String(c.revoked_at), lang)} — ${c.revocation_reason}`]);
          return (
            <div className="space-y-6">
              <dl className="grid grid-cols-[minmax(0,180px)_1fr] gap-x-4 gap-y-2 text-sm">
                {rows.map(([k, v]) => <div key={k} className="contents"><dt className="text-slate">{k}</dt><dd className="min-w-0 break-words">{v}</dd></div>)}
              </dl>
              <div>
                <p className="eyebrow mb-2">Issuance record</p>
                <ol className="space-y-2 border-l-2 border-line pl-4 text-sm">
                  {detail.data.events.map((e, i) => (
                    <li key={i}>
                      <span className="font-semibold">{EVENT_LABEL[e.event] ?? e.event}</span>
                      <span className="ml-2 font-mono text-xs text-slate">{new Date(e.created_at).toLocaleString()}</span>
                      {e.actor && <span className="ml-2 text-xs text-slate">by @{e.actor}</span>}
                      {e.event === "revoked" && typeof e.details.reason === "string" && <p className="text-slate">“{e.details.reason}”</p>}
                      {e.event === "pdf_failed" && typeof e.details.error === "string" && <p className="text-error">{e.details.error}</p>}
                      {e.event === "issued" && e.details.eligibility != null && (() => {
                        const el = e.details.eligibility as { lessons: { done: number; total: number }; practice: { done: number; total: number }; assessment: { score: number; passing_score: number } };
                        return <p className="text-slate">Lessons {el.lessons.done}/{el.lessons.total} · practice {el.practice.done}/{el.practice.total} · assessment {el.assessment.score}% (pass {el.assessment.passing_score}%)</p>;
                      })()}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          );
        })()}
      </Dialog>

      <Dialog open={Boolean(revoking)} onOpenChange={(o) => !o && setRevoking(null)} title={`Revoke ${revoking?.certificate_number ?? ""}?`}
        description="The certificate will immediately show as Revoked on its public verification page and can no longer be downloaded by the student. The student is notified. This cannot be undone."
        footer={<>
          <Button variant="outline" onClick={() => setRevoking(null)}>Cancel</Button>
          <Button variant="danger" disabled={reason.trim().length < 5} loading={revoke.isPending} onClick={() => revoke.mutate()}>Revoke certificate</Button>
        </>}>
        <Field label="Reason (required, shown to the student)" htmlFor="revoke-reason" hint="At least 5 characters.">
          <Textarea id="revoke-reason" rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
      </Dialog>
    </>
  );
}

// ---------------------------------------------------------------- course requirements
function CourseEditor({ course, onChanged }: { course: AdminCertificateCourse; onChanged: () => void }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const settings = useQuery({ queryKey: ["admin", "cert-settings", course.course_id], queryFn: () => adminGetCourseSettings(course.course_id) });
  const reqs = useQuery({ queryKey: ["course-requirements", course.course_id], queryFn: () => listCourseRequirements(course.course_id) });
  const problems = useQuery({ queryKey: ["admin", "published-problems"], queryFn: adminPublishedProblems, staleTime: 300_000 });
  const [form, setForm] = useState({ enabled: false, passing_score: 70, issuer_designation: "" });
  const [pick, setPick] = useState({ problemId: "", kind: "practice" as RequirementKind });

  useEffect(() => {
    const s = settings.data;
    setForm({ enabled: s?.enabled ?? false, passing_score: Number(s?.passing_score ?? 70), issuer_designation: s?.issuer_designation ?? "" });
  }, [settings.data]);

  const refresh = () => { qc.invalidateQueries({ queryKey: ["course-requirements", course.course_id] }); onChanged(); };
  const onErr = (e: unknown) => toast.error(friendlyError(e, t));

  const save = useMutation({
    mutationFn: () => adminSaveCourseSettings({ course_id: course.course_id, enabled: form.enabled,
      passing_score: form.passing_score, issuer_designation: form.issuer_designation || null }, user!.id),
    onSuccess: () => { toast.success("Certificate settings saved"); settings.refetch(); onChanged(); }, onError: onErr,
  });
  const add = useMutation({
    mutationFn: () => adminAddRequirement(course.course_id, pick.problemId, pick.kind, (reqs.data?.length ?? 0) + 1),
    onSuccess: () => { setPick({ ...pick, problemId: "" }); refresh(); }, onError: onErr,
  });
  const remove = useMutation({ mutationFn: (pid: string) => adminRemoveRequirement(course.course_id, pid), onSuccess: refresh, onError: onErr });
  const weight = useMutation({
    mutationFn: ({ pid, w }: { pid: string; w: number }) => adminUpdateRequirement(course.course_id, pid, { weight: w }),
    onSuccess: refresh, onError: onErr,
  });
  const issue = useMutation({
    mutationFn: () => adminIssueEligible(course.course_id),
    onSuccess: (n) => { toast.success(n ? `${n} certificate${n === 1 ? "" : "s"} issued` : "No additional students qualify yet"); onChanged(); qc.invalidateQueries({ queryKey: ["admin", "certificates"] }); },
    onError: onErr,
  });

  const used = new Set((reqs.data ?? []).map((r) => r.problem_id));
  const available = (problems.data ?? []).filter((p) => !used.has(p.id));
  const passValid = form.passing_score >= 70 && form.passing_score <= 100;

  const list = (kind: RequirementKind) => {
    const items = (reqs.data ?? []).filter((r) => r.kind === kind);
    if (!items.length) return <p className="rounded border border-dashed border-line px-3 py-4 text-sm text-slate">None yet.</p>;
    return (
      <ul className="divide-y divide-line rounded border border-line">
        {items.map((r) => (
          <li key={r.problem_id} className="flex flex-wrap items-center gap-3 px-3 py-2.5 text-sm">
            <span className="min-w-0 flex-1 truncate font-semibold">{r.problems?.title ?? "(deleted problem)"}</span>
            {r.problems?.status !== "published" && <Badge tone="warning">not published — ignored</Badge>}
            {kind === "assessment" && (
              <label className="flex items-center gap-1 text-xs text-slate">weight
                <Input type="number" min={1} max={10} defaultValue={r.weight} className="h-8 w-16"
                  onBlur={(e) => { const w = Number(e.target.value); if (w >= 1 && w <= 10 && w !== r.weight) weight.mutate({ pid: r.problem_id, w }); }} />
              </label>
            )}
            <Button size="icon-sm" variant="ghost" aria-label={`Remove ${r.problems?.title ?? "problem"}`} onClick={() => remove.mutate(r.problem_id)}><Trash2 /></Button>
          </li>
        ))}
      </ul>
    );
  };

  if (settings.isLoading || reqs.isLoading) return <PageLoader />;
  return (
    <div className="space-y-8">
      {course.config.configured
        ? <p className="inline-flex items-center gap-2 rounded bg-success/10 px-3 py-2 text-sm font-semibold text-success"><CheckCircle2 className="size-4" />Fully configured — certificates are issued automatically.</p>
        : (
          <div className="rounded border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
            <p className="flex items-center gap-2 font-semibold"><AlertTriangle className="size-4" />No certificates will be issued until this is fixed:</p>
            <ul className="mt-1 list-disc pl-6">{course.config.missing.map((m) => <li key={m}>{MISSING[m] ?? m}</li>)}</ul>
          </div>
        )}

      <section className="space-y-4 rounded border border-line p-4 sm:p-5" aria-label="Certificate settings">
        <label className="flex items-center gap-3">
          <Switch label="Certificates enabled" checked={form.enabled} onCheckedChange={(v) => setForm({ ...form, enabled: v })} />
          <span className="text-sm font-semibold">Certificates enabled for this course</span>
        </label>
        <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
          <Field label="Pass mark (%)" htmlFor="pass" error={passValid ? undefined : "Must be 70–100"}>
            <Input id="pass" type="number" min={70} max={100} step={1} value={form.passing_score}
              onChange={(e) => setForm({ ...form, passing_score: Number(e.target.value) })} />
          </Field>
          <Field label="Issuer designation (optional)" htmlFor="issuer" hint="Printed under “Authorized issuer”. Default: CampusCode Learning Platform. No signatures are ever printed.">
            <Input id="issuer" maxLength={80} value={form.issuer_designation} placeholder="CampusCode Learning Platform"
              onChange={(e) => setForm({ ...form, issuer_designation: e.target.value })} />
          </Field>
        </div>
        <Button variant="ink" disabled={!passValid} loading={save.isPending} onClick={() => save.mutate()}>Save settings</Button>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <p className="eyebrow mb-2">Required practice (optional, must be solved)</p>
          {list("practice")}
        </div>
        <div>
          <p className="eyebrow mb-2">Final assessment (optional; score = weighted share of tests passed)</p>
          {list("assessment")}
        </div>
      </section>

      <section className="flex flex-wrap items-end gap-3">
        <Field label="Add a published problem" htmlFor="add-problem" className="min-w-[240px] flex-1">
          <NativeSelect id="add-problem" value={pick.problemId} onChange={(e) => setPick({ ...pick, problemId: e.target.value })}>
            <option value="">Choose a problem…</option>
            {available.map((p) => <option key={p.id} value={p.id}>{p.title} ({p.difficulty})</option>)}
          </NativeSelect>
        </Field>
        <Field label="As" htmlFor="add-kind">
          <NativeSelect id="add-kind" value={pick.kind} onChange={(e) => setPick({ ...pick, kind: e.target.value as RequirementKind })}>
            <option value="practice">Required practice</option><option value="assessment">Final assessment</option>
          </NativeSelect>
        </Field>
        <Button variant="outline" disabled={!pick.problemId} loading={add.isPending} onClick={() => add.mutate()}><Plus /> Add</Button>
      </section>

      <section className="flex flex-wrap items-center gap-3 border-t border-line pt-6">
        <Button variant="outline" disabled={!course.config.configured} loading={issue.isPending} onClick={() => issue.mutate()}><Users /> Issue to students who already qualify</Button>
        <p className="text-sm text-slate">Issuance is automatic; use this once after enabling a course or changing its requirements.</p>
      </section>
    </div>
  );
}

function CourseRequirements({ courses, refetch }: { courses: AdminCertificateCourse[]; refetch: () => void }) {
  const [selected, setSelected] = useState<string>(courses[0]?.course_id ?? "");
  const course = courses.find((c) => c.course_id === selected);
  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <ul className="space-y-2" aria-label="Courses">
        {courses.map((c) => (
          <li key={c.course_id}>
            <button onClick={() => setSelected(c.course_id)} aria-pressed={selected === c.course_id}
              className={`w-full rounded border p-3 text-left transition-colors ${selected === c.course_id ? "border-ink bg-ink text-paper" : "border-line bg-white hover:border-ink/40"}`}>
              <span className="block font-semibold">{c.title_en}</span>
              <span className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                <Badge tone={c.config.configured ? "success" : "warning"}>{c.config.configured ? "ready" : "not configured"}</Badge>
                <span className={selected === c.course_id ? "text-paper/60" : "text-slate"}>{c.config.quizzes ?? 0} quizzes · {c.issued} issued · {c.revoked} revoked</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <div className="min-w-0">{course && <CourseEditor key={course.course_id} course={course} onChanged={refetch} />}</div>
    </div>
  );
}

export default function AdminCertificates() {
  const { t } = useI18n();
  const courses = useQuery({ queryKey: ["admin", "certificate-courses"], queryFn: adminCertificateCourses });
  const sorted = useMemo(() => courses.data ?? [], [courses.data]);
  return (
    <div className="surface p-5 sm:p-8">
      <h1 className="text-3xl font-extrabold">Certificates</h1>
      <p className="mb-6 mt-1 max-w-3xl text-sm text-slate">
        Certificates of Completion are issued automatically, without approval, once a student completes every published lesson,
        solves all required practice problems and reaches the pass mark on the final assessment. Nothing is issued for a course until it is fully configured.
      </p>
      {courses.isLoading ? <PageLoader /> : courses.isError ? <ErrorState message={friendlyError(courses.error, t)} onRetry={() => courses.refetch()} /> : (
        <Tabs defaultValue="issued">
          <TabsList className="mb-6"><TabsTrigger value="issued">Issued certificates</TabsTrigger><TabsTrigger value="requirements">Course requirements</TabsTrigger></TabsList>
          <TabsContent value="issued"><CertificateList courses={sorted} /></TabsContent>
          <TabsContent value="requirements"><CourseRequirements courses={sorted} refetch={() => courses.refetch()} /></TabsContent>
        </Tabs>
      )}
    </div>
  );
}
