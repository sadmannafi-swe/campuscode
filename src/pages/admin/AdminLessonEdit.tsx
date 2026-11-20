import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { adminGetLesson, deleteLesson, saveLesson } from "@/services/admin";
import { getCourseOutline } from "@/services/courses";
import { listTopics } from "@/services/problems";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/input";
import { ErrorState, PageLoader, Switch } from "@/components/ui/misc";
import { friendlyError } from "@/lib/errors";
import { slugify } from "@/lib/utils";
import type { Lesson, LessonExample } from "@/types/db";
import { AdminLessonVideo } from "./AdminLessonVideo";

const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

function Pair({ label, en, bn, onEn, onBn, rows = 2, mono }: {
  label: string; en: string; bn: string; onEn: (v: string) => void; onBn: (v: string) => void; rows?: number; mono?: boolean;
}) {
  const id = slugify(label);
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field label={`${label} — English`} htmlFor={`${id}-en`}>
        {rows === 1 ? <Input id={`${id}-en`} value={en} onChange={(e) => onEn(e.target.value)} />
          : <Textarea id={`${id}-en`} rows={rows} mono={mono} value={en} onChange={(e) => onEn(e.target.value)} />}
      </Field>
      <Field label={`${label} — বাংলা`} htmlFor={`${id}-bn`}>
        {rows === 1 ? <Input id={`${id}-bn`} lang="bn" value={bn} onChange={(e) => onBn(e.target.value)} />
          : <Textarea id={`${id}-bn`} lang="bn" rows={rows} mono={mono} value={bn} onChange={(e) => onBn(e.target.value)} />}
      </Field>
    </div>
  );
}

type Draft = Partial<Lesson> & { objectivesEn: string; objectivesBn: string; mistakesEn: string; mistakesBn: string; practiceEn: string; practiceBn: string };

