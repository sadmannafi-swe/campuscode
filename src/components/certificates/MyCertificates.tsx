import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Award, Copy, Download, ExternalLink, Info } from "lucide-react";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Badge, EmptyState, ErrorState, Skeleton } from "@/components/ui/misc";
import { friendlyError } from "@/lib/errors";
import { formatDate } from "@/lib/utils";
import { openCertificatePdf, syncMyCertificates, verificationUrl } from "@/services/certificates";
import type { MyCertificate } from "@/types/db";
import { CertificatePreview } from "./CertificatePreview";

function CertificateCard({ c }: { c: MyCertificate }) {
  const { t, lang } = useI18n();
  const [busy, setBusy] = useState<"view" | "download" | null>(null);
  const url = verificationUrl(c.verification_token);
  const valid = c.status === "valid";

  const open = async (mode: "view" | "download") => {
    setBusy(mode);
    try { await openCertificatePdf(c.id, mode); }
    catch (e) { toast.error(friendlyError(e, t)); }
    finally { setBusy(null); }
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); toast.success(t("cert.copied")); }
    catch { toast.message(t("cert.copyFailed", { url })); }
  };

  return (
    <article className="surface flex flex-col overflow-hidden" aria-label={c.course_title}>
      <div className="border-b border-line bg-paper p-3">
        <CertificatePreview name={c.student_name} course={c.course_title} alt={t("cert.previewAlt", { course: c.course_title })}
          className={valid ? "" : "opacity-50 grayscale"} />
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-heading text-lg font-bold leading-snug">{c.course_title}</h3>
          <Badge tone={valid ? "success" : "error"} className="shrink-0">{valid ? t("cert.valid") : t("cert.revoked")}</Badge>
        </div>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          <dt className="text-slate">{t("verify.issueDate")}</dt><dd>{formatDate(c.issued_at, lang)}</dd>
          <dt className="text-slate">{t("cert.id")}</dt><dd className="font-mono text-[13px]">{c.certificate_number}</dd>
        </dl>
        {!valid && <p className="mt-3 text-sm text-error">{t("cert.revokedNote")}</p>}
        <div className="mt-auto flex flex-wrap gap-2 pt-4">
          {valid && (
            <>
              <Button size="sm" onClick={() => open("download")} disabled={busy !== null} aria-busy={busy === "download"}>
                <Download /> {t("cert.download")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => open("view")} disabled={busy !== null} aria-busy={busy === "view"}>
                <ExternalLink /> {t("cert.view")}
              </Button>
            </>
          )}
          <Button size="sm" variant="ghost" onClick={copy}><Copy /> {t("cert.copyLink")}</Button>
        </div>
      </div>
    </article>
  );
}

/** "My certificates" section of the profile. Opening it asks the server to re-check eligibility. */
export function MyCertificates({ userId }: { userId: string }) {
  const { t } = useI18n();
  const q = useQuery({ queryKey: ["certificates", userId], queryFn: syncMyCertificates, staleTime: 60_000 });

  // Notifications link to /profile#certificates: scroll there once the list has rendered.
  useEffect(() => {
    if (window.location.hash === "#certificates" && !q.isLoading) {
      document.getElementById("certificates")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [q.isLoading]);

  const list = q.data?.certificates ?? [];
  return (
    <section id="certificates" className="mt-12 scroll-mt-24" aria-labelledby="certificates-title">
      <h2 id="certificates-title" className="font-heading text-xl font-bold">{t("cert.myTitle")}</h2>
      <p className="mb-4 mt-1 max-w-3xl text-sm text-slate">{t("cert.myIntro")}</p>
      {q.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Skeleton className="h-80" /><Skeleton className="hidden h-80 sm:block" /></div>
      ) : q.isError ? (
        <ErrorState message={friendlyError(q.error, t)} onRetry={() => q.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState icon={<Award className="size-6" />} title={t("cert.emptyTitle")} body={t("cert.emptyBody")}
          action={<Button asChild variant="outline"><Link to="/learn">{t("cert.browseCourses")}</Link></Button>} />
      ) : (
        <>
          {q.data?.pdf_pending && (
            <p className="mb-3 inline-flex items-center gap-2 rounded bg-white px-3 py-2 text-sm text-slate"><Info className="size-4" />{t("cert.pdfPending")}</p>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((c) => <CertificateCard key={c.id} c={c} />)}
          </div>
        </>
      )}
    </section>
  );
}
