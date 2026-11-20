import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { friendlyError } from "@/lib/errors";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/input";
import { PageLoader } from "@/components/ui/misc";
import { AuthLayout } from "./AuthLayout";
import { PasswordInput, isStrongPassword } from "./PasswordInput";

export default function ResetPasswordPage() {
  const { t } = useI18n();
  const nav = useNavigate();
  const [state, setState] = useState<"checking" | "ready" | "invalid">("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{ password?: string; confirm?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // The recovery link signs the user in via the URL fragment; supabase-js picks it up.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setState("ready");
    });
    const timer = setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      setState(data.session ? "ready" : "invalid");
    }, 1200);
    return () => { sub.subscription.unsubscribe(); clearTimeout(timer); };
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!isStrongPassword(password)) errs.password = t("auth.passwordRule");
    if (password !== confirm) errs.confirm = t("auth.passwordMismatch");
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return setErrors({ form: friendlyError(error, t) });
    toast.success(t("auth.passwordUpdated"));
    nav("/", { replace: true });
  };

  return (
    <AuthLayout title={t("auth.newPasswordTitle")}
      footer={<Link to="/login" className="font-semibold text-ink underline decoration-lime decoration-2 underline-offset-4">{t("auth.backToSignIn")}</Link>}>
      {state === "checking" && <PageLoader />}
      {state === "invalid" && (
        <div className="space-y-4">
          <p role="alert" className="rounded border border-error/30 bg-error/5 px-3 py-2.5 text-sm text-error">{t("auth.invalidLink")}</p>
          <Button asChild variant="outline" className="w-full"><Link to="/forgot-password">{t("auth.sendLink")}</Link></Button>
        </div>
      )}
      {state === "ready" && (
        <form onSubmit={submit} noValidate className="space-y-5">
          {errors.form && <p role="alert" className="rounded border border-error/30 bg-error/5 px-3 py-2.5 text-sm text-error">{errors.form}</p>}
          <Field label={t("auth.newPassword")} htmlFor="password" error={errors.password} hint={t("auth.passwordRule")}>
            <PasswordInput id="password" autoComplete="new-password" value={password} invalid={Boolean(errors.password)} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <Field label={t("auth.confirmPassword")} htmlFor="confirm" error={errors.confirm}>
            <PasswordInput id="confirm" autoComplete="new-password" value={confirm} invalid={Boolean(errors.confirm)} onChange={(e) => setConfirm(e.target.value)} />
          </Field>
          <Button type="submit" variant="ink" size="lg" className="w-full" loading={busy}>{t("auth.updatePassword")}</Button>
        </form>
      )}
    </AuthLayout>
  );
}
