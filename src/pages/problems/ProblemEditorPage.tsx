import { useParams, useNavigate, Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/i18n";
import { ErrorState, PageLoader, SectionTitle } from "@/components/ui/misc";
import { ProblemForm, emptyProblem, fromProblem, testsFrom, type ProblemFormValue } from "@/components/problems/ProblemForm";
import { getAllTestsForEditing, getProblemBySlug, listTopics, saveProblem, type TestDraft } from "@/services/problems";
import { friendlyError } from "@/lib/errors";
import { slugify } from "@/lib/utils";
import NotFoundPage from "../NotFoundPage";

export default function ProblemEditorPage() {
  const { slug } = useParams();
  const { t } = useI18n();
  const { user, isAdmin } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const topics = useQuery({ queryKey: ["topics"], queryFn: listTopics, staleTime: 600_000 });
  const existing = useQuery({
    queryKey: ["problem-edit", slug],
    enabled: Boolean(slug),
    queryFn: async () => {
      const p = await getProblemBySlug(slug!);
      if (!p) return null;
      return { problem: p, tests: await getAllTestsForEditing(p.id) };
    },
  });

  const save = useMutation({
    mutationFn: ({ v, tests }: { v: ProblemFormValue; tests: TestDraft[] }) => {
      const { status: _s, is_official: _o, is_featured: _f, ...draft } = v;
      return saveProblem(draft, tests, { id: existing.data?.problem.id, slugBase: slugify(v.title), authorId: user!.id });
    },
    onSuccess: (p) => {
      toast.success(t("editor.saved"));
      qc.invalidateQueries({ queryKey: ["problems"] });
      qc.invalidateQueries({ queryKey: ["problem", p.slug] });
      nav(`/problems/${p.slug}`);
    },
    onError: (e) => toast.error(friendlyError(e, t)),
  });

  if (slug && existing.isLoading) return <PageLoader />;
  if (slug && existing.isError) return <div className="page"><ErrorState message={friendlyError(existing.error, t)} /></div>;
  if (slug && (!existing.data || (existing.data.problem.author_id !== user?.id && !isAdmin))) return <NotFoundPage />;

  return (
    <div className="min-h-full bg-ink">
      <div className="page">
        <Link to={slug ? `/problems/${slug}` : "/problems"} className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-paper/60 hover:text-paper"><ArrowLeft className="size-4" />{t("nav.back")}</Link>
        <SectionTitle dark title={slug ? t("editor.editTitle") : t("editor.createTitle")} subtitle={t("editor.createSubtitle")} />
        {topics.isLoading ? <PageLoader /> : (
          <ProblemForm topics={topics.data ?? []} saving={save.isPending}
            initial={existing.data ? fromProblem(existing.data.problem) : emptyProblem()}
            initialTests={existing.data ? testsFrom(existing.data.tests) : []}
            onSubmit={(v, tests) => save.mutate({ v, tests })} />
        )}
      </div>
    </div>
  );
}
