import { useState, type FormEvent } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { MailCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { friendlyError } from "@/lib/errors";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { AuthLayout } from "./AuthLayout";
import { EMAIL_RE, PasswordInput, isStrongPassword } from "./PasswordInput";

type Errors = Partial<Record<"name" | "email" | "password" | "confirm" | "terms" | "form", string>>;

export default function RegisterPage() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "", terms: false });
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const next = params.get("next");

  if (user) return <Navigate to={next && next.startsWith("/") && !next.startsWith("//") ? next : "/"} replace />;

  const set = (k: keyof typeof form) => (v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: Errors = {};
    const name = form.name.trim();
    if (name.length < 2 || name.length > 80) errs.name = t("auth.nameRequired");
    if (!EMAIL_RE.test(form.email.trim())) errs.email = t("auth.emailInvalid");
    if (!isStrongPassword(form.password)) errs.password = t("auth.passwordRule");
    if (form.password !== form.confirm) errs.confirm = t("auth.passwordMismatch");
    if (!form.terms) errs.terms = t("auth.termsRequired");
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: name, terms_accepted: true, preferred_language: lang },
      },
    });
    setBusy(false);
    if (error) return setErrors({ form: friendlyError(error, t) });
    // Supabase returns a user with no identities when the email is already registered.
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      return setErrors({ form: t("auth.alreadyRegistered") });
    }
    if (!data.session) setSentTo(form.email.trim());
  };

  if (sentTo) {
    return (
      <AuthLayout title={t("auth.checkEmail")}>
        <div className="flex flex-col items-center rounded-md border border-line bg-white p-6 text-center">
          <MailCheck className="size-8 text-success" aria-hidden />
          <p className="mt-3 text-[15px]">{t("auth.checkEmailBody", { email: sentTo })}</p>
          <Button asChild variant="outline" className="mt-5"><Link to="/login">{t("auth.backToSignIn")}</Link></Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={t("auth.signUpTitle")} subtitle={t("auth.signUpSubtitle")}
      footer={<>{t("auth.haveAccount")} <Link to="/login" className="font-semibold text-ink underline decoration-lime decoration-2 underline-offset-4">{t("auth.signIn")}</Link></>}>
      <form onSubmit={submit} noValidate className="space-y-4">
        {errors.form && <p role="alert" className="rounded border border-error/30 bg-error/5 px-3 py-2.5 text-sm text-error">{errors.form}</p>}
        <Field label={t("auth.fullName")} htmlFor="name" error={errors.name}>
          <Input id="name" autoComplete="name" value={form.name} invalid={Boolean(errors.name)} maxLength={80} onChange={(e) => set("name")(e.target.value)} />
        </Field>
        <Field label={t("auth.email")} htmlFor="email" error={errors.email}>
          <Input id="email" type="email" autoComplete="email" inputMode="email" value={form.email} invalid={Boolean(errors.email)} onChange={(e) => set("email")(e.target.value)} />
        </Field>
        <Field label={t("auth.password")} htmlFor="password" error={errors.password} hint={t("auth.passwordRule")}>
          <PasswordInput id="password" autoComplete="new-password" value={form.password} invalid={Boolean(errors.password)} onChange={(e) => set("password")(e.target.value)} />
        </Field>
        <Field label={t("auth.confirmPassword")} htmlFor="confirm" error={errors.confirm}>
          <PasswordInput id="confirm" autoComplete="new-password" value={form.confirm} invalid={Boolean(errors.confirm)} onChange={(e) => set("confirm")(e.target.value)} />
        </Field>
        <div>
          <label className="flex cursor-pointer items-start gap-3 text-sm text-ink/80">
            <input type="checkbox" checked={form.terms} onChange={(e) => set("terms")(e.target.checked)}
              className="mt-0.5 size-4 shrink-0 accent-ink" aria-invalid={Boolean(errors.terms) || undefined} />
            <span>{t("auth.terms")}</span>
          </label>
          {errors.terms && <p role="alert" className="mt-1.5 text-xs font-medium text-error">{errors.terms}</p>}
        </div>
        <Button type="submit" variant="ink" size="lg" className="w-full" loading={busy}>{t("auth.signUp")}</Button>
      </form>
    </AuthLayout>
  );
}
