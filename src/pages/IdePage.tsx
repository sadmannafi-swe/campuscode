import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft, Copy, Expand, FileCode2, FolderOpen, MoreHorizontal, Play, RotateCcw, Save, Send, Shrink,
  Sparkles, Trash2, FlaskConical, Home,
} from "lucide-react";
import { CodeEditor, type CodeEditorHandle } from "@/components/editor/CodeEditor";
import { OutputPanel, type IdeResult } from "@/components/ide/OutputPanel";
import { ProblemPanel } from "@/components/ide/ProblemPanel";
import { OpenDialog, SaveDialog } from "@/components/ide/IdeDialogs";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Menu, MenuItem, MenuSeparator } from "@/components/ui/menu";
import { Textarea } from "@/components/ui/input";
import { PageLoader } from "@/components/ui/misc";
import { Logo } from "@/components/brand/Logo";
import { LanguageSwitch } from "@/components/layout/LanguageSwitch";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/i18n";
import { runCode, runSamples, submitSolution } from "@/services/execution";
import { createSnippet, getSnippet, updateSnippet } from "@/services/snippets";
import { getProblemBySlug, getSampleTests, listTopics } from "@/services/problems";
import { TEMPLATES, TEMPLATE_STDIN, type IdeExample } from "@/lib/templates";
import { friendlyError } from "@/lib/errors";
import { cn, fileExt, langLabel, pick, storage } from "@/lib/utils";
import type { Lang, SavedCode } from "@/types/db";

type MobileTab = "problem" | "editor" | "input" | "output";
type Busy = null | "run" | "samples" | "submit";

export const IDE_HANDOFF_KEY = "cc.ide.handoff";
export interface IdeHandoff { language: Lang; code: string; stdin: string; title?: string }

const isLang = (v: string | null): v is Lang => v === "c" || v === "python";

