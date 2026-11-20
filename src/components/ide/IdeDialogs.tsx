import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileCode2, Search } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { EmptyState, ErrorState, Spinner } from "@/components/ui/misc";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/i18n";
import { useAuth } from "@/hooks/useAuth";
import { listSnippets } from "@/services/snippets";
import { EXAMPLES, type IdeExample } from "@/lib/templates";
import { friendlyError } from "@/lib/errors";
import { cn, langLabel, relativeTime } from "@/lib/utils";
import type { SavedCode } from "@/types/db";

export function SaveDialog({ open, onOpenChange, initialTitle, initialDescription, onSave, saving, mode }: {
  open: boolean; onOpenChange: (o: boolean) => void; initialTitle: string; initialDescription?: string;
  onSave: (title: string, description: string) => void; saving: boolean; mode: "save" | "saveAs";
}) {
  const { t } = useI18n();
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription ?? "");
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (open) { setTitle(initialTitle); setDescription(initialDescription ?? ""); setError(null); }
  }, [open, initialTitle, initialDescription]);

  const submit = () => {
    const tt = title.trim();
    if (tt.length < 1 || tt.length > 80) return setError("1–80");
    onSave(tt, description.trim());
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange} dark title={mode === "saveAs" ? t("ide.saveAs") : t("ide.save")}
      footer={<>
        <Button variant="outline-dark" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
        <Button onClick={submit} loading={saving}>{t("common.save")}</Button>
      </>}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <Field label={t("ide.titleLabel")} htmlFor="snip-title" error={error} dark>
          <Input id="snip-title" tone="dark" value={title} maxLength={80} autoFocus onChange={(e) => setTitle(e.target.value)} className="font-mono" />
        </Field>
        <Field label={<>{t("ide.descriptionLabel")} <span className="normal-case tracking-normal">({t("common.optional")})</span></>} htmlFor="snip-desc" dark>
          <Textarea id="snip-desc" tone="dark" value={description} maxLength={500} onChange={(e) => setDescription(e.target.value)} />
        </Field>
      </form>
    </Dialog>
  );
}

export function OpenDialog({ open, onOpenChange, onOpenSnippet, onOpenExample }: {
  open: boolean; onOpenChange: (o: boolean) => void; onOpenSnippet: (s: SavedCode) => void; onOpenExample: (e: IdeExample) => void;
}) {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const snippets = useQuery({
    queryKey: ["snippets", user?.id],
    queryFn: () => listSnippets(user!.id),
    enabled: open && Boolean(user),
  });
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (snippets.data ?? []).filter((x) => !s || x.title.toLowerCase().includes(s) || (x.description ?? "").toLowerCase().includes(s));
  }, [snippets.data, q]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange} dark size="lg" title={t("ide.openSaved")}>
      <Tabs defaultValue={user ? "saved" : "examples"}>
        <TabsList dark className="mb-4">
          <TabsTrigger dark value="saved">{t("ide.recent")}</TabsTrigger>
          <TabsTrigger dark value="examples">{t("ide.examples")}</TabsTrigger>
        </TabsList>
        <TabsContent value="saved">
          {!user ? (
            <p className="rounded border border-ink-600 p-4 text-sm text-paper/70">{t("ide.signInToSave")}</p>
          ) : (
            <>
              <div className="relative mb-3">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-paper/40" />
                <Input tone="dark" className="pl-9" placeholder={t("snippets.search")} value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              {snippets.isLoading ? <div className="flex justify-center py-8"><Spinner /></div>
                : snippets.isError ? <ErrorState dark message={friendlyError(snippets.error, t)} onRetry={() => snippets.refetch()} />
                : filtered.length === 0 ? <EmptyState dark icon={<FileCode2 className="size-6" />} title={q ? t("snippets.noMatch") : t("ide.noSnippets")} />
                : (
                  <ul className="max-h-[50vh] space-y-2 overflow-y-auto scrollbar-thin">
                    {filtered.map((s) => (
                      <li key={s.id}>
                        <button onClick={() => onOpenSnippet(s)}
                          className="flex w-full items-center justify-between gap-3 rounded border border-ink-600 bg-ink-700/50 px-4 py-3 text-left hover:border-lime/50">
                          <span className="min-w-0">
                            <span className="block truncate font-semibold">{s.title}</span>
                            <span className="font-mono text-xs text-lime">{langLabel(s.language)}</span>
                          </span>
                          <span className="shrink-0 font-mono text-xs text-paper/50">{relativeTime(s.updated_at, lang)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
            </>
          )}
        </TabsContent>
        <TabsContent value="examples">
          <ul className="grid gap-2 sm:grid-cols-2">
            {EXAMPLES.map((ex) => (
              <li key={ex.id}>
                <button onClick={() => onOpenExample(ex)}
                  className={cn("w-full rounded border border-ink-600 bg-ink-700/50 px-4 py-3 text-left hover:border-lime/50")}>
                  <span className="block font-semibold">{ex.title}</span>
                  <span className="font-mono text-xs text-lime">{langLabel(ex.language)}</span>
                </button>
              </li>
            ))}
          </ul>
        </TabsContent>
      </Tabs>
    </Dialog>
  );
}
