import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { adminListCourses, deleteChapter, deleteCourse, saveChapter, saveCourse } from "@/services/admin";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Badge, ErrorState, PageLoader, Switch } from "@/components/ui/misc";
import { friendlyError } from "@/lib/errors";
import { slugify } from "@/lib/utils";
import type { Chapter, Course } from "@/types/db";

type CourseDraft = Partial<Course>;
type ChapterDraft = Partial<Chapter>;

export default function AdminRoadmap() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const courses = useQuery({ queryKey: ["admin", "courses"], queryFn: adminListCourses });
  const [courseId, setCourseId] = useState<string>("");
  const selected = courseId || courses.data?.[0]?.id || "";
  const chapters = useQuery({
    queryKey: ["admin", "chapters", selected],
    enabled: Boolean(selected),
    queryFn: async () => {
      const { data, error } = await supabase.from("chapters").select("*, lessons(count)").eq("course_id", selected).order("sort_order");
      if (error) throw error;
      return data as (Chapter & { lessons: { count: number }[] })[];
    },
  });
  const [course, setCourse] = useState<CourseDraft | null>(null);
  const [chapter, setChapter] = useState<ChapterDraft | null>(null);
  const [del, setDel] = useState<{ kind: "course" | "chapter"; id: string; name: string } | null>(null);
  const done = (msg: string) => { toast.success(msg); qc.invalidateQueries({ queryKey: ["admin"] }); qc.invalidateQueries({ queryKey: ["courses"] }); qc.invalidateQueries({ queryKey: ["course"] }); };
  const err = (e: unknown) => toast.error(friendlyError(e, t));

  const saveC = useMutation({ mutationFn: () => saveCourse({ ...course!, slug: course!.slug || slugify(course!.title_en ?? "") }), onSuccess: () => { setCourse(null); done("Course saved"); }, onError: err });
  const saveCh = useMutation({ mutationFn: () => saveChapter({ ...chapter!, course_id: selected, slug: chapter!.slug || slugify(chapter!.title_en ?? "") }), onSuccess: () => { setChapter(null); done("Chapter saved"); }, onError: err });
  const remove = useMutation({ mutationFn: () => (del!.kind === "course" ? deleteCourse(del!.id) : deleteChapter(del!.id)), onSuccess: () => { setDel(null); done("Deleted"); }, onError: err });
  const togglePublish = useMutation({ mutationFn: (c: Course) => saveCourse({ id: c.id, is_published: !c.is_published }), onSuccess: () => done("Updated"), onError: err });

  if (courses.isLoading) return <PageLoader />;
  if (courses.isError) return <ErrorState message={friendlyError(courses.error, t)} />;

  return (
    <div className="space-y-6">
      <section className="surface p-5 sm:p-8">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-3xl font-extrabold">Courses</h1>
          <Button variant="ink" onClick={() => setCourse({ language: "c", title_en: "", title_bn: "", description_en: "", description_bn: "", sort_order: (courses.data?.length ?? 0) + 1 })}><Plus /> New course</Button>
        </div>
        <ul className="divide-y divide-line border-t border-line">
          {courses.data!.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-3 py-4">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{c.title_en} <span className="font-bn text-slate">· {c.title_bn}</span></p>
                <p className="mono-meta">{c.slug} · {c.language}</p>
              </div>
              <label className="flex items-center gap-2 text-sm">Published <Switch label="Published" checked={c.is_published} onCheckedChange={() => togglePublish.mutate(c)} /></label>
              <Button size="icon-sm" variant="ghost" aria-label="Edit" onClick={() => setCourse(c)}><Pencil /></Button>
              <Button size="icon-sm" variant="ghost" aria-label="Delete" onClick={() => setDel({ kind: "course", id: c.id, name: c.title_en })}><Trash2 /></Button>
            </li>
          ))}
        </ul>
      </section>

      <section className="surface p-5 sm:p-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-extrabold">Roadmap chapters</h2>
          <div className="flex gap-2">
            <div className="w-56"><NativeSelect value={selected} onChange={(e) => setCourseId(e.target.value)} aria-label="Course">
              {courses.data!.map((c) => <option key={c.id} value={c.id}>{c.title_en}</option>)}
            </NativeSelect></div>
            <Button variant="ink" disabled={!selected} onClick={() => setChapter({ title_en: "", title_bn: "", description_en: "", description_bn: "", sort_order: (chapters.data?.length ?? 0) + 1, is_published: true })}><Plus /> Chapter</Button>
          </div>
        </div>
        {chapters.isLoading ? <PageLoader /> : (
          <ol className="divide-y divide-line border-t border-line">
            {(chapters.data ?? []).map((ch) => (
              <li key={ch.id} className="flex flex-wrap items-center gap-3 py-4">
                <span className="w-8 font-mono text-sm text-slate">{ch.sort_order}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{ch.title_en} <span className="font-bn text-slate">· {ch.title_bn}</span></p>
                  <p className="mono-meta">{ch.slug} · {ch.lessons[0]?.count ?? 0} lessons</p>
                </div>
                {!ch.is_published && <Badge>hidden</Badge>}
                <Button size="icon-sm" variant="ghost" aria-label="Edit" onClick={() => setChapter(ch)}><Pencil /></Button>
                <Button size="icon-sm" variant="ghost" aria-label="Delete" onClick={() => setDel({ kind: "chapter", id: ch.id, name: ch.title_en })}><Trash2 /></Button>
              </li>
            ))}
          </ol>
        )}
      </section>

      <Dialog open={Boolean(course)} onOpenChange={(o) => !o && setCourse(null)} size="lg" title={course?.id ? "Edit course" : "New course"}
        footer={<><Button variant="outline" onClick={() => setCourse(null)}>Cancel</Button><Button variant="ink" loading={saveC.isPending} disabled={!course?.title_en || !course?.title_bn} onClick={() => saveC.mutate()}>Save</Button></>}>
        {course && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title (English)" htmlFor="c-te"><Input id="c-te" value={course.title_en ?? ""} onChange={(e) => setCourse({ ...course, title_en: e.target.value })} /></Field>
            <Field label="Title (বাংলা)" htmlFor="c-tb"><Input id="c-tb" lang="bn" value={course.title_bn ?? ""} onChange={(e) => setCourse({ ...course, title_bn: e.target.value })} /></Field>
            <Field label="Description (English)" htmlFor="c-de"><Textarea id="c-de" value={course.description_en ?? ""} onChange={(e) => setCourse({ ...course, description_en: e.target.value })} /></Field>
            <Field label="Description (বাংলা)" htmlFor="c-db"><Textarea id="c-db" lang="bn" value={course.description_bn ?? ""} onChange={(e) => setCourse({ ...course, description_bn: e.target.value })} /></Field>
            <Field label="Slug" htmlFor="c-s" hint="lowercase-with-dashes"><Input id="c-s" className="font-mono" value={course.slug ?? ""} onChange={(e) => setCourse({ ...course, slug: slugify(e.target.value) })} /></Field>
            <Field label="Language" htmlFor="c-l"><NativeSelect id="c-l" value={course.language} onChange={(e) => setCourse({ ...course, language: e.target.value as Course["language"] })}><option value="c">C</option><option value="python">Python</option></NativeSelect></Field>
            <Field label="Sort order" htmlFor="c-o"><Input id="c-o" type="number" value={course.sort_order ?? 0} onChange={(e) => setCourse({ ...course, sort_order: Number(e.target.value) })} /></Field>
          </div>
        )}
      </Dialog>
      <Dialog open={Boolean(chapter)} onOpenChange={(o) => !o && setChapter(null)} size="lg" title={chapter?.id ? "Edit chapter" : "New chapter"}
        footer={<><Button variant="outline" onClick={() => setChapter(null)}>Cancel</Button><Button variant="ink" loading={saveCh.isPending} disabled={!chapter?.title_en || !chapter?.title_bn} onClick={() => saveCh.mutate()}>Save</Button></>}>
        {chapter && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title (English)" htmlFor="ch-te"><Input id="ch-te" value={chapter.title_en ?? ""} onChange={(e) => setChapter({ ...chapter, title_en: e.target.value })} /></Field>
            <Field label="Title (বাংলা)" htmlFor="ch-tb"><Input id="ch-tb" lang="bn" value={chapter.title_bn ?? ""} onChange={(e) => setChapter({ ...chapter, title_bn: e.target.value })} /></Field>
            <Field label="Description (English)" htmlFor="ch-de"><Textarea id="ch-de" value={chapter.description_en ?? ""} onChange={(e) => setChapter({ ...chapter, description_en: e.target.value })} /></Field>
            <Field label="Description (বাংলা)" htmlFor="ch-db"><Textarea id="ch-db" lang="bn" value={chapter.description_bn ?? ""} onChange={(e) => setChapter({ ...chapter, description_bn: e.target.value })} /></Field>
            <Field label="Slug" htmlFor="ch-s"><Input id="ch-s" className="font-mono" value={chapter.slug ?? ""} onChange={(e) => setChapter({ ...chapter, slug: slugify(e.target.value) })} /></Field>
            <Field label="Sort order" htmlFor="ch-o"><Input id="ch-o" type="number" value={chapter.sort_order ?? 0} onChange={(e) => setChapter({ ...chapter, sort_order: Number(e.target.value) })} /></Field>
            <label className="flex items-center gap-3 text-sm font-medium">Visible <Switch label="Visible" checked={chapter.is_published ?? true} onCheckedChange={(v) => setChapter({ ...chapter, is_published: v })} /></label>
          </div>
        )}
      </Dialog>
      <ConfirmDialog open={Boolean(del)} onOpenChange={(o) => !o && setDel(null)} danger title={`Delete ${del?.kind} “${del?.name}”?`}
        body={del?.kind === "course" ? "All chapters, lessons and learner progress for this course are deleted." : "All lessons in this chapter are deleted."}
        loading={remove.isPending} onConfirm={() => remove.mutate()} />
    </div>
  );
}
