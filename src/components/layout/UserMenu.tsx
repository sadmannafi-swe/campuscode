import { Link, useNavigate } from "react-router-dom";
import { Bell, Code2, FileCode2, LogOut, Settings, Shield, User, ListChecks, PenSquare } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/i18n";
import { Menu, MenuItem, MenuLabel, MenuSeparator } from "@/components/ui/menu";
import { Avatar } from "@/components/common/Avatar";
import { Button } from "@/components/ui/button";
import { listNotifications, markNotificationsRead } from "@/services/profile";
import { cn, relativeTime } from "@/lib/utils";

export function UserMenu({ dark }: { dark?: boolean }) {
  const { profile, isAdmin, signOut } = useAuth();
  const { t } = useI18n();
  const nav = useNavigate();
  if (!profile) return null;
  return (
    <Menu dark={dark} trigger={
      <button className="rounded-full" aria-label={t("nav.profile")}>
        <Avatar name={profile.full_name || profile.username} url={profile.avatar_url} size={32} />
      </button>
    }>
      <MenuLabel>@{profile.username}</MenuLabel>
      <MenuItem dark={dark} onSelect={() => nav("/profile")}><User /> {t("nav.profile")}</MenuItem>
      <MenuItem dark={dark} onSelect={() => nav("/snippets")}><FileCode2 /> {t("nav.snippets")}</MenuItem>
      <MenuItem dark={dark} onSelect={() => nav("/submissions")}><ListChecks /> {t("nav.submissions")}</MenuItem>
      <MenuItem dark={dark} onSelect={() => nav("/problems/mine")}><PenSquare /> {t("nav.myProblems")}</MenuItem>
      <MenuItem dark={dark} onSelect={() => nav("/profile/settings")}><Settings /> {t("nav.settings")}</MenuItem>
      {isAdmin && (<><MenuSeparator dark={dark} /><MenuItem dark={dark} onSelect={() => nav("/admin")}><Shield /> {t("nav.admin")}</MenuItem></>)}
      <MenuSeparator dark={dark} />
      <MenuItem dark={dark} onSelect={async () => { await signOut(); nav("/"); }}><LogOut /> {t("nav.signOut")}</MenuItem>
    </Menu>
  );
}

export function NotificationsBell({ dark }: { dark?: boolean }) {
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const nav = useNavigate();
  const { data } = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: Boolean(user),
    queryFn: () => listNotifications(user!.id),
    refetchInterval: 120_000,
  });
  if (!user) return null;
  const unread = (data ?? []).filter((n) => !n.read_at).length;
  return (
    <Menu dark={dark} trigger={
      <Button variant={dark ? "ghost-dark" : "ghost"} size="icon-sm" aria-label={`${t("nav.notifications")}${unread ? ` (${unread})` : ""}`} className="relative">
        <Bell />
        {unread > 0 && <span className="absolute right-1 top-1 size-2 rounded-full bg-lime ring-2 ring-ink" />}
      </Button>
    }>
      <div className="flex items-center justify-between px-2.5 py-1.5">
        <span className="eyebrow">{t("notif.title")}</span>
        {unread > 0 && (
          <button className="text-xs font-semibold underline decoration-lime underline-offset-2"
            onClick={async () => { await markNotificationsRead(user.id); qc.invalidateQueries({ queryKey: ["notifications"] }); }}>
            {t("notif.markAll")}
          </button>
        )}
      </div>
      {(data ?? []).length === 0 && <p className={cn("px-2.5 py-4 text-sm", dark ? "text-paper/60" : "text-slate")}>{t("notif.empty")}</p>}
      <div className="max-h-80 w-[min(320px,85vw)] overflow-y-auto">
        {(data ?? []).slice(0, 12).map((n) => (
          <MenuItem key={n.id} dark={dark} onSelect={() => n.link && nav(n.link)}>
            <div className="min-w-0">
              <p className={cn("truncate text-sm", !n.read_at && "font-semibold")}>{n.title}</p>
              {n.body && <p className="line-clamp-2 text-xs text-slate">{n.body}</p>}
              <p className="mono-meta mt-0.5">{relativeTime(n.created_at, lang)}</p>
            </div>
          </MenuItem>
        ))}
      </div>
    </Menu>
  );
}

export function IdeQuickLink() {
  const { t } = useI18n();
  return (
    <Button asChild size="sm" className="hidden md:inline-flex">
      <Link to="/ide"><Code2 /> {t("nav.ide")}</Link>
    </Button>
  );
}
