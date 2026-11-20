import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { friendlyError } from "@/lib/errors";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { AuthLayout } from "./AuthLayout";
import { EMAIL_RE } from "./PasswordInput";

export default function ForgotPasswordPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) return setError(t("auth.emailInvalid"));
    setBusy(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (err) return setError(friendlyError(err, t));
    setSent(true);
  };

  return (
    <AuthLayout title={t("auth.resetTitle")} subtitle={t("auth.resetSubtitle")}
      footer={<Link to="/login" className="font-semibold text-ink underline decoration-lime decoration-2 underline-offset-4">{t("auth.backToSignIn")}</Link>}>
      {sent ? (
        <p role="status" className="rounded border border-success/30 bg-success/5 px-4 py-3 text-sm text-success">{t("auth.linkSent", { email: email.trim() })}</p>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-5">
          <Field label={t("auth.email")} htmlFor="email" error={error}>
            <Input id="email" type="email" autoComplete="email" value={email} invalid={Boolean(error)} onChange={(e) => { setEmail(e.target.value); setError(null); }} />
          </Field>
          <Button type="submit" variant="ink" size="lg" className="w-full" loading={busy}>{t("auth.sendLink")}</Button>
        </form>
      )}
    </AuthLayout>
  );
}
