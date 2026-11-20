import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowRight, CheckCircle2, Info, Loader2, Play, RotateCcw, Settings2, Subtitles } from "lucide-react";
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
 * CampusCode lesson video.
 * Before playback a CampusCode cover is shown (YouTube is not loaded yet). On click, the official
 * YouTube IFrame Player loads in the same frame and plays inside the lesson — with YouTube's own
 * branding and controls left fully intact.
 */
export function LessonVideo({ video, progress, next, poster, autoplay, onProgressSaved }: {
  video: LearningVideo;
  progress?: VideoProgress | null;
  next?: NextLessonInfo | null;
  poster: { eyebrow: string; title: string };
  autoplay?: boolean;
  onProgressSaved?: () => void;
}) {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const nav = useNavigate();
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const [activated, setActivated] = useState(Boolean(autoplay));
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [errorKind, setErrorKind] = useState<YTErrorKind | null>(null);
  const [state, setState] = useState<number>(YT_STATE.UNSTARTED);
  const [rates, setRates] = useState<number[]>([]);
  const [rate, setRate] = useState(1);
  const [tracks, setTracks] = useState<CaptionTrack[]>([]);
  const [captionLang, setCaptionLang] = useState<string | null>(null);
  const [autoNext, setAutoNext] = useState(() => storage.get(AUTONEXT_KEY) === "1");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const duration = video.duration_seconds ?? 0;
  const watchedRef = useRef(progress?.watched_seconds ?? 0);
  const lastTimeRef = useRef<number | null>(null);
  const lastSaveRef = useRef(Date.now());
  const dirtyRef = useRef(false);
  const [watched, setWatched] = useState(progress?.watched_seconds ?? 0);
  const [completed, setCompleted] = useState(Boolean(progress?.completed_at));
  const resumeAt = progress && progress.position_seconds > 15 && (!duration || progress.position_seconds < duration - 15)
    ? progress.position_seconds : 0;
  const startAtRef = useRef(resumeAt);
  const captionsWantedRef = useRef<string | null>(null);

  const persist = useCallback(async () => {
    const p = playerRef.current;
    if (!user || !p || !dirtyRef.current) return;
    dirtyRef.current = false;
    lastSaveRef.current = Date.now();
    try {
      await saveVideoProgress(user.id, video.id, p.getCurrentTime(), watchedRef.current);
      onProgressSaved?.();
    } catch { dirtyRef.current = true; /* retried on the next tick */ }
  }, [user, video.id, onProgressSaved]);

  // ------------------------------------------------------------- create / destroy the official player
  useEffect(() => {
    if (!activated) return;
    let cancelled = false;
    const host = mountRef.current;
    if (!host) return;
    setStatus("loading");
    setErrorKind(null);
    const el = document.createElement("div");       // YouTube replaces this node with its iframe
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
          playsinline: 1, rel: 0, iv_load_policy: 3, controls: 1, fs: 1, enablejsapi: 1, autoplay: 1,
          origin: window.location.origin, hl: lang === "bn" ? "bn" : "en", cc_lang_pref: "bn", start: startAtRef.current,
        },
        events: {
          onReady: (e) => {
            if (cancelled) return;
            const p = e.target;
            p.getIframe().setAttribute("title", `${poster.eyebrow}: ${poster.title}`);
            setRates((p.getAvailablePlaybackRates() ?? []).filter((r) => SPEEDS.includes(r)));
            setRate(p.getPlaybackRate() || 1);
            setStatus("ready");
            try { p.playVideo(); } catch { /* browser may require another tap; YouTube shows its play button */ }
          },
          onStateChange: (e) => {
            const s = e.data as unknown as number;
            setState(s);
            const p = playerRef.current;
            if (!p) return;
            if (s === YT_STATE.PLAYING) {
              lastTimeRef.current = p.getCurrentTime();
              setCountdown(null);
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
  }, [activated, video.youtube_video_id, retryKey]);

  // ------------------------------------------------------------- watched-time tracking (real playback only)
  useEffect(() => {
    if (state !== YT_STATE.PLAYING) return;
    const id = window.setInterval(() => {
      const p = playerRef.current;
      if (!p) return;
      const now = p.getCurrentTime();
      const delta = now - (lastTimeRef.current ?? now);
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
    if (state === YT_STATE.ENDED && autoNext && next?.hasVideo) setCountdown(5);
  }, [state, autoNext, next]);
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) { nav(`${next!.href}?autoplay=1`); return; }
    const id = window.setTimeout(() => setCountdown((c) => (c === null ? null : c - 1)), 1000);
    return () => window.clearTimeout(id);
  }, [countdown, nav, next]);

  // ------------------------------------------------------------- controls
  const changeRate = (r: number) => { playerRef.current?.setPlaybackRate(r); setRate(r); };
  const orderedTracks = (() => {
    const pref = tracks.find((x) => x.languageCode.toLowerCase().startsWith("bn")) ?? tracks.find((x) => x.languageCode.startsWith(lang));
    return pref ? [pref, ...tracks.filter((x) => x !== pref)] : tracks;
  })();
  const setCaptions = (code: string | null) => {
    const p = playerRef.current;
    if (!p) return;
    captionsWantedRef.current = code;
    setCaptionLang(code);
    try { p.setOption("captions", "track", code ? { languageCode: code } : {}); } catch { /* unsupported */ }
  };
  const replay = () => { setCountdown(null); playerRef.current?.seekTo(0, true); playerRef.current?.playVideo(); };
  const start = (fromStart = false) => { startAtRef.current = fromStart ? 0 : resumeAt; setActivated(true); };

  const pct = duration ? Math.min(100, Math.round((watched / duration) * 100)) : 0;
  const note = pick(video, "note", lang);
  const errorText: Record<YTErrorKind, string> = {
    invalid: t("video.errInvalid"), html5: t("video.errHtml5"), unavailable: t("video.errUnavailable"),
    not_embeddable: t("video.errNotEmbeddable"), api: t("video.errApi"),
  };
  const showProgress = Boolean(user) && duration > 0 && (watched > 0 || completed);

  return (
    <section aria-label={`${poster.eyebrow}: ${poster.title}`}
      className="overflow-hidden rounded-lg bg-ink text-paper shadow-[0_18px_40px_-28px_rgba(16,24,32,0.65)] ring-1 ring-ink/10">
      {/* 16:9 stage */}
      <div className="relative aspect-video w-full overflow-hidden bg-ink">
        <div ref={mountRef} className="absolute inset-0" />

        {!activated && (
          // CampusCode cover — YouTube isn't loaded until the student chooses to play.
          <button type="button" onClick={() => start()} aria-label={`${t("video.play")}: ${poster.title}`}
            className="group absolute inset-0 flex flex-col justify-between p-5 text-left sm:p-8">
            <span aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_78%_30%,rgba(183,243,107,0.16),transparent_45%)]" />
            <span aria-hidden className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(#F5F4EF_1px,transparent_1px),linear-gradient(90deg,#F5F4EF_1px,transparent_1px)] [background-size:32px_32px]" />
            <span className="relative font-mono text-[11px] uppercase tracking-[0.14em] text-lime sm:text-xs">{poster.eyebrow}</span>
            <span className="relative flex items-end justify-between gap-4">
              <span className="min-w-0">
                <span className="line-clamp-2 font-heading text-xl font-extrabold leading-tight sm:text-3xl">{poster.title}</span>
                <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-paper/60">
                  {duration > 0 && <span>{formatClock(duration)}</span>}
                  {resumeAt > 0 && <span className="text-lime">{t("video.resumeFrom", { time: formatClock(resumeAt) })}</span>}
                  {completed && <span className="inline-flex items-center gap-1 text-lime"><CheckCircle2 className="size-3.5" />{t("video.completed")}</span>}
                </span>
              </span>
              <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-lime text-ink shadow-lift transition-transform duration-150 group-hover:scale-105 group-active:scale-95 sm:size-[72px]">
                <Play className="ml-1 size-6 fill-current sm:size-7" aria-hidden />
              </span>
            </span>
            {showProgress && (
              <span aria-hidden className="absolute inset-x-0 bottom-0 h-1 bg-paper/10"><span className="block h-full bg-lime" style={{ width: `${pct}%` }} /></span>
            )}
          </button>
        )}

        {activated && status === "loading" && (
          <div className="absolute inset-0 flex items-center justify-center" role="status" aria-label={t("video.loading")}>
            <Loader2 className="size-7 animate-spin text-lime" aria-hidden />
          </div>
        )}
        {status === "error" && errorKind && (
          <div role="alert" className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink px-6 text-center">
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
              {next && <Button asChild><Link to={next.href}>{t("video.nextLesson")}: {next.title} <ArrowRight /></Link></Button>}
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

      {/* Compact control bar: only capabilities the running player reports. */}
      {status === "ready" && (
        <div className="flex items-center gap-4 overflow-x-auto border-t border-ink-700 px-3 py-2 scrollbar-thin sm:px-4">
          {rates.length > 1 && (
            <div className="flex shrink-0 items-center gap-1" role="group" aria-label={t("video.speed")}>
              <span className="mr-1 text-[11px] font-semibold uppercase tracking-wider text-paper/45">{t("video.speed")}</span>
              {rates.map((r) => (
                <button key={r} onClick={() => changeRate(r)} aria-pressed={rate === r}
                  className={cn("h-7 shrink-0 rounded px-2 font-mono text-xs transition-colors",
                    rate === r ? "bg-lime font-bold text-ink" : "text-paper/70 hover:bg-ink-700 hover:text-paper")}>
                  {r}×
                </button>
              ))}
            </div>
          )}
          {tracks.length > 0 && (
            <label className="flex shrink-0 items-center gap-1.5 text-xs text-paper/70">
              <Subtitles className="size-4 text-paper/45" aria-hidden /><span className="sr-only">{t("video.captions")}</span>
              <select value={captionLang ?? ""} onChange={(e) => setCaptions(e.target.value || null)} aria-label={t("video.captions")}
                className="h-7 rounded border border-ink-600 bg-ink px-2 text-xs text-paper">
                <option value="">{t("video.captionsOff")}</option>
                {orderedTracks.map((tr) => <option key={tr.languageCode + (tr.kind ?? "")} value={tr.languageCode}>{tr.displayName}</option>)}
              </select>
            </label>
          )}
          <span className="ml-auto flex shrink-0 items-center gap-4">
            {next?.hasVideo && (
              <label className="flex items-center gap-2 text-xs text-paper/60">
                <Switch label={t("video.autoNext")} checked={autoNext}
                  onCheckedChange={(v) => { setAutoNext(v); storage.set(AUTONEXT_KEY, v ? "1" : "0"); }} />
                <span className="hidden sm:inline">{t("video.autoNext")}</span>
              </label>
            )}
            <span className="flex items-center gap-1 text-[11px] text-paper/40" title={t("video.qualityHint")}>
              <Settings2 className="size-3.5" aria-hidden />{t("video.qualityShort")}
            </span>
          </span>
        </div>
      )}

      {showProgress && activated && (
        <div className="h-0.5 w-full bg-ink-700" role="progressbar" aria-label={t("video.watched", { pct })} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full bg-lime transition-[width] duration-500" style={{ width: `${pct}%` }} />
        </div>
      )}

      {note && (
        <div className={cn("flex gap-3 border-t border-ink-700 px-4 py-3 text-sm leading-relaxed text-paper/80", lang === "bn" && "font-bn")}>
          <Info className="mt-0.5 size-4 shrink-0 text-[#E7B865]" aria-hidden />
          <p><span className="font-semibold text-paper">{t("video.authorNote")}: </span>{note}</p>
        </div>
      )}
    </section>
  );
}
