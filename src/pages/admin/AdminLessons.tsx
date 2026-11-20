import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { adminListCourses, saveLesson } from "@/services/admin";
import { getCourseOutline } from "@/services/courses";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/input";
import { ErrorState, PageLoader, Switch } from "@/components/ui/misc";
import { friendlyError } from "@/lib/errors";

export default function AdminLessons() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const courses = useQuery({ queryKey: ["admin", "courses"], queryFn: adminListCourses });
  const [courseSlug, setCourseSlug] = useState("");
  const slug = courseSlug || courses.data?.[0]?.slug || "";
  const outline = useQuery({ queryKey: ["admin", "outline", slug], enabled: Boolean(slug), queryFn: () => getCourseOutline(slug) });
  const toggle = useMutation({
    mutationFn: (a: { id: string; v: boolean }) => saveLesson({ id: a.id, is_published: a.v }),
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["admin", "outline"] }); qc.invalidateQueries({ queryKey: ["course"] }); },
    onError: (e) => toast.error(friendlyError(e, t)),
  });
  if (courses.isLoading) return <PageLoader />;
  if (courses.isError) return <ErrorState message={friendlyError(courses.error, t)} />;
  return (
    <div className="surface p-5 sm:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold">Lessons</h1>
        <div className="flex gap-2">
          <div className="w-56"><NativeSelect value={slug} onChange={(e) => setCourseSlug(e.target.value)} aria-label="Course">
            {courses.data!.map((c) => <option key={c.id} value={c.slug}>{c.title_en}</option>)}
          </NativeSelect></div>
          <Button asChild variant="ink"><Link to={`/admin/lessons/new?course=${slug}`}><Plus /> New lesson</Link></Button>
        </div>
      </div>
      {outline.isLoading ? <PageLoader /> : outline.isError ? <ErrorState message={friendlyError(outline.error, t)} /> : outline.data && outline.data.chapters.map((ch) => (
        <section key={ch.id} className="mb-6">
          <h2 className="mb-2 font-heading text-lg font-bold">{ch.title_en}</h2>
          <ul className="divide-y divide-line border-y border-line">
            {ch.lessons.map((l) => (
              <li key={l.id} className="flex items-center gap-3 py-3">
                <span className="w-8 font-mono text-sm text-slate">{String(l.number).padStart(2, "0")}</span>
                <Link to={`/admin/lessons/${l.id}`} className="min-w-0 flex-1 truncate font-semibold hover:underline">{l.title_en} <span className="font-bn font-normal text-slate">· {l.title_bn}</span></Link>
                <label className="flex items-center gap-2 text-xs">Published <Switch label="Published" checked={l.is_published} onCheckedChange={(v) => toggle.mutate({ id: l.id, v })} /></label>
              </li>
            ))}
            {ch.lessons.length === 0 && <li className="py-3 text-sm text-slate">No lessons in this chapter yet.</li>}
          </ul>
        </section>
      ))}
    </div>
  );
}