export default function AdminLessonEdit() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { t } = useI18n();
  const nav = useNavigate();
  const qc = useQueryClient();
  const existing = useQuery({ queryKey: ["admin", "lesson", id], enabled: Boolean(id), queryFn: () => adminGetLesson(id!) });
  const courseSlugParam = params.get("course");
  const courseForNew = useQuery({
    queryKey: ["admin", "course-by-id", existing.data?.lesson.course_id],
    enabled: Boolean(existing.data),
    queryFn: async () => (await supabase.from("courses").select("slug").eq("id", existing.data!.lesson.course_id).single()).data?.slug as string,
  });
  const courseSlug = courseSlugParam ?? courseForNew.data ?? "";
  const outline = useQuery({ queryKey: ["admin", "outline", courseSlug], enabled: Boolean(courseSlug), queryFn: () => getCourseOutline(courseSlug) });
  const topics = useQuery({ queryKey: ["topics"], queryFn: listTopics });
  const [d, setD] = useState<Draft | null>(null);
  const [examples, setExamples] = useState<Partial<LessonExample>[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (id && existing.data && !d) {
      const l = existing.data.lesson;
      setD({ ...l, objectivesEn: l.objectives_en.join("\n"), objectivesBn: l.objectives_bn.join("\n"), mistakesEn: l.common_mistakes_en.join("\n"),
        mistakesBn: l.common_mistakes_bn.join("\n"), practiceEn: l.practice_en.join("\n"), practiceBn: l.practice_bn.join("\n") });
      setExamples(existing.data.examples);
    }
    if (!id && outline.data && !d) {
      setD({ course_id: outline.data.course.id, chapter_id: outline.data.chapters[0]?.id, number: outline.data.lessons.length + 1,
        title_en: "", title_bn: "", summary_en: "", summary_bn: "", body_en: "", body_bn: "", estimated_minutes: 15, is_published: false, is_project: false,
        objectivesEn: "", objectivesBn: "", mistakesEn: "", mistakesBn: "", practiceEn: "", practiceBn: "" });
    }
  }, [id, existing.data, outline.data, d]);

  const save = useMutation({
    mutationFn: () => {
      const { objectivesEn, objectivesBn, mistakesEn, mistakesBn, practiceEn, practiceBn, ...rest } = d!;
      const payload: Partial<Lesson> = {
        id: rest.id, course_id: rest.course_id, chapter_id: rest.chapter_id, number: rest.number,
        slug: rest.slug || slugify(rest.title_en ?? ""), title_en: rest.title_en, title_bn: rest.title_bn,
        summary_en: rest.summary_en, summary_bn: rest.summary_bn, body_en: rest.body_en, body_bn: rest.body_bn,
        objectives_en: lines(objectivesEn), objectives_bn: lines(objectivesBn), common_mistakes_en: lines(mistakesEn),
        common_mistakes_bn: lines(mistakesBn), practice_en: lines(practiceEn), practice_bn: lines(practiceBn),
        video_url: rest.video_url || null, is_project: rest.is_project, practice_topic_id: rest.practice_topic_id || null,
        estimated_minutes: rest.estimated_minutes, is_published: rest.is_published,
      };
      return saveLesson(payload, examples);
    },
    onSuccess: () => { toast.success("Lesson saved"); qc.invalidateQueries({ queryKey: ["admin"] }); qc.invalidateQueries({ queryKey: ["lesson"] }); qc.invalidateQueries({ queryKey: ["course"] }); nav("/admin/lessons"); },
    onError: (e) => toast.error(friendlyError(e, t)),
  });
  const remove = useMutation({
    mutationFn: () => deleteLesson(id!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin"] }); nav("/admin/lessons"); },
    onError: (e) => toast.error(friendlyError(e, t)),
  });

  if (existing.isError) return <ErrorState message={friendlyError(existing.error, t)} />;
  if (!d || !outline.data) return <PageLoader />;
  const set = (patch: Partial<Draft>) => setD({ ...d, ...patch });
  const setEx = (i: number, patch: Partial<LessonExample>) => setExamples((xs) => xs.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  return (
    <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
      <Link to="/admin/lessons" className="inline-flex items-center gap-1 text-sm text-slate hover:text-ink"><ArrowLeft className="size-4" />Lessons</Link>
      <h1 className="text-3xl font-extrabold">{id ? `Lesson ${d.number}: ${d.title_en}` : "New lesson"}</h1>

      <section className="surface grid gap-4 p-5 sm:grid-cols-2 sm:p-8 lg:grid-cols-4">
        <Field label="Chapter" htmlFor="l-ch"><NativeSelect id="l-ch" value={d.chapter_id} onChange={(e) => set({ chapter_id: e.target.value })}>
          {outline.data.chapters.map((c) => <option key={c.id} value={c.id}>{c.title_en}</option>)}
        </NativeSelect></Field>
        <Field label="Number (order)" htmlFor="l-n"><Input id="l-n" type="number" min={1} value={d.number} onChange={(e) => set({ number: Number(e.target.value) })} /></Field>
        <Field label="Slug" htmlFor="l-s" hint="auto from title if empty"><Input id="l-s" className="font-mono" value={d.slug ?? ""} onChange={(e) => set({ slug: slugify(e.target.value) })} /></Field>
        <Field label="Minutes" htmlFor="l-m"><Input id="l-m" type="number" min={1} value={d.estimated_minutes} onChange={(e) => set({ estimated_minutes: Number(e.target.value) })} /></Field>
        <Field label="Practice topic" htmlFor="l-t"><NativeSelect id="l-t" value={d.practice_topic_id ?? ""} onChange={(e) => set({ practice_topic_id: e.target.value || null })}>
          <option value="">—</option>{(topics.data ?? []).map((tp) => <option key={tp.id} value={tp.id}>{tp.name_en}</option>)}
        </NativeSelect></Field>
        <Field label="Video URL (optional)" htmlFor="l-v" className="sm:col-span-2"><Input id="l-v" value={d.video_url ?? ""} placeholder="https://…" onChange={(e) => set({ video_url: e.target.value })} /></Field>
        <div className="flex items-end gap-6 pb-2">
          <label className="flex items-center gap-2 text-sm font-medium">Project <Switch label="Project" checked={Boolean(d.is_project)} onCheckedChange={(v) => set({ is_project: v })} /></label>
          <label className="flex items-center gap-2 text-sm font-medium">Published <Switch label="Published" checked={Boolean(d.is_published)} onCheckedChange={(v) => set({ is_published: v })} /></label>
        </div>
      </section>

      {id && d.course_id && <AdminLessonVideo courseId={d.course_id} lessonId={id} />}

      <section className="surface space-y-5 p-5 sm:p-8">
        <Pair label="Title" rows={1} en={d.title_en ?? ""} bn={d.title_bn ?? ""} onEn={(v) => set({ title_en: v })} onBn={(v) => set({ title_bn: v })} />
        <Pair label="Summary" en={d.summary_en ?? ""} bn={d.summary_bn ?? ""} onEn={(v) => set({ summary_en: v })} onBn={(v) => set({ summary_bn: v })} />
        <Pair label="Objectives (one per line)" rows={3} en={d.objectivesEn} bn={d.objectivesBn} onEn={(v) => set({ objectivesEn: v })} onBn={(v) => set({ objectivesBn: v })} />
        <Pair label="Explanation (Markdown)" rows={14} mono en={d.body_en ?? ""} bn={d.body_bn ?? ""} onEn={(v) => set({ body_en: v })} onBn={(v) => set({ body_bn: v })} />
        <Pair label="Common mistakes (one per line)" rows={3} en={d.mistakesEn} bn={d.mistakesBn} onEn={(v) => set({ mistakesEn: v })} onBn={(v) => set({ mistakesBn: v })} />
        <Pair label="Practice tasks (one per line)" rows={3} en={d.practiceEn} bn={d.practiceBn} onEn={(v) => set({ practiceEn: v })} onBn={(v) => set({ practiceBn: v })} />
      </section>

      <section className="surface space-y-5 p-5 sm:p-8">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-xl font-bold">Code examples</h2>
          <Button type="button" variant="outline" size="sm" onClick={() => setExamples((xs) => [...xs, { language: outline.data!.course.language, code: "", stdin: "", expected_output: "", title_en: "", title_bn: "", explanation_en: "", explanation_bn: "" }])}><Plus /> Example</Button>
        </div>
        <p className="text-sm text-slate">Expected output is shown to learners as-is. Run the code in the IDE first and paste the exact output.</p>
        {examples.map((ex, i) => (
          <div key={i} className="space-y-4 rounded border border-line p-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm">Example {i + 1}</span>
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove example" onClick={() => setExamples((xs) => xs.filter((_, j) => j !== i))}><Trash2 /></Button>
            </div>
            <Pair label={`Example ${i + 1} title`} rows={1} en={ex.title_en ?? ""} bn={ex.title_bn ?? ""} onEn={(v) => setEx(i, { title_en: v })} onBn={(v) => setEx(i, { title_bn: v })} />
            <Field label="Code" htmlFor={`ex-code-${i}`}><Textarea id={`ex-code-${i}`} mono rows={10} value={ex.code ?? ""} onChange={(e) => setEx(i, { code: e.target.value })} /></Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Input (stdin)" htmlFor={`ex-in-${i}`}><Textarea id={`ex-in-${i}`} mono value={ex.stdin ?? ""} onChange={(e) => setEx(i, { stdin: e.target.value })} /></Field>
              <Field label="Expected output" htmlFor={`ex-out-${i}`}><Textarea id={`ex-out-${i}`} mono value={ex.expected_output ?? ""} onChange={(e) => setEx(i, { expected_output: e.target.value })} /></Field>
            </div>
            <Pair label={`Example ${i + 1} explanation`} en={ex.explanation_en ?? ""} bn={ex.explanation_bn ?? ""} onEn={(v) => setEx(i, { explanation_en: v })} onBn={(v) => setEx(i, { explanation_bn: v })} />
          </div>
        ))}
      </section>

      <div className="flex flex-wrap justify-between gap-3">
        {id ? <Button type="button" variant="outline" className="text-error" onClick={() => setConfirmDelete(true)}><Trash2 /> Delete lesson</Button> : <span />}
        <Button type="submit" variant="ink" size="lg" loading={save.isPending} disabled={!d.title_en || !d.title_bn}>Save lesson</Button>
      </div>
      <ConfirmDialog open={confirmDelete} onOpenChange={setConfirmDelete} danger title="Delete this lesson?" body="Learner progress for this lesson is deleted too."
        loading={remove.isPending} onConfirm={() => remove.mutate()} />
    </form>
  );
}
