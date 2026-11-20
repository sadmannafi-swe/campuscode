import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { listSettings, setSetting } from "@/services/admin";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/i18n";
import { ErrorState, PageLoader, Switch } from "@/components/ui/misc";
import { friendlyError } from "@/lib/errors";

const KNOWN: Record<string, { label: string; help: string }> = {
  "execution.enabled": { label: "Code execution", help: "Pause all Run / Submit requests (e.g. when the Judge0 quota is exhausted)." },
  "community.problems_enabled": { label: "Community problems", help: "Allow students to create problems." },
};

export default function AdminSettings() {
  const { t } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin", "settings"], queryFn: listSettings });
  const save = useMutation({
    mutationFn: (a: { key: string; value: unknown }) => setSetting(a.key, a.value, user!.id),
    onSuccess: () => { toast.success("Setting saved"); qc.invalidateQueries({ queryKey: ["admin", "settings"] }); },
    onError: (e) => toast.error(friendlyError(e, t)),
  });
  return (
    <div className="surface max-w-3xl p-5 sm:p-8">
      <h1 className="mb-6 text-3xl font-extrabold">Platform settings</h1>
      {q.isLoading ? <PageLoader /> : q.isError ? <ErrorState message={friendlyError(q.error, t)} /> : (
        <ul className="divide-y divide-line border-t border-line">
          {q.data!.map((s) => (
            <li key={s.key} className="flex items-center justify-between gap-4 py-4">
              <div>
                <p className="font-semibold">{KNOWN[s.key]?.label ?? s.key}</p>
                <p className="text-sm text-slate">{KNOWN[s.key]?.help ?? <code className="font-mono text-xs">{JSON.stringify(s.value)}</code>}</p>
              </div>
              {typeof s.value === "boolean" && (
                <Switch label={s.key} checked={s.value} disabled={save.isPending} onCheckedChange={(v) => save.mutate({ key: s.key, value: v })} />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
