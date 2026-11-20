import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, ExternalLink, Plus, Star, X } from "lucide-react";
import { listAllProblems, moderateProblem } from "@/services/admin";
import { listTopics } from "@/services/problems";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { NativeSelect, Textarea } from "@/components/ui/input";
import { Badge, EmptyState, ErrorState, PageLoader } from "@/components/ui/misc";
import { useI18n } from "@/i18n";
import { friendlyError } from "@/lib/errors";
import { cn } from "@/lib/utils";
import type { ProblemStatus } from "@/types/db";

const STATUS: (ProblemStatus | "all")[] = ["all", "published", "pending_review", "draft", "rejected", "removed"];
const tone = (s: ProblemStatus) => (s === "published" ? "lime" : s === "pending_review" ? "warning" : s === "rejected" || s === "removed" ? "error" : "neutral");

export default function AdminProblems() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const status = (params.get("status") as ProblemStatus | "all") ?? "all";
  const q = useQuery({ queryKey: ["admin", "problems", status], queryFn: () => listAllProblems(status) });
  const topics = useQuery({ queryKey: ["topics"], queryFn: listTopics });
  const [rejecting, setRejecting] = useState<{ id: string; title: string; to: ProblemStatus } | null>(null);
  const [note, setNote] = useState("");

  const moderate = useMutation({
    mutationFn: (a: { id: string; status: ProblemStatus; note?: string; featured?: boolean }) => moderateProblem(a.id, a.status, a.note, a.featured),
    onSuccess: () => { toast.success("Updated"); setRejecting(null); setNote(""); qc.invalidateQueries({ queryKey: ["admin"] }); qc.invalidateQueries({ queryKey: ["problems"] }); },
    onError: (e) => toast.error(friendlyError(e, t)),
  });

  return (
    <div className="surface p-5 sm:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold">Problem management</h1>
        <Button asChild variant="ink"><Link to="/admin/problems/new"><Plus /> New problem</Link></Button>
      </div>
      <div className="mb-4 w-56">
        <NativeSelect value={status} onChange={(e) => setParams(e.target.value === "all" ? {} : { status: e.target.value })} aria-label="Status filter">
          {STATUS.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
        </NativeSelect>
      </div>
      {q.isLoading ? <PageLoader /> : q.isError ? <ErrorState message={friendlyError(q.error, t)} onRetry={() => q.refetch()} /> : q.data!.length === 0 ? <EmptyState title="No problems" /> : (
        <ul className="divide-y divide-line border-t border-line">
          {q.data!.map((p) => (
            <li key={p.id} className="grid grid-cols-1 items-center gap-3 py-5 md:grid-cols-[1fr_140px_140px_auto]">
              <div className="min-w-0">
                <Link to={`/admin/problems/${p.id}`} className="font-heading text-lg font-bold hover:underline">{p.title}</Link>
                <p className="mono-meta">{p.is_official ? "official" : "community"} · {p.difficulty} · {p.submission_count} subs · {p.accepted_count} AC</p>
              </div>
              <span className="font-mono text-sm text-slate">{topics.data?.find((x) => x.id === p.topic_id)?.name_en ?? "—"}</span>
              <span><Badge tone={tone(p.status)} className="min-w-[110px] justify-center capitalize">{p.status.replace("_", " ")}</Badge></span>
              <div className="flex flex-wrap gap-1">
                {p.status !== "published" && <Button size="sm" variant="outline" onClick={() => moderate.mutate({ id: p.id, status: "published" })}><Check /> Approve</Button>}
                {p.status === "pending_review" && <Button size="sm" variant="outline" onClick={() => setRejecting({ id: p.id, title: p.title, to: "rejected" })}><X /> Reject</Button>}
                {p.status === "published" && <Button size="sm" variant="outline" onClick={() => setRejecting({ id: p.id, title: p.title, to: "removed" })}><X /> Remove</Button>}
                <Button size="icon-sm" variant="ghost" aria-label={p.is_featured ? "Unfeature" : "Feature"} title="Featured"
                  onClick={() => moderate.mutate({ id: p.id, status: p.status, featured: !p.is_featured })}>
                  <Star className={cn(p.is_featured && "fill-warning text-warning")} />
                </Button>
                {p.status === "published" && <Button asChild size="icon-sm" variant="ghost" aria-label="View"><Link to={`/problems/${p.slug}`}><ExternalLink /></Link></Button>}
              </div>
            </li>
          ))}
        </ul>
      )}
      <Dialog open={Boolean(rejecting)} onOpenChange={(o) => !o && setRejecting(null)} title={`${rejecting?.to === "removed" ? "Remove" : "Reject"} “${rejecting?.title}”`}
        description="The author is notified with this note."
        footer={<><Button variant="outline" onClick={() => setRejecting(null)}>Cancel</Button>
          <Button variant="danger" loading={moderate.isPending} onClick={() => rejecting && moderate.mutate({ id: rejecting.id, status: rejecting.to, note })}>Confirm</Button></>}>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason (shown to the author)" maxLength={500} />
      </Dialog>
    </div>
  );
}
