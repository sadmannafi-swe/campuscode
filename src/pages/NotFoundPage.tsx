import { Link } from "react-router-dom";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  const { t } = useI18n();
  return (
    <div className="page flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="font-mono text-sm text-slate">404 · return NOT_FOUND;</p>
      <h1 className="mt-3 text-3xl font-extrabold">{t("common.notFound")}</h1>
      <p className="mt-2 max-w-sm text-slate">{t("common.notFoundBody")}</p>
      <Button asChild variant="ink" className="mt-6"><Link to="/">{t("common.goHome")}</Link></Button>
    </div>
  );
}
