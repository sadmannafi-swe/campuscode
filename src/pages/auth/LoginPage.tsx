import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { friendlyError } from "@/lib/errors";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { AuthLayout } from "./AuthLayout";
import { EMAIL_RE, PasswordInput } from "./PasswordInput";

const safeNext = (n: string | null) => (n && n.startsWith("/") && !n.startsWith("//") ? n : "/");

export default function LoginPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const next = safeNext(params.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={next} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!EMAIL_RE.test(email.trim())) errs.email = t("auth.emailInvalid");
    if (!password) errs.password = t("auth.passwordRule");
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) return setErrors({ form: friendlyError(error, t) });
    nav(next, { replace: true });
  };

  return (
    <AuthLayout title={t("auth.signInTitle")} subtitle={t("auth.signInSubtitle")}
      footer={<>{t("auth.noAccount")} <Link to={`/register${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-ink underline decoration-lime decoration-2 underline-offset-4">{t("auth.signUp")}</Link></>}>
      <form onSubmit={submit} noValidate className="space-y-5">
        {errors.form && <p role="alert" className="rounded border border-error/30 bg-error/5 px-3 py-2.5 text-sm text-error">{errors.form}</p>}
        <Field label={t("auth.email")} htmlFor="email" error={errors.email}>
          <Input id="email" type="email" autoComplete="email" inputMode="email" value={email} invalid={Boolean(errors.email)}
            onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label={t("auth.password")} htmlFor="password" error={errors.password}>
          <PasswordInput id="password" autoComplete="current-password" value={password} invalid={Boolean(errors.password)}
            onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-sm font-medium text-slate hover:text-ink">{t("auth.forgot")}</Link>
        </div>
        <Button type="submit" variant="ink" size="lg" className="w-full" loading={busy}>{t("auth.signIn")}</Button>
      </form>
    </AuthLayout>
  );
}
