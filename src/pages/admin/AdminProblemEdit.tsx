import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/i18n";
import { ProblemForm, emptyProblem, fromProblem, testsFrom, type ProblemFormValue } from "@/components/problems/ProblemForm";
import { ErrorState, PageLoader } from "@/components/ui/misc";
import { getAllTestsForEditing, getProblemById, listTopics, saveProblem, type TestDraft } from "@/services/problems";
import { friendlyError } from "@/lib/errors";
import { slugify } from "@/lib/utils";

export default function AdminProblemEdit() {
  const { id } = useParams();
  const { t } = useI18n();
  const { user } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const topics = useQuery({ queryKey: ["topics"], queryFn: listTopics });
  const q = useQuery({
    queryKey: ["admin", "problem", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const p = await getProblemById(id!);
      if (!p) throw new Error("not found");
      return { problem: p, tests: await getAllTestsForEditing(p.id) };   // admin RLS: includes hidden tests
    },
  });
  const save = useMutation({
    mutationFn: ({ v, tests }: { v: ProblemFormValue; tests: TestDraft[] }) =>
      saveProblem(v, tests, { id, slugBase: slugify(v.title), authorId: user!.id }),
    onSuccess: () => { toast.success("Problem saved"); qc.invalidateQueries({ queryKey: ["admin"] }); qc.invalidateQueries({ queryKey: ["problems"] }); nav("/admin/problems"); },
    onError: (e) => toast.error(friendlyError(e, t)),
  });
  if ((id && q.isLoading) || topics.isLoading) return <PageLoader />;
  if (id && q.isError) return <ErrorState message={friendlyError(q.error, t)} />;
  const initial = q.data ? fromProblem(q.data.problem) : { ...emptyProblem(), visibility: "public" as const, status: "published" as const, is_official: true };
  return (
    <div>
      <Link to="/admin/problems" className="mb-4 inline-flex items-center gap-1 text-sm text-slate hover:text-ink"><ArrowLeft className="size-4" />Problems</Link>
      <h1 className="mb-6 text-3xl font-extrabold">{id ? `Edit: ${q.data?.problem.title}` : "New problem"}</h1>
      <ProblemForm admin topics={topics.data ?? []} initial={initial} initialTests={q.data ? testsFrom(q.data.tests) : []}
        saving={save.isPending} onSubmit={(v, tests) => save.mutate({ v, tests })} />
    </div>
  );
}
