import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, Shield, ShieldOff, UserCheck, UserX } from "lucide-react";
import { listUsers, setAdminRole, setUserStatus, type AdminUserRow } from "@/services/admin";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge, EmptyState, ErrorState, PageLoader } from "@/components/ui/misc";
import { Avatar } from "@/components/common/Avatar";
import { friendlyError } from "@/lib/errors";
import { formatDate } from "@/lib/utils";

type Action = { user: AdminUserRow; kind: "suspend" | "activate" | "grant" | "revoke" };

export default function AdminUsers() {
  const { t, lang } = useI18n();
  const { user: me } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [page, setPage] = useState(0);
  const [action, setAction] = useState<Action | null>(null);
  const q = useQuery({ queryKey: ["admin", "users", term, page], queryFn: () => listUsers(term, page) });
  const total = q.data?.[0]?.total_count ?? 0;

  const run = useMutation({
    mutationFn: async (a: Action) => {
      if (a.kind === "suspend") return setUserStatus(a.user.id, "suspended");
      if (a.kind === "activate") return setUserStatus(a.user.id, "active");
      return setAdminRole(a.user.id, a.kind === "grant");
    },
    onSuccess: () => { toast.success("Updated"); setAction(null); qc.invalidateQueries({ queryKey: ["admin", "users"] }); },
    onError: (e) => toast.error(friendlyError(e, t)),
  });

  return (
    <div className="surface p-5 sm:p-8">
      <h1 className="mb-6 text-3xl font-extrabold">Users</h1>
      <form className="relative mb-5 max-w-md" onSubmit={(e) => { e.preventDefault(); setPage(0); setTerm(search.trim()); }}>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate" />
        <Input className="pl-9" placeholder="Search name, username or email…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </form>
      {q.isLoading ? <PageLoader /> : q.isError ? <ErrorState message={friendlyError(q.error, t)} onRetry={() => q.refetch()} /> : q.data!.length === 0 ? <EmptyState title="No users found" /> : (
        <>
          <ul className="divide-y divide-line border-t border-line">
            {q.data!.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center gap-4 py-4">
                <Avatar name={u.full_name || u.username} url={u.avatar_url} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{u.full_name || "—"} <span className="font-normal text-slate">@{u.username}</span></p>
                  <p className="truncate font-mono text-xs text-slate">{u.email} · joined {formatDate(u.created_at, lang)} · {u.problems_solved} solved · {u.lessons_completed} lessons</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {u.is_admin && <Badge tone="ink">admin</Badge>}
                  <Badge tone={u.status === "active" ? "success" : "error"}>{u.status}</Badge>
                  {u.id !== me?.id && (
                    <>
                      {u.status === "active"
                        ? <Button size="sm" variant="outline" onClick={() => setAction({ user: u, kind: "suspend" })}><UserX /> Suspend</Button>
                        : <Button size="sm" variant="outline" onClick={() => setAction({ user: u, kind: "activate" })}><UserCheck /> Activate</Button>}
                      {u.is_admin
                        ? <Button size="sm" variant="ghost" onClick={() => setAction({ user: u, kind: "revoke" })}><ShieldOff /> Revoke admin</Button>
                        : <Button size="sm" variant="ghost" onClick={() => setAction({ user: u, kind: "grant" })}><Shield /> Make admin</Button>}
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center justify-between text-sm text-slate">
            <span>{total} users</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <Button size="sm" variant="outline" disabled={(page + 1) * 25 >= total} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        </>
      )}
      <ConfirmDialog open={Boolean(action)} onOpenChange={(o) => !o && setAction(null)} danger={action?.kind === "suspend" || action?.kind === "revoke"}
        title={action ? `${{ suspend: "Suspend", activate: "Activate", grant: "Grant admin to", revoke: "Revoke admin from" }[action.kind]} @${action.user.username}?` : ""}
        body={action?.kind === "grant" ? "Admins can manage all users, content and hidden test cases." : action?.kind === "suspend" ? "Suspended users can sign in but cannot run code, submit or create content." : undefined}
        loading={run.isPending} onConfirm={() => action && run.mutate(action)} />
    </div>
  );
}
