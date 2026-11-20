import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { EditorState, Compartment } from "@codemirror/state";
import {
  EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection, placeholder as cmPlaceholder,
} from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab, indentSelection, selectAll } from "@codemirror/commands";
import { bracketMatching, indentOnInput, foldGutter, indentUnit } from "@codemirror/language";
import { closeBrackets, closeBracketsKeymap, autocompletion, completionKeymap } from "@codemirror/autocomplete";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { cpp } from "@codemirror/lang-cpp";
import { python } from "@codemirror/lang-python";
import { editorTheme } from "./themes";
import { cn } from "@/lib/utils";
import type { Lang } from "@/types/db";

export interface CodeEditorHandle {
  format: () => void;
  focus: () => void;
  getValue: () => string;
}

interface Props {
  value: string;
  onChange?: (value: string) => void;
  language: Lang;
  theme?: "ink-dark" | "paper-light";
  fontSize?: number;
  readOnly?: boolean;
  className?: string;
  ariaLabel?: string;
  onRunShortcut?: () => void;
  placeholder?: string;
  minimal?: boolean;
}

const langExt = (l: Lang) => (l === "c" ? cpp() : python());

/** CodeMirror 6 editor: syntax highlighting, line numbers, bracket matching, auto-indent, search, history. */
export const CodeEditor = forwardRef<CodeEditorHandle, Props>(function CodeEditor(
  { value, onChange, language, theme = "ink-dark", fontSize = 15, readOnly, className, ariaLabel, onRunShortcut, placeholder, minimal }, ref,
) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const runRef = useRef(onRunShortcut);
  onChangeRef.current = onChange;
  runRef.current = onRunShortcut;
  const langComp = useRef(new Compartment());
  const themeComp = useRef(new Compartment());
  const roComp = useRef(new Compartment());

  useEffect(() => {
    if (!host.current) return;
    const state = EditorState.create({
      doc: value,
      extensions: [
        minimal ? [] : lineNumbers(),
        minimal ? [] : foldGutter({ openText: "▾", closedText: "▸" }),
        highlightActiveLineGutter(),
        highlightActiveLine(),
        history(),
        drawSelection(),
        indentOnInput(),
        indentUnit.of("    "),
        bracketMatching(),
        closeBrackets(),
        autocompletion({ activateOnTyping: true }),
        highlightSelectionMatches(),
        EditorState.tabSize.of(4),
        keymap.of([
          { key: "Mod-Enter", run: () => { runRef.current?.(); return true; } },
          ...closeBracketsKeymap, ...defaultKeymap, ...searchKeymap, ...historyKeymap, ...completionKeymap, indentWithTab,
        ]),
        langComp.current.of(langExt(language)),
        themeComp.current.of(editorTheme(theme, fontSize)),
        roComp.current.of([EditorState.readOnly.of(Boolean(readOnly)), EditorView.editable.of(!readOnly)]),
        placeholder ? cmPlaceholder(placeholder) : [],
        EditorView.contentAttributes.of({ "aria-label": ariaLabel ?? "Code editor", autocapitalize: "off", autocorrect: "off", spellcheck: "false" }),
        EditorView.lineWrapping,
        EditorView.updateListener.of((u) => {
          if (u.docChanged) onChangeRef.current?.(u.state.doc.toString());
        }),
      ],
    });
    view.current = new EditorView({ state, parent: host.current });
    return () => { view.current?.destroy(); view.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // external value changes (open snippet, reset, language switch)
  useEffect(() => {
    const v = view.current;
    if (v && v.state.doc.toString() !== value) {
      v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: value } });
    }
  }, [value]);

  useEffect(() => { view.current?.dispatch({ effects: langComp.current.reconfigure(langExt(language)) }); }, [language]);
  useEffect(() => { view.current?.dispatch({ effects: themeComp.current.reconfigure(editorTheme(theme, fontSize)) }); }, [theme, fontSize]);
  useEffect(() => {
    view.current?.dispatch({ effects: roComp.current.reconfigure([EditorState.readOnly.of(Boolean(readOnly)), EditorView.editable.of(!readOnly)]) });
  }, [readOnly]);

  useImperativeHandle(ref, () => ({
    format: () => {
      const v = view.current;
      if (!v) return;
      const sel = v.state.selection;
      selectAll(v);
      indentSelection(v);
      // trim trailing whitespace on every line
      const text = v.state.doc.toString().split("\n").map((l) => l.replace(/[ \t]+$/, "")).join("\n");
      v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: text }, selection: { anchor: Math.min(sel.main.anchor, text.length) } });
    },
    focus: () => view.current?.focus(),
    getValue: () => view.current?.state.doc.toString() ?? value,
  }), [value]);

  return <div ref={host} className={cn("cm-host h-full min-h-0 overflow-hidden", className)} />;
});
