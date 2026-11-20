import type { ReactNode } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { Lock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/i18n";
import { PageLoader, EmptyState } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  return <>{children}</>;
}

/** UX-only gate. The real protection is RLS + is_admin() checks inside every admin RPC. */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, isAdmin, loading } = useAuth();
  const { t } = useI18n();
  const location = useLocation();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  if (!isAdmin) {
    return (
      <div className="page">
        <EmptyState icon={<Lock className="size-6" />} title={t("error.permission")}
          action={<Button asChild variant="ink"><Link to="/">{t("common.goHome")}</Link></Button>} />
      </div>
    );
  }
  return <>{children}</>;
}

export function SignInPrompt({ dark, message }: { dark?: boolean; message?: string }) {
  const { t } = useI18n();
  const location = useLocation();
  return (
    <EmptyState dark={dark} icon={<Lock className="size-6" />} title={t("common.signInRequired")}
      body={message ?? t("common.signInRequiredBody")}
      action={<div className="flex gap-2">
        <Button asChild variant={dark ? "lime" : "ink"}><Link to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`}>{t("nav.signIn")}</Link></Button>
        <Button asChild variant={dark ? "outline-dark" : "outline"}><Link to="/register">{t("nav.signUp")}</Link></Button>
      </div>} />
  );
}
