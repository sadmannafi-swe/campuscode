import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";

function base(dark: boolean, fontSize: number) {
  return EditorView.theme({
    "&": { height: "100%", fontSize: `${fontSize}px`, backgroundColor: dark ? "#101820" : "#FFFFFF", color: dark ? "#F5F4EF" : "#101820" },
    ".cm-content": { padding: "12px 0", caretColor: dark ? "#B7F36B" : "#101820", lineHeight: "1.7" },
    ".cm-gutters": { backgroundColor: dark ? "#101820" : "#FFFFFF", color: "#708090", border: "none", paddingLeft: "8px" },
    ".cm-lineNumbers .cm-gutterElement": { padding: "0 12px 0 4px", minWidth: "28px" },
    ".cm-activeLine": { backgroundColor: dark ? "#17222B" : "#F5F4EF" },
    ".cm-activeLineGutter": { backgroundColor: "transparent", color: dark ? "#B7F36B" : "#101820" },
    ".cm-cursor, .cm-dropCursor": { borderLeftColor: dark ? "#B7F36B" : "#101820", borderLeftWidth: "2px" },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": {
      backgroundColor: dark ? "rgba(183,243,107,0.22) !important" : "rgba(183,243,107,0.45) !important",
    },
    ".cm-matchingBracket": { backgroundColor: dark ? "rgba(183,243,107,0.18)" : "rgba(183,243,107,0.5)", outline: "none" },
    ".cm-tooltip": { backgroundColor: dark ? "#17222B" : "#FFFFFF", border: `1px solid ${dark ? "#2B3944" : "#E5E4DC"}`, borderRadius: "6px" },
    ".cm-tooltip-autocomplete ul li[aria-selected]": { backgroundColor: dark ? "#2B3944" : "#F5F4EF", color: "inherit" },
    ".cm-panels": { backgroundColor: dark ? "#17222B" : "#F5F4EF", color: "inherit" },
    ".cm-searchMatch": { backgroundColor: "rgba(183,121,31,0.35)" },
    ".cm-foldPlaceholder": { backgroundColor: "transparent", border: "none", color: "#708090" },
  }, { dark });
}

const darkHighlight = HighlightStyle.define([
  { tag: [t.keyword, t.controlKeyword, t.moduleKeyword, t.operatorKeyword], color: "#B7F36B" },
  { tag: [t.processingInstruction, t.meta], color: "#B7F36B" },
  { tag: [t.typeName, t.standard(t.typeName)], color: "#8FD3C7" },
  { tag: [t.string, t.special(t.string), t.character], color: "#F2D7A0" },
  { tag: [t.number, t.bool, t.null], color: "#F0A97C" },
  { tag: [t.comment, t.lineComment, t.blockComment], color: "#708090", fontStyle: "italic" },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: "#E5E4DC", fontWeight: "500" },
  { tag: [t.definition(t.variableName)], color: "#F5F4EF" },
  { tag: [t.operator, t.punctuation, t.bracket], color: "#9AA7B4" },
  { tag: t.escape, color: "#F0A97C" },
]);

const lightHighlight = HighlightStyle.define([
  { tag: [t.keyword, t.controlKeyword, t.moduleKeyword, t.operatorKeyword], color: "#3B7A12", fontWeight: "500" },
  { tag: [t.processingInstruction, t.meta], color: "#3B7A12" },
  { tag: [t.typeName, t.standard(t.typeName)], color: "#23845B" },
  { tag: [t.string, t.special(t.string), t.character], color: "#8A5A00" },
  { tag: [t.number, t.bool, t.null], color: "#B7791F" },
  { tag: [t.comment, t.lineComment, t.blockComment], color: "#708090", fontStyle: "italic" },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: "#101820", fontWeight: "600" },
  { tag: [t.operator, t.punctuation, t.bracket], color: "#4A5866" },
  { tag: t.escape, color: "#B7791F" },
]);

export function editorTheme(theme: "ink-dark" | "paper-light", fontSize: number) {
  const dark = theme === "ink-dark";
  return [base(dark, fontSize), syntaxHighlighting(dark ? darkHighlight : lightHighlight)];
}
