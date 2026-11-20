import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Code2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/i18n";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { LanguageSwitch } from "./LanguageSwitch";
import { NotificationsBell, UserMenu } from "./UserMenu";
import { NAV_ITEMS } from "./nav";
import { cn } from "@/lib/utils";
import { isSupabaseConfigured } from "@/lib/supabase";

function TopBar() {
  const { user, loading } = useAuth();
  const { t } = useI18n();
  const { pathname } = useLocation();
  return (
    <header className="sticky top-0 z-40 border-b border-ink-700 bg-ink text-paper">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="mr-2 shrink-0" aria-label="CampusCode home"><Logo variant="lockup" dark /></Link>
        <nav className="hidden flex-1 items-center gap-1 md:flex" aria-label="Main">
          {NAV_ITEMS.filter((n) => n.to !== "/ide").map((n) => (
            <NavLink key={n.to} to={n.to}
              className={cn("rounded px-3 py-1.5 text-sm font-semibold transition-colors",
                n.match(pathname) ? "bg-ink-700 text-paper" : "text-paper/60 hover:text-paper")}>
              {t(n.key)}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Button asChild size="sm" className="hidden md:inline-flex"><Link to="/ide"><Code2 /> {t("nav.ide")}</Link></Button>
          <LanguageSwitch dark />
          {!loading && (user ? (<><NotificationsBell dark /><UserMenu dark /></>) : (
            <Button asChild variant="outline-dark" size="sm"><Link to="/login">{t("nav.signIn")}</Link></Button>
          ))}
        </div>
      </div>
    </header>
  );
}

/** Mobile bottom navigation — five destinations, IDE raised in the centre (slide 15). */
export function BottomNav() {
  const { t } = useI18n();
  const { pathname } = useLocation();
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper pb-[var(--safe-bottom)] md:hidden">
      <ul className="mx-auto grid h-16 max-w-md grid-cols-5">
        {NAV_ITEMS.map((n) => {
          const active = n.match(pathname);
          if (n.to === "/ide") {
            return (
              <li key={n.to} className="relative flex justify-center">
                <Link to="/ide" aria-label={t("nav.ide")} aria-current={active ? "page" : undefined}
                  className="absolute -top-5 flex flex-col items-center">
                  <span className={cn("flex size-14 items-center justify-center rounded-full bg-lime font-mono text-base font-bold text-ink shadow-lift ring-4 ring-paper",
                    active && "ring-ink/10")}>&lt;/&gt;</span>
                  <span className="mt-0.5 text-[11px] font-bold text-ink">{t("nav.ide")}</span>
                </Link>
              </li>
            );
          }
          const Icon = n.icon;
          return (
            <li key={n.to}>
              <Link to={n.to} aria-current={active ? "page" : undefined}
                className={cn("flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
                  active ? "text-ink" : "text-slate")}>
                <Icon className={cn("size-5", active && "stroke-[2.4]")} aria-hidden />
                {t(n.key)}
                <span className={cn("mt-0.5 h-0.5 w-4 rounded-full", active ? "bg-lime" : "bg-transparent")} />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function SetupBanner() {
  const { t } = useI18n();
  if (isSupabaseConfigured) return null;
  return (
    <div className="bg-warning px-4 py-2 text-center text-xs font-semibold text-white" role="status">
      {t("error.notConfigured")} — see README → Supabase setup.
    </div>
  );
}

export function AppShell() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SetupBanner />
      <TopBar />
      <main id="main" className="flex-1"><Outlet /></main>
      <BottomNav />
    </div>
  );
}
