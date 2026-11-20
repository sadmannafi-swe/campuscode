import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { MailCheck } from "lucide-react";
import { friendlyError } from "@/lib/errors";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { safeNext, signUpWithEmail } from "@/services/auth";
import { AuthLayout } from "./AuthLayout";
import { EMAIL_RE, PasswordInput, isStrongPassword } from "./PasswordInput";
import { GoogleButton, OrDivider } from "./GoogleButton";

type Errors = Partial<Record<"name" | "email" | "password" | "confirm" | "form", string>>;

export default function RegisterPage() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const next = safeNext(params.get("next"));

  if (user) return <Navigate to={next} replace />;

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: Errors = {};
    const name = form.name.trim();
    if (name.length < 2 || name.length > 80) errs.name = t("auth.nameRequired");
    if (!EMAIL_RE.test(form.email.trim())) errs.email = t("auth.emailInvalid");
    if (!isStrongPassword(form.password)) errs.password = t("auth.passwordRule");
    if (form.password !== form.confirm) errs.confirm = t("auth.passwordMismatch");
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setBusy(true);
    try {
      const r = await signUpWithEmail({ name, email: form.email.trim(), password: form.password, lang });
      if (r.status === "exists") setErrors({ form: t("auth.alreadyRegistered") });
      else if (r.status === "signed_in") nav(next, { replace: true });
      else setPendingEmail(form.email.trim());   // only if email confirmation is still switched on in Supabase
    } catch (err) {
      setErrors({ form: friendlyError(err, t) });
    } finally {
      setBusy(false);
    }
  };

  if (pendingEmail) {
    return (
      <AuthLayout title={t("auth.checkEmail")}>
        <div className="flex flex-col items-center rounded-md border border-line bg-white p-6 text-center">
          <MailCheck className="size-8 text-success" aria-hidden />
          <p className="mt-3 text-[15px]">{t("auth.checkEmailBody", { email: pendingEmail })}</p>
          <Button asChild variant="outline" className="mt-5"><Link to="/login">{t("auth.backToSignIn")}</Link></Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={t("auth.signUpTitle")} subtitle={t("auth.signUpSubtitle")}
      footer={<>{t("auth.haveAccount")} <Link to={`/login${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-ink underline decoration-lime decoration-2 underline-offset-4">{t("auth.signIn")}</Link></>}>
      {errors.form && <p role="alert" className="mb-5 rounded border border-error/30 bg-error/5 px-3 py-2.5 text-sm text-error">{errors.form}</p>}
      <GoogleButton next={next} />
      <OrDivider />
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field label={t("auth.fullName")} htmlFor="name" error={errors.name}>
          <Input id="name" autoComplete="name" value={form.name} invalid={Boolean(errors.name)} maxLength={80} onChange={(e) => set("name")(e.target.value)} />
        </Field>
        <Field label={t("auth.email")} htmlFor="email" error={errors.email}>
          <Input id="email" type="email" autoComplete="email" inputMode="email" placeholder="you@gmail.com" value={form.email} invalid={Boolean(errors.email)} onChange={(e) => set("email")(e.target.value)} />
        </Field>
        <Field label={t("auth.password")} htmlFor="password" error={errors.password} hint={t("auth.passwordRule")}>
          <PasswordInput id="password" autoComplete="new-password" value={form.password} invalid={Boolean(errors.password)} onChange={(e) => set("password")(e.target.value)} />
        </Field>
        <Field label={t("auth.confirmPassword")} htmlFor="confirm" error={errors.confirm}>
          <PasswordInput id="confirm" autoComplete="new-password" value={form.confirm} invalid={Boolean(errors.confirm)} onChange={(e) => set("confirm")(e.target.value)} />
        </Field>
        <Button type="submit" variant="ink" size="lg" className="w-full" loading={busy}>{t("auth.signUp")}</Button>
        <p className="text-center text-xs text-slate">{t("auth.termsNotice")}</p>
      </form>
    </AuthLayout>
  );
}
