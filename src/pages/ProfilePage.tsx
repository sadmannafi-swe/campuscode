import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight, Award, BookOpen, CheckCircle2, FileCode2, Flame, ListChecks, LogOut, Minus, Play, Plus, Target, Trophy } from "lucide-react";

const ACHIEVEMENT_ICONS: Record<string, typeof Award> = {
  play: Play, "check-circle": CheckCircle2, "book-open": BookOpen, target: Target, trophy: Trophy, flame: Flame, award: Award,
};
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";
import { DifficultyBadge, ErrorState, ProgressBar, Skeleton, Switch } from "@/components/ui/misc";
import { Avatar } from "@/components/common/Avatar";
import { DeveloperCredit } from "@/components/brand/DeveloperCredit";
import { MyCertificates } from "@/components/certificates/MyCertificates";
import {
  getActivity, getStats, listAchievements, listMyAchievements, listSolved, updateProfile, type ProfilePatch,
} from "@/services/profile";
import { getCourseProgress, listCourses } from "@/services/courses";
import { listSnippets } from "@/services/snippets";
import { friendlyError } from "@/lib/errors";
import { cn, formatDate, langLabel, pick, relativeTime } from "@/lib/utils";
import type { DailyActivity, Difficulty } from "@/types/db";

function PrefRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-[72px] items-center justify-between gap-4 border-b border-line py-4">
      <span className="font-heading text-lg font-bold">{label}</span>
      <div className="flex items-center gap-2 font-mono text-[15px] text-slate">{children}</div>
    </div>
  );
}

function Heatmap({ days }: { days: DailyActivity[] }) {
  const map = new Map(days.map((d) => [d.activity_date, d.runs + d.submissions + d.lessons_completed]));
  const cells: { date: string; v: number }[] = [];
  const today = new Date();
  for (let i = 83; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400000).toISOString().slice(0, 10);
    cells.push({ date: d, v: map.get(d) ?? 0 });
  }
  const tone = (v: number) => (v === 0 ? "bg-line" : v < 3 ? "bg-lime/40" : v < 8 ? "bg-lime/70" : "bg-lime");
  return (
    <div className="grid w-fit max-w-full grid-flow-col grid-rows-7 gap-1 overflow-x-auto" role="img" aria-label="Activity heatmap">
      {cells.map((c) => <span key={c.date} title={`${c.date}: ${c.v}`} className={cn("size-3 rounded-[2px] sm:size-3.5", tone(c.v))} />)}
    </div>
  );
}

