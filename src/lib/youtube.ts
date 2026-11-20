// Minimal typed wrapper around the official YouTube IFrame Player API
// (https://developers.google.com/youtube/iframe_api_reference). The script is loaded once and shared.

export interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  getPlaybackRate(): number;
  setPlaybackRate(rate: number): void;
  getAvailablePlaybackRates(): number[];
  loadModule(module: string): void;
  unloadModule(module: string): void;
  getOption(module: string, option: string): unknown;
  setOption(module: string, option: string, value: unknown): void;
  getIframe(): HTMLIFrameElement;
  destroy(): void;
}

export interface YTEvent<T = unknown> { target: YTPlayer; data: T }

interface YTNamespace {
  Player: new (el: HTMLElement, opts: {
    videoId: string;
    host?: string;
    width?: string | number;
    height?: string | number;
    playerVars?: Record<string, string | number>;
    events?: Partial<Record<"onReady" | "onStateChange" | "onError" | "onPlaybackRateChange" | "onApiChange", (e: YTEvent<never>) => void>>;
  }) => YTPlayer;
  PlayerState: { UNSTARTED: -1; ENDED: 0; PLAYING: 1; PAUSED: 2; BUFFERING: 3; CUED: 5 };
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

export const YT_STATE = { UNSTARTED: -1, ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 } as const;

let loading: Promise<YTNamespace> | null = null;

/** Loads https://www.youtube.com/iframe_api exactly once. Rejects if it can't load (offline, blocked). */
export function loadYouTubeApi(timeoutMs = 15_000): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (loading) return loading;
  loading = new Promise<YTNamespace>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      loading = null;
      reject(new Error("youtube_api_timeout"));
    }, timeoutMs);
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      window.clearTimeout(timer);
      if (window.YT?.Player) resolve(window.YT);
      else reject(new Error("youtube_api_missing"));
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => {
      window.clearTimeout(timer);
      loading = null;
      script.remove();
      reject(new Error("youtube_api_blocked"));
    };
    document.head.appendChild(script);
  });
  return loading;
}

/** YouTube player error codes → why the video can't play here. */
export type YTErrorKind = "invalid" | "html5" | "unavailable" | "not_embeddable" | "api";
export function ytErrorKind(code: number): YTErrorKind {
  if (code === 2) return "invalid";
  if (code === 5) return "html5";
  if (code === 100) return "unavailable";
  if (code === 101 || code === 150 || code === 153) return "not_embeddable";
  return "api";
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
}

export interface CaptionTrack { languageCode: string; displayName: string; kind?: string }

/** Reads the caption tracks the player exposes (only after the captions module has loaded). */
export function readCaptionTracks(p: YTPlayer): CaptionTrack[] {
  try {
    const list = p.getOption("captions", "tracklist") as Array<{ languageCode?: string; displayName?: string; languageName?: string; kind?: string }> | undefined;
    return (list ?? [])
      .filter((t) => t.languageCode)
      .map((t) => ({ languageCode: t.languageCode!, displayName: t.displayName ?? t.languageName ?? t.languageCode!, kind: t.kind }));
  } catch {
    return [];
  }
}
