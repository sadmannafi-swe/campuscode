import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowRight, CheckCircle2, Info, Loader2, PlayCircle, RotateCcw, Subtitles } from "lucide-react";
import { useI18n } from "@/i18n";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/misc";
import { cn, pick, storage } from "@/lib/utils";
import {
  formatClock, loadYouTubeApi, readCaptionTracks, YT_STATE, ytErrorKind,
  type CaptionTrack, type YTErrorKind, type YTPlayer,
} from "@/lib/youtube";
import { saveVideoProgress } from "@/services/videos";
import type { LearningVideo, VideoProgress } from "@/types/db";

const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const AUTONEXT_KEY = "cc.video.autonext";
const SAVE_EVERY_MS = 15_000;

export interface NextLessonInfo { href: string; title: string; hasVideo: boolean }

/**
 * CampusCode lesson video. Streams from YouTube through the official IFrame Player API; the
 * student stays on the lesson page. Mandatory YouTube branding and controls are left intact.
 */
export function LessonVideo({ video, progress, next, label, autoplay, onProgressSaved }: {
  video: LearningVideo;
  progress?: VideoProgress | null;
  next?: NextLessonInfo | null;
  label?: string;
  autoplay?: boolean;
  onProgressSaved?: () => void;
}) {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const nav = useNavigate();
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorKind, setErrorKind] = useState<YTErrorKind | null>(null);
  const [state, setState] = useState<number>(YT_STATE.UNSTARTED);
  const [rates, setRates] = useState<number[]>([]);
  const [rate, setRate] = useState(1);
  const [tracks, setTracks] = useState<CaptionTrack[]>([]);
  const [captionLang, setCaptionLang] = useState<string | null>(null);
  const [autoNext, setAutoNext] = useState(() => storage.get(AUTONEXT_KEY) === "1");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  // progress bookkeeping (refs: updated every second without re-rendering)
  const duration = video.duration_seconds ?? 0;
  const watchedRef = useRef(progress?.watched_seconds ?? 0);
  const lastTimeRef = useRef<number | null>(null);
  const lastSaveRef = useRef(Date.now());
  const dirtyRef = useRef(false);
  const [watched, setWatched] = useState(progress?.watched_seconds ?? 0);
  const [completed, setCompleted] = useState(Boolean(progress?.completed_at));
  const resumeAt = progress && progress.position_seconds > 15 && (!duration || progress.position_seconds < duration - 15)
    ? progress.position_seconds : 0;
  const captionsWantedRef = useRef<string | null>(null);

  const persist = useCallback(async () => {
    const p = playerRef.current;
    if (!user || !p || !dirtyRef.current) return;
    dirtyRef.current = false;
    lastSaveRef.current = Date.now();
    try {
      await saveVideoProgress(user.id, video.id, p.getCurrentTime(), watchedRef.current);
      onProgressSaved?.();
    } catch { /* offline: try again on the next tick */ dirtyRef.current = true; }
  }, [user, video.id, onProgressSaved]);

  // ------------------------------------------------------------- create / destroy the player
  useEffect(() => {
    let cancelled = false;
    const host = mountRef.current;
    if (!host) return;
    setStatus("loading");
    setErrorKind(null);
    // YouTube replaces this element with its iframe; React never manages it.
    const el = document.createElement("div");
    el.className = "h-full w-full";
    host.replaceChildren(el);

    loadYouTubeApi().then((YT) => {
      if (cancelled) return;
      playerRef.current = new YT.Player(el, {
        videoId: video.youtube_video_id,
        host: "https://www.youtube-nocookie.com",
        width: "100%",
        height: "100%",
        playerVars: {
          playsinline: 1, rel: 0, iv_load_policy: 3, controls: 1, fs: 1, enablejsapi: 1,
          origin: window.location.origin, hl: lang === "bn" ? "bn" : "en", cc_lang_pref: "bn",
          autoplay: autoplay ? 1 : 0, start: resumeAt,
        },
        events: {
          onReady: (e) => {
            if (cancelled) return;
            const p = e.target;
            p.getIframe().setAttribute("title", `${t("video.label")}: ${video.title}`);
            setRates((p.getAvailablePlaybackRates() ?? []).filter((r) => SPEEDS.includes(r)));
            setRate(p.getPlaybackRate() || 1);
            setStatus("ready");
          },
          onStateChange: (e) => {
            const s = e.data as unknown as number;
            setState(s);
            const p = playerRef.current;
            if (!p) return;
            if (s === YT_STATE.PLAYING) {
              lastTimeRef.current = p.getCurrentTime();
              setCountdown(null);
              // load the captions module once so its track list becomes available
              try { p.loadModule("captions"); } catch { /* not supported */ }
            }
            if (s === YT_STATE.PAUSED || s === YT_STATE.ENDED) void persist();
          },
          onPlaybackRateChange: (e) => setRate(e.data as unknown as number),
          onApiChange: () => {
            const p = playerRef.current;
            if (!p) return;
            const list = readCaptionTracks(p);
            if (list.length) setTracks(list);
            // keep captions off unless the student asked for them
            if (captionsWantedRef.current === null) {
              try { p.setOption("captions", "track", {}); } catch { /* ignore */ }
            }
          },
          onError: (e) => {
            if (cancelled) return;
            setErrorKind(ytErrorKind(e.data as unknown as number));
            setStatus("error");
          },
        },
      });
    }).catch(() => {
      if (cancelled) return;
      setErrorKind("api");
      setStatus("error");
    });

    return () => {
      cancelled = true;
      void persist();
      try { playerRef.current?.destroy(); } catch { /* already gone */ }
      playerRef.current = null;
      host.replaceChildren();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video.youtube_video_id, retryKey]);

  // ------------------------------------------------------------- watched-time tracking
  useEffect(() => {
    if (state !== YT_STATE.PLAYING) return;
    const id = window.setInterval(() => {
      const p = playerRef.current;
      if (!p) return;
      const now = p.getCurrentTime();
      const prev = lastTimeRef.current ?? now;
      const delta = now - prev;
      // count only real forward playback (≤ 2x speed); seeks don't count as watching
      if (delta > 0 && delta <= 2.6) {
        watchedRef.current = Math.min(duration || Infinity, watchedRef.current + delta);
        dirtyRef.current = true;
        setWatched(watchedRef.current);
        if (duration && watchedRef.current >= duration * 0.9) setCompleted(true);
      }
      lastTimeRef.current = now;
      if (Date.now() - lastSaveRef.current > SAVE_EVERY_MS) void persist();
    }, 1000);
    return () => window.clearInterval(id);
  }, [state, duration, persist]);

  useEffect(() => {
    const h = () => { if (document.visibilityState === "hidden") void persist(); };
    document.addEventListener("visibilitychange", h);
    return () => document.removeEventListener("visibilitychange", h);
  }, [persist]);

  // ------------------------------------------------------------- end of video
  useEffect(() => {
    if (state !== YT_STATE.ENDED || !autoNext || !next?.hasVideo) return;
    setCountdown(5);
  }, [state, autoNext, next]);
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) { nav(`${next!.href}?autoplay=1`); return; }
    const id = window.setTimeout(() => setCountdown((c) => (c === null ? null : c - 1)), 1000);
    return () => window.clearTimeout(id);
  }, [countdown, nav, next]);

  // ------------------------------------------------------------- controls
  const changeRate = (r: number) => { playerRef.current?.setPlaybackRate(r); setRate(r); };
  const preferredTrack = (list: CaptionTrack[]) =>
    list.find((x) => x.languageCode.toLowerCase().startsWith("bn")) ?? list.find((x) => x.languageCode.startsWith(lang)) ?? list[0];
  const setCaptions = (code: string | null) => {
    const p = playerRef.current;
    if (!p) return;
    captionsWantedRef.current = code;
    setCaptionLang(code);
    try { p.setOption("captions", "track", code ? { languageCode: code } : {}); } catch { /* unsupported */ }
  };
  const replay = () => { setCountdown(null); playerRef.current?.seekTo(0, true); playerRef.current?.playVideo(); };
  const startOver = () => { playerRef.current?.seekTo(0, true); };

  const pct = duration ? Math.min(100, Math.round((watched / duration) * 100)) : 0;
  const note = pick(video, "note", lang);
  const errorText: Record<YTErrorKind, string> = {
    invalid: t("video.errInvalid"), html5: t("video.errHtml5"), unavailable: t("video.errUnavailable"),
    not_embeddable: t("video.errNotEmbeddable"), api: t("video.errApi"),
  };

  return (
    <section aria-label={label ?? t("video.label")} className="overflow-hidden rounded-md border border-ink-600 bg-ink text-paper">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 sm:px-5">
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-lime">
          <PlayCircle className="size-3.5" aria-hidden />{label ?? t("video.label")}
          {duration > 0 && <span className="font-mono normal-case tracking-normal text-paper/50">· {formatClock(duration)}</span>}
        </p>
        <p className="font-mono text-[11px] text-paper/50">{t("video.source", { channel: video.channel_name ?? "YouTube" })}</p>
      </header>

      {/* 16:9 stage */}
      <div className="relative aspect-video w-full bg-black">
        <div ref={mountRef} className="absolute inset-0" />
        {status === "loading" && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-paper/70" role="status">
            <Loader2 className="size-5 animate-spin text-lime" aria-hidden />{t("video.loading")}
          </div>
        )}
        {status === "error" && errorKind && (
          <div role="alert" className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink-800 px-6 text-center">
            <AlertTriangle className="size-7 text-[#E7B865]" aria-hidden />
            <p className="max-w-md text-sm text-paper/85">{errorText[errorKind]}</p>
            {(errorKind === "api" || errorKind === "html5") && (
              <Button variant="outline-dark" size="sm" onClick={() => setRetryKey((k) => k + 1)}><RotateCcw /> {t("common.retry")}</Button>
            )}
          </div>
        )}
        {state === YT_STATE.ENDED && status === "ready" && (
          // Covers YouTube's end-screen suggestions so students stay in the course.
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-ink/95 px-6 text-center">
            <p className="flex items-center gap-2 font-heading text-lg font-bold"><CheckCircle2 className="size-5 text-lime" />{t("video.ended")}</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="outline-dark" onClick={replay}><RotateCcw /> {t("video.replay")}</Button>
              {next && (
                <Button asChild><Link to={next.href}>{t("video.nextLesson")}: {next.title} <ArrowRight /></Link></Button>
              )}
            </div>
            {countdown !== null && (
              <p className="text-sm text-paper/70" aria-live="polite">
                {t("video.autoNextIn", { n: countdown })}{" "}
                <button className="font-semibold text-lime underline underline-offset-2" onClick={() => setCountdown(null)}>{t("common.cancel")}</button>
              </p>
            )}
          </div>
        )}
      </div>

      {/* CampusCode control strip: only capabilities the player actually reports, only when it can play */}
      {status === "ready" && <div className="space-y-3 border-t border-ink-700 px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          {rates.length > 1 && (
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t("video.speed")}>
              <span className="mr-1 text-xs font-semibold text-paper/60">{t("video.speed")}</span>
              {rates.map((r) => (
                <button key={r} onClick={() => changeRate(r)} aria-pressed={rate === r}
                  className={cn("h-7 min-w-[42px] rounded px-1.5 font-mono text-xs transition-colors",
                    rate === r ? "bg-lime font-bold text-ink" : "bg-ink-700 text-paper/80 hover:bg-ink-600")}>
                  {r}x
                </button>
              ))}
            </div>
          )}
          {tracks.length > 0 && (
            <label className="flex items-center gap-2 text-xs font-semibold text-paper/60">
              <Subtitles className="size-4" aria-hidden />{t("video.captions")}
              <select value={captionLang ?? ""} onChange={(e) => setCaptions(e.target.value || null)}
                className="h-7 rounded border border-ink-600 bg-ink-800 px-2 text-xs font-normal text-paper">
                <option value="">{t("video.captionsOff")}</option>
                {[preferredTrack(tracks), ...tracks.filter((x) => x !== preferredTrack(tracks))].map((tr) => (
                  <option key={tr.languageCode + (tr.kind ?? "")} value={tr.languageCode}>{tr.displayName}</option>
                ))}
              </select>
            </label>
          )}
          {next?.hasVideo && (
            <label className="flex items-center gap-2 text-xs font-semibold text-paper/60">
              <Switch label={t("video.autoNext")} checked={autoNext}
                onCheckedChange={(v) => { setAutoNext(v); storage.set(AUTONEXT_KEY, v ? "1" : "0"); }} />
              {t("video.autoNext")}
            </label>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs text-paper/55">
          <span>{t("video.qualityHint")}</span>
          {user ? (
            <span className="flex items-center gap-3 font-mono">
              {resumeAt > 0 && state === YT_STATE.UNSTARTED && (
                <span>{t("video.resumeFrom", { time: formatClock(resumeAt) })} · <button className="underline underline-offset-2 hover:text-lime" onClick={startOver}>{t("video.startOver")}</button></span>
              )}
              {completed ? <span className="inline-flex items-center gap-1 text-lime"><CheckCircle2 className="size-3.5" />{t("video.completed")}</span>
                : duration > 0 && watched > 0 ? <span>{t("video.watched", { pct })}</span> : null}
            </span>
          ) : <span>{t("video.signInProgress")}</span>}
        </div>
        {user && duration > 0 && watched > 0 && (
          <div className="h-1 w-full overflow-hidden rounded-full bg-ink-600" role="progressbar" aria-label={t("video.watched", { pct })} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-lime transition-[width] duration-500" style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>}

      {note && (
        <div className={cn("flex gap-3 border-t border-ink-700 bg-ink-800 px-4 py-3 text-sm leading-relaxed text-paper/85 sm:px-5", lang === "bn" && "font-bn")}>
          <Info className="mt-0.5 size-4 shrink-0 text-[#E7B865]" aria-hidden />
          <p><span className="font-semibold text-paper">{t("video.authorNote")}: </span>{note}</p>
        </div>
      )}
    </section>
  );
}
