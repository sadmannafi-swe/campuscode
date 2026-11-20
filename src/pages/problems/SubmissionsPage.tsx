import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/i18n";
import { SectionTitle } from "@/components/ui/misc";
import { listMySubmissions } from "@/services/problems";
import { SubmissionList } from "./SubmissionList";

export default function SubmissionsPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const subs = useQuery({ queryKey: ["submissions", user!.id, "all"], queryFn: () => listMySubmissions(user!.id, undefined, 100) });
  return (
    <div className="page">
      <SectionTitle title={t("subs.title")} subtitle={t("subs.subtitle")} />
      <div className="surface p-4 sm:p-6"><SubmissionList query={subs} /></div>
    </div>
  );
}
