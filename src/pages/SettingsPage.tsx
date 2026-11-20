import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Camera } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { PageLoader, SectionTitle } from "@/components/ui/misc";
import { Avatar } from "@/components/common/Avatar";
import { changePassword, updateProfile, uploadAvatar } from "@/services/profile";
import { friendlyError } from "@/lib/errors";
import { PasswordInput, isStrongPassword } from "./auth/PasswordInput";

export default function SettingsPage() {
  const { t } = useI18n();
  const { user, profile, refreshProfile } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ full_name: "", username: "", institution: "", bio: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pw, setPw] = useState({ password: "", confirm: "" });
  const [pwErrors, setPwErrors] = useState<Record<string, string>>({});
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    if (profile) setForm({ full_name: profile.full_name, username: profile.username, institution: profile.institution ?? "", bio: profile.bio ?? "" });
  }, [profile]);

  if (!profile || !user) return <PageLoader />;

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (form.full_name.trim().length < 2 || form.full_name.trim().length > 80) errs.full_name = t("auth.nameRequired");
    if (!/^[a-z0-9_]{3,24}$/.test(form.username)) errs.username = t("profile.usernameRule");
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      await updateProfile(user.id, {
        full_name: form.full_name.trim(), username: form.username,
        institution: form.institution.trim() || null, bio: form.bio.trim() || null,
      });
      await refreshProfile();
      toast.success(t("profile.updated"));
    } catch (err) {
      const msg = friendlyError(err, t);
      if (msg === t("profile.usernameTaken")) setErrors({ username: msg }); else toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      await uploadAvatar(user.id, file);
      await refreshProfile();
      toast.success(t("profile.avatarUpdated"));
    } catch (err) {
      toast.error(friendlyError(err, t));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const savePassword = async (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!isStrongPassword(pw.password)) errs.password = t("auth.passwordRule");
    if (pw.password !== pw.confirm) errs.confirm = t("auth.passwordMismatch");
    setPwErrors(errs);
    if (Object.keys(errs).length) return;
    setPwSaving(true);
    try {
      await changePassword(pw.password);
      setPw({ password: "", confirm: "" });
      toast.success(t("profile.passwordChanged"));
    } catch (err) {
      toast.error(friendlyError(err, t));
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div className="page max-w-3xl">
      <Link to="/profile" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate hover:text-ink"><ArrowLeft className="size-4" />{t("nav.profile")}</Link>
      <SectionTitle title={t("profile.editProfile")} />

      <form onSubmit={saveProfile} noValidate className="surface space-y-5 p-6 sm:p-8">
        <div className="flex items-center gap-5">
          <Avatar name={profile.full_name || profile.username} url={profile.avatar_url} size={80} />
          <div>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" id="avatar" onChange={(e) => onFile(e.target.files?.[0])} />
            <Button type="button" variant="outline" size="sm" loading={uploading} onClick={() => fileRef.current?.click()}><Camera /> {t("profile.uploadAvatar")}</Button>
            <p className="mt-1.5 text-xs text-slate">{t("profile.avatarRule")}</p>
          </div>
        </div>
        <Field label={t("auth.fullName")} htmlFor="full_name" error={errors.full_name}>
          <Input id="full_name" value={form.full_name} maxLength={80} invalid={Boolean(errors.full_name)} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        </Field>
        <Field label={t("profile.username")} htmlFor="username" error={errors.username} hint={t("profile.usernameRule")}>
          <Input id="username" value={form.username} maxLength={24} className="font-mono" invalid={Boolean(errors.username)}
            onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })} />
        </Field>
        <Field label={<>{t("profile.institution")} <span className="normal-case tracking-normal">({t("common.optional")})</span></>} htmlFor="institution">
          <Input id="institution" value={form.institution} maxLength={120} onChange={(e) => setForm({ ...form, institution: e.target.value })} />
        </Field>
        <Field label={<>{t("profile.bio")} <span className="normal-case tracking-normal">({t("common.optional")})</span></>} htmlFor="bio">
          <Textarea id="bio" value={form.bio} maxLength={280} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
        </Field>
        <p className="text-sm text-slate">{t("auth.email")}: <span className="font-mono">{user.email}</span></p>
        <div className="flex justify-end"><Button type="submit" variant="ink" loading={saving}>{t("common.save")}</Button></div>
      </form>

      <form onSubmit={savePassword} noValidate className="surface mt-6 space-y-5 p-6 sm:p-8">
        <h2 className="font-heading text-lg font-bold">{t("profile.changePassword")}</h2>
        <Field label={t("auth.newPassword")} htmlFor="np" error={pwErrors.password} hint={t("auth.passwordRule")}>
          <PasswordInput id="np" autoComplete="new-password" value={pw.password} invalid={Boolean(pwErrors.password)} onChange={(e) => setPw({ ...pw, password: e.target.value })} />
        </Field>
        <Field label={t("auth.confirmPassword")} htmlFor="npc" error={pwErrors.confirm}>
          <PasswordInput id="npc" autoComplete="new-password" value={pw.confirm} invalid={Boolean(pwErrors.confirm)} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
        </Field>
        <div className="flex justify-end"><Button type="submit" variant="ink" loading={pwSaving}>{t("auth.updatePassword")}</Button></div>
      </form>
    </div>
  );
}
