import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, SearchX, ShieldX } from "lucide-react";
import { useI18n } from "@/i18n";
import { ErrorState, PageLoader } from "@/components/ui/misc";
import { Logo } from "@/components/brand/Logo";
import { verifyCertificate } from "@/services/certificates";
import { friendlyError } from "@/lib/errors";
import { cn, formatDate } from "@/lib/utils";

/**
 * Public verification page (no sign-in): /verify-certificate/:verificationToken — the QR code opens it.
 * Shows only what is printed on the certificate plus its status; never e-mail, IDs or account data.
 */
export default function VerifyCertificatePage() {
  const { verificationToken = "" } = useParams();
  const { t, lang } = useI18n();
  const q = useQuery({ queryKey: ["verify-certificate", verificationToken], queryFn: () => verifyCertificate(verificationToken), staleTime: 0 });

  // Verification pages are personal: keep them out of search engines.
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots"; meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    const prev = document.title;
    document.title = `${t("verify.title")} · CampusCode`;
    return () => { meta.remove(); document.title = prev; };
  }, [t]);

  if (q.isLoading) return <div className="page"><PageLoader /></div>;
  if (q.isError) return <div className="page"><ErrorState message={friendlyError(q.error, t)} onRetry={() => q.refetch()} /></div>;
  const v = q.data!;
  const state = v.status === "valid" ? "valid" : v.status === "revoked" ? "revoked" : "not_found";
  const Icon = state === "valid" ? BadgeCheck : state === "revoked" ? ShieldX : SearchX;
  const title = state === "valid" ? t("verify.valid") : state === "revoked" ? t("verify.revoked") : t("verify.notFound");
  const body = state === "valid" ? t("verify.validBody") : state === "revoked" ? t("verify.revokedBody") : t("verify.notFoundBody");

  return (
    <div className="page max-w-2xl">
      <p className="eyebrow mb-3">{t("verify.title")}</p>
      <section className="surface overflow-hidden" aria-live="polite">
        <div className={cn("flex items-start gap-4 p-6 sm:p-8",
          state === "valid" ? "bg-ink text-paper" : state === "revoked" ? "bg-error/10" : "bg-paper")}>
          <Icon className={cn("mt-0.5 size-9 shrink-0", state === "valid" ? "text-lime" : state === "revoked" ? "text-error" : "text-slate")} aria-hidden />
          <div>
            <h1 className="text-2xl font-extrabold sm:text-3xl" data-testid="verify-status" data-status={state}>{title}</h1>
            <p className={cn("mt-1 text-[15px]", state === "valid" ? "text-paper/75" : "text-slate")}>{body}</p>
          </div>
        </div>
        {state !== "not_found" && (
          <dl className="grid gap-x-6 gap-y-4 p-6 sm:grid-cols-2 sm:p-8">
            <div className="sm:col-span-2">
              <dt className="eyebrow">{t("verify.student")}</dt>
              <dd className="mt-1 break-words font-heading text-2xl font-bold">{v.student_name}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="eyebrow">{t("verify.course")}</dt>
              <dd className="mt-1 break-words text-lg font-semibold">{v.course_title}</dd>
            </div>
            <div>
              <dt className="eyebrow">{t("verify.certificateId")}</dt>
              <dd className="mt-1 font-mono text-[15px]">{v.certificate_number}</dd>
            </div>
            <div>
              <dt className="eyebrow">{t("verify.issueDate")}</dt>
              <dd className="mt-1 text-[15px]">{v.issued_at ? formatDate(v.issued_at, lang) : "—"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="eyebrow">{t("verify.platform")}</dt>
              <dd className="mt-2"><Logo variant="lockup" /></dd>
              <dd className="sr-only">{v.issuing_platform}</dd>
            </div>
          </dl>
        )}
      </section>
      <p className="mt-4 text-xs text-slate">{t("verify.privacy")}</p>
    </div>
  );
}
