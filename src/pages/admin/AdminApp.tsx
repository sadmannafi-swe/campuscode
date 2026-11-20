import { lazy, Suspense } from "react";
import { NavLink, Route, Routes, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useI18n } from "@/i18n";
import { PageLoader } from "@/components/ui/misc";
import { cn } from "@/lib/utils";
import NotFoundPage from "../NotFoundPage";

const AdminDashboard = lazy(() => import("./AdminDashboard"));
const AdminProblems = lazy(() => import("./AdminProblems"));
const AdminProblemEdit = lazy(() => import("./AdminProblemEdit"));
const AdminLessons = lazy(() => import("./AdminLessons"));
const AdminLessonEdit = lazy(() => import("./AdminLessonEdit"));
const AdminRoadmap = lazy(() => import("./AdminRoadmap"));
const AdminUsers = lazy(() => import("./AdminUsers"));
const AdminReports = lazy(() => import("./AdminReports"));
const AdminAnnouncements = lazy(() => import("./AdminAnnouncements"));
const AdminSettings = lazy(() => import("./AdminSettings"));

const NAV = [
  { to: "/admin", key: "admin.dashboard", end: true },
  { to: "/admin/problems", key: "admin.problems" },
  { to: "/admin/lessons", key: "admin.lessons" },
  { to: "/admin/roadmap", key: "admin.roadmap" },
  { to: "/admin/users", key: "admin.users" },
  { to: "/admin/reports", key: "admin.reports" },
  { to: "/admin/announcements", key: "admin.announcements" },
  { to: "/admin/settings", key: "admin.settings" },
] as const;

/** Protected admin area (RequireAdmin wraps this route). Never linked from the student navigation. */
export default function AdminApp() {
  const { t } = useI18n();
  return (
    <div className="min-h-dvh bg-paper lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="bg-ink text-paper lg:sticky lg:top-0 lg:h-dvh">
        <div className="flex items-center justify-between px-5 py-4 lg:block lg:px-8 lg:py-10">
          <p className="font-heading text-xl font-bold leading-tight lg:text-2xl">CampusCode<br className="hidden lg:block" /> Admin</p>
          <Link to="/" className="inline-flex items-center gap-1 text-xs text-paper/60 hover:text-paper lg:mt-4"><ArrowLeft className="size-3" />{t("admin.backToApp")}</Link>
        </div>
        <nav aria-label="Admin" className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:gap-2 lg:px-6">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={"end" in n}
              className={({ isActive }) => cn("shrink-0 rounded px-4 py-2.5 text-center text-sm font-bold transition-colors lg:py-3",
                isActive ? "bg-lime text-ink" : "text-paper hover:bg-ink-700")}>
              {t(n.key)}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="min-w-0 px-4 py-6 sm:px-8 lg:py-10">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route index element={<AdminDashboard />} />
            <Route path="problems" element={<AdminProblems />} />
            <Route path="problems/new" element={<AdminProblemEdit />} />
            <Route path="problems/:id" element={<AdminProblemEdit />} />
            <Route path="lessons" element={<AdminLessons />} />
            <Route path="lessons/new" element={<AdminLessonEdit />} />
            <Route path="lessons/:id" element={<AdminLessonEdit />} />
            <Route path="roadmap" element={<AdminRoadmap />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="announcements" element={<AdminAnnouncements />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}
