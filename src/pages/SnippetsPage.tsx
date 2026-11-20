import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Code2, FileCode2, MoreVertical, Pencil, Search, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Menu, MenuItem } from "@/components/ui/menu";
import { EmptyState, ErrorState, SectionTitle, Skeleton } from "@/components/ui/misc";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { deleteSnippet, listExecutionHistory, listSnippets, updateSnippet } from "@/services/snippets";
import { listTopics } from "@/services/problems";
import { friendlyError } from "@/lib/errors";
import { cn, formatTime, langLabel, pick, relativeTime } from "@/lib/utils";
import type { Lang, SavedCode } from "@/types/db";

export default function SnippetsPage() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [langFilter, setLangFilter] = useState<Lang | "">("");
  const [renaming, setRenaming] = useState<SavedCode | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [deleting, setDeleting] = useState<SavedCode | null>(null);

  const snippets = useQuery({ queryKey: ["snippets", user!.id], queryFn: () => listSnippets(user!.id) });
  const history = useQuery({ queryKey: ["history", user!.id, "full"], queryFn: () => listExecutionHistory(user!.id, 60) });
  const topics = useQuery({ queryKey: ["topics"], queryFn: listTopics, staleTime: 600_000 });
  const topicName = (id: string | null) => {
    const tp = topics.data?.find((x) => x.id === id);
    return tp ? pick(tp, "name", lang) : null;
  };

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (snippets.data ?? []).filter((x) => {
      if (langFilter && x.language !== langFilter) return false;
      if (!s) return true;
      const tn = topicName(x.topic_id)?.toLowerCase() ?? "";
      return x.title.toLowerCase().includes(s) || (x.description ?? "").toLowerCase().includes(s) || tn.includes(s);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snippets.data, q, langFilter, topics.data, lang]);

  const rename = useMutation({
    mutationFn: () => updateSnippet(renaming!.id, { title: newTitle.trim() }),
    onSuccess: () => { toast.success(t("snippets.renamed")); setRenaming(null); qc.invalidateQueries({ queryKey: ["snippets"] }); },
    onError: (e) => toast.error(friendlyError(e, t)),
  });
  const remove = useMutation({
    mutationFn: () => deleteSnippet(deleting!.id),
    onSuccess: () => { toast.success(t("snippets.deleted")); setDeleting(null); qc.invalidateQueries({ queryKey: ["snippets"] }); },
    onError: (e) => toast.error(friendlyError(e, t)),
  });

  return (
    <div className="min-h-full bg-ink text-paper">
      <div className="page">
        <SectionTitle dark title={t("snippets.title")} subtitle={t("snippets.subtitle")}
          action={<Button asChild><Link to="/ide"><Code2 /> {t("nav.ide")}</Link></Button>} />
        <Tabs defaultValue="saved">
          <TabsList dark className="mb-5">
            <TabsTrigger dark value="saved">{t("snippets.tabSaved")}</TabsTrigger>
            <TabsTrigger dark value="history">{t("snippets.tabHistory")}</TabsTrigger>
          </TabsList>

          <TabsContent value="saved">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-paper/40" aria-hidden />
                <Input tone="dark" className="h-14 border-ink-600 bg-ink-800 pl-11" placeholder={t("snippets.search")} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t("common.search")} />
              </div>
              <div className="flex gap-1.5" role="group" aria-label={t("common.language")}>
                {(["", "c", "python"] as const).map((l) => (
                  <button key={l || "all"} onClick={() => setLangFilter(l)} aria-pressed={langFilter === l}
                    className={cn("h-14 rounded px-5 text-sm font-bold sm:h-14", langFilter === l ? "bg-lime text-ink" : "bg-ink-700 text-paper")}>
                    {l ? langLabel(l) : t("common.all")}
                  </button>
                ))}
              </div>
            </div>
            {snippets.isLoading ? <div className="space-y-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 bg-ink-700" />)}</div>
              : snippets.isError ? <ErrorState dark message={friendlyError(snippets.error, t)} onRetry={() => snippets.refetch()} />
              : rows.length === 0 ? (
                <EmptyState dark icon={<FileCode2 className="size-6" />} title={q || langFilter ? t("snippets.noMatch") : t("snippets.empty")}
                  action={!q && !langFilter && <Button asChild><Link to="/ide">{t("home.openIde")}</Link></Button>} />
              ) : (
                <ul className="space-y-4">
                  {rows.map((s, i) => (
                    <li key={s.id} className={cn("flex items-center gap-3 rounded border border-ink-600 transition-colors hover:border-paper/30", i === 0 ? "bg-ink-700" : "bg-ink-800")}>
                      <Link to={`/ide?snippet=${s.id}`} className="min-w-0 flex-1 px-5 py-5 sm:px-8 sm:py-6">
                        <span className="block truncate font-heading text-lg font-bold">{s.title}</span>
                        <span className="mt-1 block font-mono text-sm text-lime">{topicName(s.topic_id) ?? langLabel(s.language)}</span>
                        {s.description && <span className="mt-1 block truncate text-sm text-paper/50">{s.description}</span>}
                      </Link>
                      <span className="hidden shrink-0 font-mono text-sm text-paper/50 sm:block">{relativeTime(s.updated_at, lang)}</span>
                      <div className="pr-3 sm:pr-5">
                        <Menu dark trigger={<Button variant="ghost-dark" size="icon-sm" aria-label={t("common.actions")}><MoreVertical /></Button>}>
                          <MenuItem dark onSelect={() => nav(`/ide?snippet=${s.id}`)}><Code2 /> {t("subs.openInIde")}</MenuItem>
                          <MenuItem dark onSelect={() => { setRenaming(s); setNewTitle(s.title); }}><Pencil /> {t("common.rename")}</MenuItem>
                          <MenuItem dark danger onSelect={() => setDeleting(s)}><Trash2 /> {t("common.delete")}</MenuItem>
                        </Menu>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
          </TabsContent>

          <TabsContent value="history">
            {history.isLoading ? <Skeleton className="h-40 bg-ink-700" /> : history.isError ? <ErrorState dark message={friendlyError(history.error, t)} />
              : (history.data ?? []).length === 0 ? <EmptyState dark title={t("snippets.historyEmpty")} />
              : (
                <ul className="divide-y divide-ink-600 rounded border border-ink-600 bg-ink-800">
                  {history.data!.map((h) => (
                    <li key={h.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm">
                      <span className="w-16 font-mono text-xs text-lime">{langLabel(h.language)}</span>
                      <span className="min-w-0 flex-1 truncate">
                        {h.problems ? <Link to={`/problems/${h.problems.slug}`} className="hover:underline">{h.problems.title}</Link>
                          : t(h.kind === "submit" ? "snippets.submit" : h.kind === "samples" ? "snippets.samples" : "snippets.run")}
                      </span>
                      <span className={cn("font-mono text-xs", /accept|passed/i.test(h.status) ? "text-lime" : "text-paper/60")}>{h.status.replace(/_/g, " ")}</span>
                      <span className="w-16 text-right font-mono text-xs text-paper/50">{formatTime(h.time_ms)}</span>
                      <span className="w-28 text-right font-mono text-xs text-paper/50">{relativeTime(h.created_at, lang)}</span>
                    </li>
                  ))}
                </ul>
              )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={Boolean(renaming)} onOpenChange={(o) => !o && setRenaming(null)} dark title={t("common.rename")}
        footer={<>
          <Button variant="outline-dark" onClick={() => setRenaming(null)}>{t("common.cancel")}</Button>
          <Button onClick={() => rename.mutate()} disabled={!newTitle.trim() || newTitle.length > 80} loading={rename.isPending}>{t("common.save")}</Button>
        </>}>
        <Input tone="dark" className="font-mono" value={newTitle} maxLength={80} autoFocus onChange={(e) => setNewTitle(e.target.value)} aria-label={t("ide.titleLabel")} />
      </Dialog>
      <ConfirmDialog open={Boolean(deleting)} onOpenChange={(o) => !o && setDeleting(null)} danger title={t("common.delete")}
        body={deleting ? t("snippets.deleteConfirm", { title: deleting.title }) : ""} confirmLabel={t("common.delete")}
        loading={remove.isPending} onConfirm={() => remove.mutate()} />
    </div>
  );
}