export default function IdePage() {
  const { t, lang: uiLang } = useI18n();
  const { user, profile } = useAuth();
  const [params, setParams] = useSearchParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const editorRef = useRef<CodeEditorHandle>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const problemSlug = params.get("problem");
  const snippetId = params.get("snippet");
  const owner = user?.id ?? "guest";
  const context = problemSlug ? `p:${problemSlug}` : snippetId ? `s:${snippetId}` : "scratch";
  const draftKey = (l: Lang) => `cc.ide.${owner}.${context}.${l}`;

  const [language, setLanguage] = useState<Lang>(() => {
    const q = params.get("lang");
    if (isLang(q)) return q;
    const last = storage.get("cc.ide.lang");
    return isLang(last) ? last : "c";
  });
  const [codes, setCodes] = useState<Record<Lang, string>>({ c: "", python: "" });
  const [stdin, setStdin] = useState("");
  const [snippet, setSnippet] = useState<SavedCode | null>(null);
  const [ready, setReady] = useState(false);
  const [result, setResult] = useState<IdeResult | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [mobileTab, setMobileTab] = useState<MobileTab>(problemSlug ? "problem" : "editor");
  const [saveMode, setSaveMode] = useState<null | "save" | "saveAs">(null);
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [rightWidth, setRightWidth] = useState(() => Number(storage.get("cc.ide.rightWidth")) || 420);

  const code = codes[language];
  const setCode = useCallback((v: string) => setCodes((c) => ({ ...c, [language]: v })), [language]);

  // ---------------------------------------------------------------- problem context
  const problemQuery = useQuery({
    queryKey: ["problem", problemSlug],
    enabled: Boolean(problemSlug),
    queryFn: async () => {
      const p = await getProblemBySlug(problemSlug!);
      if (!p) return null;
      return { problem: p, samples: await getSampleTests(p.id) };
    },
  });
  const topics = useQuery({ queryKey: ["topics"], queryFn: listTopics, staleTime: 600_000 });
  const problem = problemQuery.data?.problem ?? null;
  const samples = problemQuery.data?.samples ?? [];
  const topicName = useMemo(() => {
    const tp = topics.data?.find((x) => x.id === problem?.topic_id);
    return tp ? pick(tp, "name", uiLang) : undefined;
  }, [topics.data, problem, uiLang]);

  const starter = useCallback((l: Lang) => {
    if (problem) return (l === "c" ? problem.starter_code_c : problem.starter_code_python) || TEMPLATES[l];
    return TEMPLATES[l];
  }, [problem]);

  // ---------------------------------------------------------------- initialisation
  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setResult(null);
    (async () => {
      // 1) hand-off from a lesson example ("Try in IDE")
      const raw = sessionStorage.getItem(IDE_HANDOFF_KEY);
      if (raw && params.get("from") === "lesson") {
        sessionStorage.removeItem(IDE_HANDOFF_KEY);
        try {
          const h = JSON.parse(raw) as IdeHandoff;
          if (isLang(h.language)) {
            setLanguage(h.language);
            setCodes((c) => ({ ...c, [h.language]: h.code }));
            setStdin(h.stdin);
            setSnippet(null);
            setReady(true);
            return;
          }
        } catch { /* ignore malformed hand-off */ }
      }
      // 2) a saved snippet
      if (snippetId) {
        if (!user) { setReady(true); return; }
        try {
          const s = await getSnippet(snippetId);
          if (cancelled) return;
          if (s) {
            setSnippet(s);
            setLanguage(s.language);
            setCodes((c) => ({ ...c, [s.language]: s.source_code }));
            setStdin(s.stdin);
            setReady(true);
            return;
          }
          toast.error(t("common.notFound"));
        } catch (e) {
          toast.error(friendlyError(e, t));
        }
      }
      setSnippet(null);
      // 3) problem or scratch: restore drafts per language
      if (problemSlug && !problemQuery.data) return; // wait for problem
      const next: Record<Lang, string> = {
        c: storage.get(draftKey("c")) ?? starter("c"),
        python: storage.get(draftKey("python")) ?? starter("python"),
      };
      setCodes(next);
      const savedStdin = storage.get(`cc.ide.${owner}.${context}.stdin`);
      setStdin(savedStdin ?? (problemSlug ? samples[0]?.input ?? "" : TEMPLATE_STDIN));
      setReady(true);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problemSlug, snippetId, user?.id, problemQuery.data]);

  useEffect(() => {
    if (problem && !problem.allowed_languages.includes(language)) setLanguage(problem.allowed_languages[0]);
  }, [problem, language]);

  // ---------------------------------------------------------------- drafts & auto-save
  useEffect(() => {
    if (!ready || snippet) return;
    const id = setTimeout(() => {
      storage.set(draftKey(language), code);
      storage.set(`cc.ide.${owner}.${context}.stdin`, stdin);
    }, 400);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, stdin, ready, snippet, language, context, owner]);

  useEffect(() => { storage.set("cc.ide.lang", language); }, [language]);

  const dirty = Boolean(snippet && (snippet.source_code !== code || snippet.stdin !== stdin || snippet.language !== language));

  useEffect(() => {
    if (!snippet || !dirty || !profile?.auto_save || !user) return;
    const id = setTimeout(async () => {
      setAutoSaving(true);
      try {
        const s = await updateSnippet(snippet.id, { source_code: code, stdin, language });
        setSnippet(s);
        qc.invalidateQueries({ queryKey: ["snippets"] });
      } catch (e) {
        toast.error(friendlyError(e, t));
      } finally {
        setAutoSaving(false);
      }
    }, 2500);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, stdin, language, dirty, snippet?.id, profile?.auto_save]);

  // ---------------------------------------------------------------- actions
  const run = useCallback(async () => {
    if (busy) return;
    setBusy("run");
    setMobileTab("output");
    try {
      const data = await runCode(language, editorRef.current?.getValue() ?? code, stdin);
      setResult({ kind: "run", data });
      if (user) qc.invalidateQueries({ queryKey: ["stats"] });
    } catch (e) {
      setResult({ kind: "error", message: friendlyError(e, t) });
    } finally {
      setBusy(null);
    }
  }, [busy, language, code, stdin, t, user, qc]);

  const runSampleTests = async () => {
    if (!problem || busy) return;
    setBusy("samples");
    setMobileTab("output");
    try {
      setResult({ kind: "samples", data: await runSamples(language, code, problem.id) });
    } catch (e) {
      setResult({ kind: "error", message: friendlyError(e, t) });
    } finally {
      setBusy(null);
    }
  };

  const submit = async () => {
    if (!problem || busy) return;
    if (!user) {
      toast.info(t("ide.signInToSubmit"));
      nav(`/login?next=${encodeURIComponent(`/ide?problem=${problem.slug}`)}`);
      return;
    }
    setBusy("submit");
    setMobileTab("output");
    try {
      const data = await submitSolution(language, code, problem.id);
      setResult({ kind: "submit", data });
      qc.invalidateQueries({ queryKey: ["progress"] });
      qc.invalidateQueries({ queryKey: ["submissions"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    } catch (e) {
      setResult({ kind: "error", message: friendlyError(e, t) });
    } finally {
      setBusy(null);
    }
  };

  const defaultTitle = snippet?.title ?? (problem ? `${problem.slug}.${fileExt(language)}` : `main.${fileExt(language)}`);

  const requestSave = (mode: "save" | "saveAs") => {
    if (!user) {
      toast.info(t("ide.signInToSave"), { action: { label: t("nav.signIn"), onClick: () => nav(`/login?next=${encodeURIComponent("/ide")}`) } });
      return;
    }
    if (mode === "save" && snippet) return void quickSave();
    setSaveMode(mode);
  };

  const quickSave = async () => {
    if (!snippet) return;
    setSaving(true);
    try {
      setSnippet(await updateSnippet(snippet.id, { source_code: code, stdin, language }));
      toast.success(t("ide.snippetSaved"));
      qc.invalidateQueries({ queryKey: ["snippets"] });
    } catch (e) {
      toast.error(friendlyError(e, t));
    } finally {
      setSaving(false);
    }
  };

  const doSave = async (title: string, description: string) => {
    if (!user) return;
    setSaving(true);
    try {
      const s = await createSnippet(user.id, {
        title, description: description || null, language, source_code: code, stdin,
        problem_id: problem?.id ?? null, topic_id: problem?.topic_id ?? null,
      });
      setSaveMode(null);
      toast.success(t("ide.snippetSaved"));
      qc.invalidateQueries({ queryKey: ["snippets"] });
      setSnippet(s);
      setParams({ snippet: s.id }, { replace: true });
    } catch (e) {
      toast.error(friendlyError(e, t));
    } finally {
      setSaving(false);
    }
  };

  const openSnippet = (s: SavedCode) => {
    setOpenDialog(false);
    setParams({ snippet: s.id });
    toast.success(t("ide.loadedSnippet", { title: s.title }));
  };

  const openExample = (ex: IdeExample) => {
    setOpenDialog(false);
    sessionStorage.setItem(IDE_HANDOFF_KEY, JSON.stringify({ language: ex.language, code: ex.code, stdin: ex.stdin }));
    setParams({ from: "lesson" });
  };

  const switchLanguage = (l: Lang) => {
    if (l === language) return;
    if (problem && !problem.allowed_languages.includes(l)) return;
    if (snippet) {
      // A snippet has one language: switching starts a fresh scratch file in the other language.
      setSnippet(null);
      setParams({ lang: l });
    }
    setLanguage(l);
    setCodes((c) => ({ ...c, [l]: c[l] || storage.get(draftKey(l)) || starter(l) }));
  };

  const copyCode = async () => {
    try { await navigator.clipboard.writeText(code); toast.success(t("common.copied")); } catch { /* clipboard blocked */ }
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) await rootRef.current?.requestFullscreen();
      else await document.exitFullscreen();
    } catch { /* not supported (iOS Safari): the mobile IDE is already full-screen */ }
  };
  useEffect(() => {
    const h = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, []);

  // Ctrl/Cmd+S saves
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); requestSave("save"); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  // ---------------------------------------------------------------- resizable split
  const dragging = useRef(false);
  const onDragStart = (e: React.PointerEvent) => {
    dragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onDragMove = (e: React.PointerEvent) => {
    if (!dragging.current || !rootRef.current) return;
    const rect = rootRef.current.getBoundingClientRect();
    const w = Math.min(Math.max(rect.right - e.clientX, 300), rect.width * 0.6);
    setRightWidth(w);
  };
  const onDragEnd = () => {
    dragging.current = false;
    storage.set("cc.ide.rightWidth", String(Math.round(rightWidth)));
  };

  // ---------------------------------------------------------------- render
  if (problemSlug && problemQuery.isLoading) return <div className="min-h-dvh bg-ink"><PageLoader /></div>;

  const fileName = snippet?.title ?? (problem ? `${problem.slug}.${fileExt(language)}` : `main.${fileExt(language)}`);
  const saveState = !user ? t("ide.draft") : snippet ? (autoSaving || saving ? t("common.saving") : dirty ? t("ide.unsaved") : t("ide.savedState")) : t("ide.draft");
  const fontSize = profile?.editor_font_size ?? 15;
  const theme = profile?.editor_theme ?? "ink-dark";
  const runningLabel = busy === "submit" ? t("ide.submitting") : t("ide.running");

  const editor = (
    <CodeEditor ref={editorRef} value={code} onChange={setCode} language={language} theme={theme} fontSize={fontSize}
      onRunShortcut={run} ariaLabel={`${langLabel(language)} code editor`} />
  );
  const inputBox = (
    <Textarea tone="dark" mono value={stdin} onChange={(e) => setStdin(e.target.value)} spellCheck={false}
      placeholder={t("ide.inputHint")} aria-label={t("ide.customInput")}
      className="h-full min-h-[96px] resize-none border-ink-600 bg-ink-800 text-[14px]" />
  );

  const langPills = (
    <div role="radiogroup" aria-label={t("common.language")} className="flex items-center gap-1.5">
      {(["c", "python"] as const).map((l) => {
        const disabled = problem ? !problem.allowed_languages.includes(l) : false;
        return (
          <button key={l} role="radio" aria-checked={language === l} disabled={disabled} onClick={() => switchLanguage(l)}
            className={cn("h-8 rounded px-4 text-sm font-bold transition-colors disabled:opacity-30",
              language === l ? "bg-lime text-ink" : "bg-ink-700 text-paper hover:bg-ink-600")}>
            {langLabel(l)}
          </button>
        );
      })}
    </div>
  );

  const moreMenu = (
    <Menu dark trigger={<Button variant="ghost-dark" size="icon-sm" aria-label={t("ide.more")}><MoreHorizontal /></Button>}>
      <MenuItem dark onSelect={() => setOpenDialog(true)}><FolderOpen /> {t("ide.openSaved")}</MenuItem>
      <MenuItem dark onSelect={() => requestSave("save")}><Save /> {t("ide.save")}</MenuItem>
      <MenuItem dark onSelect={() => requestSave("saveAs")}><FileCode2 /> {t("ide.saveAs")}</MenuItem>
      <MenuSeparator dark />
      <MenuItem dark onSelect={() => editorRef.current?.format()}><Sparkles /> {t("ide.format")}</MenuItem>
      <MenuItem dark onSelect={copyCode}><Copy /> {t("ide.copyCode")}</MenuItem>
      <MenuItem dark onSelect={() => setConfirmReset(true)}><RotateCcw /> {t("ide.reset")}</MenuItem>
      <MenuItem dark onSelect={() => setResult(null)}><Trash2 /> {t("ide.clearOutput")}</MenuItem>
      <MenuSeparator dark />
      <MenuItem dark onSelect={toggleFullscreen}>{fullscreen ? <Shrink /> : <Expand />} {fullscreen ? t("ide.exitFullscreen") : t("ide.fullscreen")}</MenuItem>
      <MenuItem dark onSelect={() => nav("/")}><Home /> {t("nav.home")}</MenuItem>
    </Menu>
  );

  return (
    <div ref={rootRef} className="flex h-dvh flex-col overflow-hidden bg-ink text-paper">
      {/* ---------------- Desktop toolbar (slide 2) ---------------- */}
      <header className="hidden h-14 shrink-0 items-center gap-3 border-b border-ink-700 bg-ink-700/60 px-4 lg:flex">
        <Link to="/" aria-label="CampusCode home" className="mr-1"><Logo variant="mark" dark className="h-6" /></Link>
        {langPills}
        <span className="ml-2 flex min-w-0 items-center gap-2 font-mono text-xs text-paper/60">
          <span className={cn("size-1.5 rounded-full", dirty ? "bg-warning" : "bg-paper/50")} />
          <span className="truncate">{fileName}</span>
          <span className="text-paper/40">·</span>
          <span>{saveState}</span>
        </span>
        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost-dark" size="sm" onClick={() => setOpenDialog(true)}><FolderOpen /> {t("common.open")}</Button>
          <Button variant="ghost-dark" size="sm" onClick={() => requestSave("save")} loading={saving && !saveMode}><Save /> {t("ide.save")}</Button>
          <Button variant="ghost-dark" size="icon-sm" onClick={() => editorRef.current?.format()} aria-label={t("ide.format")} title={t("ide.format")}><Sparkles /></Button>
          <Button variant="ghost-dark" size="icon-sm" onClick={toggleFullscreen} aria-label={t("ide.fullscreen")} title={t("ide.fullscreen")}>{fullscreen ? <Shrink /> : <Expand />}</Button>
          {moreMenu}
          <LanguageSwitch dark className="mx-1" />
          {problem && (
            <>
              <Button variant="subtle-dark" size="sm" onClick={runSampleTests} loading={busy === "samples"} disabled={Boolean(busy)}><FlaskConical /> {t("ide.runSamples")}</Button>
              <Button variant="outline-dark" size="sm" onClick={submit} loading={busy === "submit"} disabled={Boolean(busy)}><Send /> {t("ide.submit")}</Button>
            </>
          )}
          <Button size="sm" onClick={run} loading={busy === "run"} disabled={Boolean(busy)} title="Ctrl/⌘ + Enter" className="px-5"><Play className="fill-current" /> {t("ide.run")}</Button>
        </div>
      </header>

      {/* ---------------- Mobile header (slide 3) ---------------- */}
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-ink-700 px-2 lg:hidden">
        <Button variant="ghost-dark" size="icon-sm" aria-label={t("nav.back")} onClick={() => (window.history.length > 1 ? nav(-1) : nav("/"))}><ArrowLeft /></Button>
        <p className="min-w-0 flex-1 truncate font-mono text-xs text-paper/80">{fileName} <span className="text-paper/40">•</span> {saveState}</p>
        <div className="flex items-center gap-1">
          {(["c", "python"] as const).map((l) => (
            <button key={l} onClick={() => switchLanguage(l)} aria-pressed={language === l}
              disabled={problem ? !problem.allowed_languages.includes(l) : false}
              className={cn("h-7 rounded px-2.5 text-xs font-bold disabled:opacity-30", language === l ? "bg-lime text-ink" : "bg-ink-700 text-paper")}>
              {l === "c" ? "C" : "Py"}
            </button>
          ))}
        </div>
        {moreMenu}
      </header>

      {/* ---------------- Mobile tabs ---------------- */}
      <div role="tablist" aria-label="IDE panels" className="flex shrink-0 border-b border-ink-700 lg:hidden">
        {(problem ? (["problem", "editor", "input", "output"] as const) : (["editor", "input", "output"] as const)).map((tab) => (
          <button key={tab} role="tab" aria-selected={mobileTab === tab} onClick={() => setMobileTab(tab)}
            className={cn("relative h-10 flex-1 text-sm font-semibold", mobileTab === tab ? "text-paper" : "text-paper/50")}>
            {t(`ide.${tab}`)}
            {tab === "output" && result && mobileTab !== "output" && <span className="absolute right-3 top-3 size-1.5 rounded-full bg-lime" />}
            {mobileTab === tab && <span className="absolute inset-x-6 bottom-0 h-0.5 rounded-full bg-lime" />}
          </button>
        ))}
      </div>

      {/* ---------------- Workspace ---------------- */}
      <div className="flex min-h-0 flex-1" onPointerMove={onDragMove} onPointerUp={onDragEnd}>
        {problem && (
          <aside className={cn("min-h-0 overflow-y-auto border-ink-700 p-5 scrollbar-thin lg:block lg:w-[340px] lg:shrink-0 lg:border-r xl:w-[380px]",
            mobileTab === "problem" ? "block w-full" : "hidden")}>
            <ProblemPanel problem={problem} samples={samples} topicName={topicName}
              onUseInput={(i) => { setStdin(i); setMobileTab("input"); toast.success(t("ide.customInput")); }} />
          </aside>
        )}

        <section aria-label={t("ide.editor")} className={cn("min-h-0 min-w-0 flex-1 lg:block", mobileTab === "editor" ? "block" : "hidden")}>
          {ready ? editor : <PageLoader />}
        </section>

        <div role="separator" aria-orientation="vertical" aria-label="Resize panels" tabIndex={0}
          onPointerDown={onDragStart}
          onKeyDown={(e) => { if (e.key === "ArrowLeft") setRightWidth((w) => w + 24); if (e.key === "ArrowRight") setRightWidth((w) => Math.max(300, w - 24)); }}
          className="hidden w-1.5 shrink-0 cursor-col-resize bg-ink-700 transition-colors hover:bg-lime/40 lg:block" />

        <aside style={{ ["--rw" as string]: `${rightWidth}px` }}
          className={cn("min-h-0 flex-col lg:flex lg:w-[var(--rw)] lg:shrink-0", mobileTab === "input" || mobileTab === "output" ? "flex w-full" : "hidden")}>
          <div className={cn("flex-col p-4 lg:flex lg:h-[34%] lg:min-h-[150px] lg:border-b lg:border-ink-700 lg:p-5", mobileTab === "input" ? "flex flex-1" : "hidden")}>
            <p className="eyebrow mb-2">{t("ide.customInput")}</p>
            <div className="min-h-0 flex-1">{inputBox}</div>
            <p className="mt-2 text-xs text-paper/40 lg:hidden">{t("ide.inputHint")}</p>
          </div>
          <div className={cn("min-h-0 flex-1 flex-col lg:flex", mobileTab === "output" ? "flex" : "hidden")}>
            <div className="flex items-center justify-between px-4 pt-4 lg:px-5">
              <p className="eyebrow">{t("ide.output")}</p>
              {result && <Button variant="ghost-dark" size="sm" onClick={() => setResult(null)}><Trash2 /> {t("ide.clearOutput")}</Button>}
            </div>
            <div className="m-4 mt-2 min-h-0 flex-1 overflow-y-auto rounded border border-ink-600 bg-ink-800 p-4 scrollbar-thin lg:m-5 lg:mt-2">
              <OutputPanel result={result} running={Boolean(busy)} runningLabel={runningLabel} />
            </div>
          </div>
        </aside>
      </div>

      {/* ---------------- Mobile persistent run bar ---------------- */}
      <div className="flex shrink-0 gap-2 border-t border-ink-700 p-3 pb-[calc(0.75rem+var(--safe-bottom))] lg:hidden">
        {problem && (
          <>
            <Button variant="subtle-dark" size="lg" className="px-3" onClick={runSampleTests} disabled={Boolean(busy)} aria-label={t("ide.runSamples")}><FlaskConical /></Button>
            <Button variant="outline-dark" size="lg" className="flex-1" onClick={submit} loading={busy === "submit"} disabled={Boolean(busy)}><Send /> {t("ide.submit")}</Button>
          </>
        )}
        <Button size="lg" className="flex-[2]" onClick={run} loading={busy === "run"} disabled={Boolean(busy)}><Play className="fill-current" /> {t("ide.runCode")}</Button>
      </div>

      <SaveDialog open={saveMode !== null} onOpenChange={(o) => !o && setSaveMode(null)} mode={saveMode ?? "save"}
        initialTitle={saveMode === "saveAs" && snippet ? `copy_of_${snippet.title}` : defaultTitle}
        initialDescription={snippet?.description ?? ""} onSave={doSave} saving={saving} />
      <OpenDialog open={openDialog} onOpenChange={setOpenDialog} onOpenSnippet={openSnippet} onOpenExample={openExample} />
      <ConfirmDialog open={confirmReset} onOpenChange={setConfirmReset} title={t("ide.reset")} body={t("ide.resetConfirm")} danger
        confirmLabel={t("ide.reset")} onConfirm={() => { setCode(starter(language)); setResult(null); setConfirmReset(false); }} />
    </div>
  );
}
