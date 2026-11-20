import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { deleteAnnouncement, listAnnouncements, saveAnnouncement } from "@/services/admin";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Dialog, ConfirmDialog } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Badge, EmptyState, ErrorState, PageLoader, Switch } from "@/components/ui/misc";
import { friendlyError } from "@/lib/errors";
import { formatDate } from "@/lib/utils";
import type { Announcement } from "@/types/db";

const blank = { title_en: "", title_bn: "", body_en: "", body_bn: "", link: "", is_active: true };

export default function AdminAnnouncements() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin", "announcements"], queryFn: listAnnouncements });
  const [editing, setEditing] = useState<(Partial<Announcement> & typeof blank) | null>(null);
  const [deleting, setDeleting] = useState<Announcement | null>(null);
  const save = useMutation({
    mutationFn: () => saveAnnouncement({
      ...editing!, title_en: editing!.title_en.trim(), title_bn: editing!.title_bn || null, body_bn: editing!.body_bn || null, link: editing!.link || null,
    }, user!.id),
    onSuccess: () => { toast.success("Saved"); setEditing(null); qc.invalidateQueries({ queryKey: ["admin", "announcements"] }); qc.invalidateQueries({ queryKey: ["announcements"] }); },
    onError: (e) => toast.error(friendlyError(e, t)),
  });
  const remove = useMutation({
    mutationFn: () => deleteAnnouncement(deleting!.id),
    onSuccess: () => { setDeleting(null); qc.invalidateQueries({ queryKey: ["admin", "announcements"] }); },
    onError: (e) => toast.error(friendlyError(e, t)),
  });
  return (
    <div className="surface p-5 sm:p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-extrabold">Announcements</h1>
        <Button variant="ink" onClick={() => setEditing({ ...blank })}><Plus /> New</Button>
      </div>
      {q.isLoading ? <PageLoader /> : q.isError ? <ErrorState message={friendlyError(q.error, t)} /> : q.data!.length === 0 ? <EmptyState title="No announcements" body="Active announcements appear on every student's dashboard." /> : (
        <ul className="divide-y divide-line border-t border-line">
          {q.data!.map((a) => (
            <li key={a.id} className="flex items-center gap-3 py-4">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{a.title_en}</p>
                <p className="truncate text-sm text-slate">{a.body_en}</p>
                <p className="mono-meta">{formatDate(a.created_at, lang)}</p>
              </div>
              <Badge tone={a.is_active ? "lime" : "neutral"}>{a.is_active ? "active" : "hidden"}</Badge>
              <Button size="icon-sm" variant="ghost" aria-label="Edit" onClick={() => setEditing({ ...blank, ...a, title_bn: a.title_bn ?? "", body_bn: a.body_bn ?? "", link: a.link ?? "" })}><Pencil /></Button>
              <Button size="icon-sm" variant="ghost" aria-label="Delete" onClick={() => setDeleting(a)}><Trash2 /></Button>
            </li>
          ))}
        </ul>
      )}
      <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)} title={editing?.id ? "Edit announcement" : "New announcement"} size="lg"
        footer={<><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button variant="ink" disabled={!editing?.title_en.trim()} loading={save.isPending} onClick={() => save.mutate()}>Save</Button></>}>
        {editing && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title (English)" htmlFor="a-te"><Input id="a-te" value={editing.title_en} maxLength={160} onChange={(e) => setEditing({ ...editing, title_en: e.target.value })} /></Field>
            <Field label="Title (বাংলা)" htmlFor="a-tb"><Input id="a-tb" lang="bn" value={editing.title_bn} maxLength={160} onChange={(e) => setEditing({ ...editing, title_bn: e.target.value })} /></Field>
            <Field label="Body (English)" htmlFor="a-be"><Textarea id="a-be" value={editing.body_en} maxLength={2000} onChange={(e) => setEditing({ ...editing, body_en: e.target.value })} /></Field>
            <Field label="Body (বাংলা)" htmlFor="a-bb"><Textarea id="a-bb" lang="bn" value={editing.body_bn} maxLength={2000} onChange={(e) => setEditing({ ...editing, body_bn: e.target.value })} /></Field>
            <Field label="Link (optional)" htmlFor="a-l" className="sm:col-span-2"><Input id="a-l" value={editing.link} maxLength={300} placeholder="/learn/c-programming" onChange={(e) => setEditing({ ...editing, link: e.target.value })} /></Field>
            <label className="flex items-center gap-3 text-sm font-medium">Active <Switch label="Active" checked={editing.is_active} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} /></label>
          </div>
        )}
      </Dialog>
      <ConfirmDialog open={Boolean(deleting)} onOpenChange={(o) => !o && setDeleting(null)} danger title="Delete announcement?" loading={remove.isPending} onConfirm={() => remove.mutate()} />
    </div>
  );
}
