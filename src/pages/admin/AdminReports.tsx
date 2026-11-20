import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { listReports, moderateProblem, resolveReport, type ReportRow } from "@/services/admin";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { NativeSelect, Textarea } from "@/components/ui/input";
import { Badge, EmptyState, ErrorState, PageLoader } from "@/components/ui/misc";
import { friendlyError } from "@/lib/errors";
import { relativeTime } from "@/lib/utils";

export default function AdminReports() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [status, setStatus] = useState<"open" | "resolved" | "dismissed" | "all">("open");
  const [active, setActive] = useState<ReportRow | null>(null);
  const [note, setNote] = useState("");
  const q = useQuery({ queryKey: ["admin", "reports", status], queryFn: () => listReports(status) });
  const act = useMutation({
    mutationFn: async (a: { kind: "resolved" | "dismissed"; remove?: boolean }) => {
      if (a.remove) await moderateProblem(active!.problem_id, "removed", note || "Removed after a report.");
      await resolveReport(active!.id, user!.id, a.kind, note);
    },
    onSuccess: () => { toast.success("Report updated"); setActive(null); setNote(""); qc.invalidateQueries({ queryKey: ["admin"] }); },
    onError: (e) => toast.error(friendlyError(e, t)),
  });
  return (
    <div className="surface p-5 sm:p-8">
      <h1 className="mb-6 text-3xl font-extrabold">Reports</h1>
      <div className="mb-4 w-48">
        <NativeSelect value={status} onChange={(e) => setStatus(e.target.value as typeof status)} aria-label="Status">
          {["open", "resolved", "dismissed", "all"].map((s) => <option key={s} value={s}>{s}</option>)}
        </NativeSelect>
      </div>
      {q.isLoading ? <PageLoader /> : q.isError ? <ErrorState message={friendlyError(q.error, t)} /> : q.data!.length === 0 ? <EmptyState title="No reports here" /> : (
        <ul className="divide-y divide-line border-t border-line">
          {q.data!.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 py-4">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{r.problems ? <Link className="hover:underline" to={`/problems/${r.problems.slug}`}>{r.problems.title}</Link> : "Deleted problem"}</p>
                <p className="text-sm text-slate">{t(`problems.reason.${r.reason}`)}{r.details && ` — ${r.details}`}</p>
                <p className="mono-meta">@{r.profiles?.username} · {relativeTime(r.created_at, lang)}{r.admin_note && ` · note: ${r.admin_note}`}</p>
              </div>
              <Badge tone={r.status === "open" ? "warning" : "neutral"}>{r.status}</Badge>
              {r.status === "open" && <Button size="sm" variant="outline" onClick={() => setActive(r)}>Review</Button>}
            </li>
          ))}
        </ul>
      )}
      <Dialog open={Boolean(active)} onOpenChange={(o) => !o && setActive(null)} title="Review report" description={active?.problems?.title}
        footer={<>
          <Button variant="outline" onClick={() => act.mutate({ kind: "dismissed" })} loading={act.isPending}>Dismiss</Button>
          <Button variant="ink" onClick={() => act.mutate({ kind: "resolved" })} loading={act.isPending}>Mark resolved</Button>
          <Button variant="danger" onClick={() => act.mutate({ kind: "resolved", remove: true })} loading={act.isPending}>Remove problem</Button>
        </>}>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Internal note (also sent to the author if the problem is removed)" maxLength={1000} />
      </Dialog>
    </div>
  );
}
