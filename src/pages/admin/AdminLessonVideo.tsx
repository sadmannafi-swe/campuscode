import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Spinner, Switch } from "@/components/ui/misc";
import { useI18n } from "@/i18n";
import { friendlyError } from "@/lib/errors";
import { deleteLessonVideo, listCourseVideos, parseYouTubeId, saveLessonVideo } from "@/services/videos";
import { formatClock } from "@/lib/youtube";

const parseClock = (s: string): number | null => {
  const parts = s.trim().split(":").map(Number);
  if (!parts.length || parts.some((x) => !Number.isFinite(x) || x < 0)) return null;
  const secs = parts.reduce((a, b) => a * 60 + b, 0);
  return secs > 0 ? secs : null;
};

/** Admin panel: attach / change / remove the YouTube video for one lesson. Stores only the video ID. */
export function AdminLessonVideo({ courseId, lessonId }: { courseId: string; lessonId: string }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const videos = useQuery({ queryKey: ["course-videos", courseId], queryFn: () => listCourseVideos(courseId) });
  const current = videos.data?.find((v) => v.lesson_id === lessonId) ?? null;
  const [form, setForm] = useState({ url: "", title: "", duration: "", noteEn: "", noteBn: "", published: true });
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    setForm(current
      ? { url: current.youtube_video_id, title: current.title, duration: current.duration_seconds ? formatClock(current.duration_seconds) : "",
          noteEn: current.note_en ?? "", noteBn: current.note_bn ?? "", published: current.is_published }
      : { url: "", title: "", duration: "", noteEn: "", noteBn: "", published: true });
  }, [current]);

  const done = (msg: string) => {
    toast.success(msg);
    qc.invalidateQueries({ queryKey: ["course-videos", courseId] });
  };
  const save = useMutation({
    mutationFn: async () => {
      const id = parseYouTubeId(form.url);
      if (!id) throw Object.assign(new Error("bad id"), { friendly: "Enter a YouTube link or an 11-character video ID." });
      if (!form.title.trim()) throw Object.assign(new Error("title"), { friendly: "Enter the video title." });
      const duration = form.duration.trim() ? parseClock(form.duration) : null;
      if (form.duration.trim() && !duration) throw Object.assign(new Error("duration"), { friendly: "Duration must look like 12:34 or 1:02:03." });
      await saveLessonVideo({
        id: current?.id, course_id: courseId, lesson_id: lessonId, youtube_video_id: id, title: form.title.trim(),
        duration_seconds: duration, note_en: form.noteEn.trim() || null, note_bn: form.noteBn.trim() || null,
        is_published: form.published, channel_name: current?.channel_name ?? null,
      });
    },
    onSuccess: () => { setError(null); done("Lesson video saved"); },
    onError: (e) => setError((e as { friendly?: string }).friendly ?? friendlyError(e, t)),
  });
  const remove = useMutation({
    mutationFn: () => deleteLessonVideo(current!.id),
    onSuccess: () => { setConfirm(false); done("Lesson video removed"); },
    onError: (e) => toast.error(friendlyError(e, t)),
  });

  const previewId = parseYouTubeId(form.url);
  return (
    <section className="surface space-y-4 p-5 sm:p-8">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-heading text-xl font-bold"><Video className="size-5" />Lesson video</h2>
        {videos.isLoading && <Spinner />}
      </div>
      <p className="text-sm text-slate">
        Paste a YouTube link or video ID. Only the ID is stored; the video plays inside CampusCode through YouTube's official embedded player.
        {current?.source_playlist_id && <> Imported from playlist position {current.playlist_position}.</>}
      </p>
      {error && <p role="alert" className="rounded border border-error/30 bg-error/5 px-3 py-2 text-sm text-error">{error}</p>}
      <div className="grid gap-4 md:grid-cols-[1fr_160px]">
        <Field label="YouTube link or video ID" htmlFor="v-url" hint={previewId ? `Video ID: ${previewId}` : undefined}>
          <Input id="v-url" className="font-mono" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://www.youtube.com/watch?v=…" />
        </Field>
        <Field label="Duration" htmlFor="v-dur"><Input id="v-dur" className="font-mono" placeholder="12:34" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} /></Field>
      </div>
      <Field label="Video title" htmlFor="v-title"><Input id="v-title" value={form.title} maxLength={200} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Note for students — English (optional)" htmlFor="v-ne"><Textarea id="v-ne" value={form.noteEn} maxLength={2000} onChange={(e) => setForm({ ...form, noteEn: e.target.value })} /></Field>
        <Field label="Note for students — বাংলা (optional)" htmlFor="v-nb"><Textarea id="v-nb" lang="bn" value={form.noteBn} maxLength={2000} onChange={(e) => setForm({ ...form, noteBn: e.target.value })} /></Field>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm font-medium">Published <Switch label="Published" checked={form.published} onCheckedChange={(v) => setForm({ ...form, published: v })} /></label>
        <div className="flex gap-2">
          {current && <Button type="button" variant="outline" className="text-error" onClick={() => setConfirm(true)}><Trash2 /> Remove video</Button>}
          <Button type="button" variant="ink" loading={save.isPending} onClick={() => save.mutate()}>{current ? "Update video" : "Attach video"}</Button>
        </div>
      </div>
      <ConfirmDialog open={confirm} onOpenChange={setConfirm} danger title="Remove this lesson's video?"
        body="Students' watch progress for this video is removed too. The lesson itself is not affected." loading={remove.isPending} onConfirm={() => remove.mutate()} />
    </section>
  );
}