export default function ProfilePage() {
  const { t, lang, setLang, n } = useI18n();
  const { user, profile, refreshProfile, signOut } = useAuth();
  const nav = useNavigate();
  const uid = user!.id;
  const stats = useQuery({ queryKey: ["stats", uid], queryFn: () => getStats(uid) });
  const achievements = useQuery({ queryKey: ["achievements"], queryFn: listAchievements, staleTime: 600_000 });
  const mine = useQuery({ queryKey: ["my-achievements", uid], queryFn: () => listMyAchievements(uid) });
  const activity = useQuery({ queryKey: ["activity", uid], queryFn: () => getActivity(uid) });
  const solved = useQuery({ queryKey: ["solved", uid], queryFn: () => listSolved(uid) });
  const courses = useQuery({ queryKey: ["courses"], queryFn: listCourses });
  const progress = useQuery({ queryKey: ["progress", "courses", uid], queryFn: getCourseProgress });
  const snippets = useQuery({ queryKey: ["snippets", uid], queryFn: () => listSnippets(uid, 5) });

  if (!profile) return <div className="page"><Skeleton className="h-80" /></div>;

  const save = async (patch: ProfilePatch) => {
    try {
      await updateProfile(uid, patch);
      if (patch.preferred_language) setLang(patch.preferred_language);
      await refreshProfile();
    } catch (e) {
      toast.error(friendlyError(e, t));
    }
  };

  const s = stats.data;
  const earned = new Map((mine.data ?? []).map((a) => [a.achievement_id, a.awarded_at]));
  const name = profile.full_name || profile.username;

  return (
    <div className="page">
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(300px,420px)_1fr] lg:gap-16">
        {/* Identity card (slide 14 left) */}
        <section className="flex flex-col items-center rounded-md bg-ink px-6 py-10 text-center text-paper">
          <Avatar name={name} url={profile.avatar_url} size={150} className="text-[54px]" />
          <h1 className="mt-6 text-[28px] font-bold">{name}</h1>
          <p className="mt-1 font-mono text-sm text-paper/50">@{profile.username}</p>
          <p className="mt-3 font-mono text-[15px] text-lime">
            {t("profile.learner", { lang: langLabel("c"), n: s?.lessons_completed ?? 0 })}
          </p>
          <p className="mt-2 text-xs text-paper/50">{t("profile.joined", { date: formatDate(profile.created_at, lang) })}{profile.institution && ` · ${profile.institution}`}</p>
          {profile.bio && <p className="mt-4 max-w-xs text-sm text-paper/70">{profile.bio}</p>}
          <Button asChild variant="subtle-dark" className="mt-8 w-full max-w-[290px]"><Link to="/profile/settings">{t("profile.editProfile")}</Link></Button>
        </section>

        {/* Preferences (slide 14 right) */}
        <section aria-label={t("profile.preferences")}>
          <PrefRow label={t("profile.interfaceLanguage")}>
            <div className="inline-flex rounded border border-line bg-white p-0.5 font-sans text-sm font-semibold">
              {(["bn", "en"] as const).map((l) => (
                <button key={l} onClick={() => save({ preferred_language: l })} aria-pressed={lang === l}
                  className={cn("rounded-sm px-3 py-1", l === "bn" && "font-bn", lang === l ? "bg-ink text-paper" : "text-slate")}>{l === "bn" ? "বাংলা" : "English"}</button>
              ))}
            </div>
          </PrefRow>
          <PrefRow label={t("profile.editorTheme")}>
            <div className="inline-flex rounded border border-line bg-white p-0.5 text-sm">
              {(["ink-dark", "paper-light"] as const).map((th) => (
                <button key={th} onClick={() => save({ editor_theme: th })} aria-pressed={profile.editor_theme === th}
                  className={cn("rounded-sm px-3 py-1", profile.editor_theme === th ? "bg-ink text-paper" : "text-slate")}>
                  {th === "ink-dark" ? t("profile.inkDark") : t("profile.paperLight")}
                </button>
              ))}
            </div>
          </PrefRow>
          <PrefRow label={t("profile.fontSize")}>
            <Button variant="outline" size="icon-sm" aria-label="−" disabled={profile.editor_font_size <= 12} onClick={() => save({ editor_font_size: profile.editor_font_size - 1 })}><Minus /></Button>
            <span className="w-14 text-center">{n(profile.editor_font_size)} px</span>
            <Button variant="outline" size="icon-sm" aria-label="+" disabled={profile.editor_font_size >= 22} onClick={() => save({ editor_font_size: profile.editor_font_size + 1 })}><Plus /></Button>
          </PrefRow>
          <PrefRow label={t("profile.autoSave")}>
            <span className={profile.auto_save ? "text-solved" : ""}>{profile.auto_save ? t("profile.on") : t("profile.off")}</span>
            <Switch label={t("profile.autoSave")} checked={profile.auto_save} onCheckedChange={(v) => save({ auto_save: v })} />
          </PrefRow>
        </section>
      </div>

      {/* Stats */}
      <section className="mt-12">
        <h2 className="mb-4 font-heading text-xl font-bold">{t("profile.stats")}</h2>
        {stats.isError ? <ErrorState message={friendlyError(stats.error, t)} /> : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              [t("profile.problemsSolved"), s?.problems_solved], [t("profile.accepted"), s?.accepted_submissions],
              [t("profile.submissions"), s?.total_submissions], [t("profile.runs"), s?.total_runs],
              [t("profile.lessons"), s?.lessons_completed], [t("profile.streak"), t("profile.days", { n: s?.current_streak ?? 0 })],
              [t("profile.longest"), t("profile.days", { n: s?.longest_streak ?? 0 })],
            ].map(([label, value]) => (
              <div key={String(label)} className="surface p-4">
                <p className="font-heading text-2xl font-extrabold">{typeof value === "number" ? n(value) : value ?? n(0)}</p>
                <p className="mt-1 text-xs text-slate">{label}</p>
              </div>
            ))}
          </div>
        )}
        <div className="surface mt-3 p-4">
          <p className="eyebrow mb-3">{t("profile.activity")}</p>
          {activity.isLoading ? <Skeleton className="h-24" /> : <Heatmap days={activity.data ?? []} />}
        </div>
      </section>

      {/* Achievements */}
      <section className="mt-12">
        <h2 className="mb-4 font-heading text-xl font-bold">{t("profile.achievements")}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {(achievements.data ?? []).map((a) => {
            const at = earned.get(a.id);
            const Icon = ACHIEVEMENT_ICONS[a.icon] ?? Award;
            return (
              <div key={a.id} className={cn("rounded-md border p-4", at ? "border-ink bg-ink text-paper" : "border-dashed border-line bg-white/50 text-slate")}>
                <Icon className={cn("size-5", at ? "text-lime" : "")} aria-hidden />
                <p className="mt-3 text-sm font-bold">{pick(a, "title", lang)}</p>
                <p className={cn("mt-1 text-xs", at ? "text-paper/60" : "")}>{at ? formatDate(at, lang) : t("profile.locked")}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Certificates of Completion */}
      <MyCertificates userId={uid} />

      <div className="mt-12 grid gap-8 lg:grid-cols-2">
        {/* Learning progress */}
        <section>
          <h2 className="mb-4 font-heading text-xl font-bold">{t("profile.learning")}</h2>
          <div className="space-y-3">
            {(courses.data ?? []).map((c) => {
              const p = progress.data?.find((x) => x.course_id === c.id);
              return (
                <Link key={c.id} to={`/learn/${c.slug}`} className="surface block p-4 hover:border-ink/30">
                  <div className="flex justify-between text-sm font-semibold"><span>{pick(c, "title", lang)}</span><span className="font-mono text-xs text-slate">{n(p?.completed ?? 0)}/{n(p?.total ?? 0)}</span></div>
                  <ProgressBar className="mt-3" value={p?.completed ?? 0} max={p?.total ?? 1} />
                </Link>
              );
            })}
          </div>
        </section>

        {/* Solved problems */}
        <section>
          <h2 className="mb-4 font-heading text-xl font-bold">{t("profile.solvedProblems")}</h2>
          <div className="surface p-2">
            {solved.isLoading ? <Skeleton className="h-24" /> : (solved.data ?? []).length === 0 ? <p className="p-3 text-sm text-slate">{t("profile.noSolved")}</p> : (
              <ul className="max-h-72 divide-y divide-line overflow-y-auto">
                {solved.data!.map((x) => x.problems && (
                  <li key={x.problems.slug}><Link to={`/problems/${x.problems.slug}`} className="flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-paper">
                    <span className="flex-1 truncate font-semibold">{x.problems.title}</span>
                    <DifficultyBadge difficulty={x.problems.difficulty as Difficulty} />
                    <span className="mono-meta hidden w-24 text-right sm:block">{relativeTime(x.solved_at, lang)}</span>
                  </Link></li>
                ))}
              </ul>
            )}
          </div>
          <Button asChild variant="link" className="mt-3"><Link to="/submissions"><ListChecks className="mr-1" />{t("profile.viewSubmissions")}</Link></Button>
        </section>
      </div>

      {/* Saved snippets */}
      <section className="mt-12">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-heading text-xl font-bold">{t("profile.savedSnippets")}</h2>
          <Link to="/snippets" className="inline-flex items-center gap-1 text-sm font-semibold text-slate hover:text-ink">{t("common.viewAll")} <ArrowRight className="size-4" /></Link>
        </div>
        {(snippets.data ?? []).length === 0 ? <p className="text-sm text-slate">{t("snippets.empty")}</p> : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {snippets.data!.slice(0, 3).map((sn) => (
              <Link key={sn.id} to={`/ide?snippet=${sn.id}`} className="rounded-md bg-ink p-4 text-paper hover:bg-ink-800">
                <FileCode2 className="size-4 text-lime" />
                <p className="mt-2 truncate font-semibold">{sn.title}</p>
                <p className="mt-1 font-mono text-xs text-paper/50">{langLabel(sn.language)} · {relativeTime(sn.updated_at, lang)}</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Account */}
      <section className="mt-12 flex flex-wrap gap-3 border-t border-line pt-6">
        <Button asChild variant="outline"><Link to="/profile/settings">{t("profile.changePassword")}</Link></Button>
        <Button variant="outline" onClick={async () => { await signOut(); nav("/"); }}><LogOut /> {t("nav.signOut")}</Button>
      </section>

      <footer className="mt-12">
        <DeveloperCredit />
      </footer>
    </div>
  );
}
