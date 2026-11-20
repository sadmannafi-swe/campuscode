import { lazy, Suspense, type ReactNode } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { I18nProvider } from "@/i18n";
import { AuthProvider } from "@/hooks/useAuth";
import { AppShell } from "@/components/layout/AppShell";
import { RequireAdmin, RequireAuth } from "@/components/layout/Guards";
import { PageLoader } from "@/components/ui/misc";
import { ScrollToTop } from "@/components/common/ScrollToTop";

const HomePage = lazy(() => import("@/pages/HomePage"));
const LoginPage = lazy(() => import("@/pages/auth/LoginPage"));
const RegisterPage = lazy(() => import("@/pages/auth/RegisterPage"));
const ForgotPasswordPage = lazy(() => import("@/pages/auth/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("@/pages/auth/ResetPasswordPage"));
const IdePage = lazy(() => import("@/pages/IdePage"));
const ProblemListPage = lazy(() => import("@/pages/problems/ProblemListPage"));
const ProblemDetailPage = lazy(() => import("@/pages/problems/ProblemDetailPage"));
const ProblemEditorPage = lazy(() => import("@/pages/problems/ProblemEditorPage"));
const MyProblemsPage = lazy(() => import("@/pages/problems/MyProblemsPage"));
const SubmissionsPage = lazy(() => import("@/pages/problems/SubmissionsPage"));
const LearnPage = lazy(() => import("@/pages/learn/LearnPage"));
const CoursePage = lazy(() => import("@/pages/learn/CoursePage"));
const LessonPage = lazy(() => import("@/pages/learn/LessonPage"));
const ChapterPage = lazy(() => import("@/pages/learn/ChapterPage"));
const PracticePage = lazy(() => import("@/pages/learn/PracticePage"));
const PracticeTopicPage = lazy(() => import("@/pages/learn/PracticeTopicPage"));
const SnippetsPage = lazy(() => import("@/pages/SnippetsPage"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));
const AdminApp = lazy(() => import("@/pages/admin/AdminApp"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
  },
});

const S = ({ children }: { children: ReactNode }) => <Suspense fallback={<PageLoader />}>{children}</Suspense>;

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <AuthProvider>
          <BrowserRouter>
            <ScrollToTop />
            <S>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/ide" element={<IdePage />} />
                <Route path="/admin/*" element={<RequireAdmin><AdminApp /></RequireAdmin>} />
                <Route element={<AppShell />}>
                  <Route index element={<S><HomePage /></S>} />
                  <Route path="problems" element={<S><ProblemListPage /></S>} />
                  <Route path="problems/new" element={<RequireAuth><S><ProblemEditorPage /></S></RequireAuth>} />
                  <Route path="problems/mine" element={<RequireAuth><S><MyProblemsPage /></S></RequireAuth>} />
                  <Route path="problems/:slug" element={<S><ProblemDetailPage /></S>} />
                  <Route path="problems/:slug/edit" element={<RequireAuth><S><ProblemEditorPage /></S></RequireAuth>} />
                  <Route path="submissions" element={<RequireAuth><S><SubmissionsPage /></S></RequireAuth>} />
                  <Route path="learn" element={<S><LearnPage /></S>} />
                  <Route path="learn/:courseSlug" element={<S><CoursePage /></S>} />
                  <Route path="learn/:courseSlug/chapter/:chapterSlug" element={<S><ChapterPage /></S>} />
                  <Route path="learn/:courseSlug/:lessonSlug" element={<S><LessonPage /></S>} />
                  <Route path="practice" element={<S><PracticePage /></S>} />
                  <Route path="practice/:topicSlug" element={<S><PracticeTopicPage /></S>} />
                  <Route path="snippets" element={<RequireAuth><S><SnippetsPage /></S></RequireAuth>} />
                  <Route path="profile" element={<RequireAuth><S><ProfilePage /></S></RequireAuth>} />
                  <Route path="profile/settings" element={<RequireAuth><S><SettingsPage /></S></RequireAuth>} />
                  <Route path="*" element={<S><NotFoundPage /></S>} />
                </Route>
              </Routes>
            </S>
          </BrowserRouter>
          <Toaster position="top-center" toastOptions={{ className: "font-sans" }} richColors closeButton />
        </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}
