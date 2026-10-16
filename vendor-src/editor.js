// AVALAND code editor: CodeMirror 6 bundled into one file (window.AvaEditor)
import { EditorState, Compartment } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection, highlightSpecialChars } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab, toggleComment, undo, redo } from "@codemirror/commands";
import { indentOnInput, bracketMatching, syntaxHighlighting, HighlightStyle, StreamLanguage, indentUnit, foldGutter } from "@codemirror/language";
import { closeBrackets, closeBracketsKeymap, autocompletion, completeAnyWord } from "@codemirror/autocomplete";
import { tags as t } from "@lezer/highlight";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { sql, SQLite } from "@codemirror/lang-sql";
import { cpp } from "@codemirror/lang-cpp";
import { java } from "@codemirror/lang-java";
import { rust } from "@codemirror/lang-rust";
import { php } from "@codemirror/lang-php";
import { go } from "@codemirror/lang-go";
import { csharp, kotlin, dart } from "@codemirror/legacy-modes/mode/clike";
import { swift } from "@codemirror/legacy-modes/mode/swift";
import { ruby } from "@codemirror/legacy-modes/mode/ruby";

const LANG = {
  py: () => python(), base: () => python(),
  js: () => javascript(), ts: () => javascript({ typescript: true }),
  sql: () => sql({ dialect: SQLite, upperCaseKeywords: true }),
  cpp: () => cpp(), java: () => java(), rs: () => rust(), go: () => go(),
  php: () => php({ plain: false }),
  cs: () => StreamLanguage.define(csharp), kt: () => StreamLanguage.define(kotlin),
  dart: () => StreamLanguage.define(dart), swift: () => StreamLanguage.define(swift),
  rb: () => StreamLanguage.define(ruby),
};
const INDENT = { go: "\t", rb: "  ", dart: "  ", kt: "    ", swift: "    " };

const style = HighlightStyle.define([
  { tag: [t.keyword, t.controlKeyword, t.moduleKeyword, t.operatorKeyword, t.definitionKeyword, t.modifier, t.self, t.null, t.bool], color: "#8fc3f0" },
  { tag: [t.string, t.special(t.string), t.character, t.regexp], color: "#e7c27a" },
  { tag: [t.number, t.integer, t.float, t.atom], color: "#c9a0e8" },
  { tag: [t.comment, t.lineComment, t.blockComment, t.docComment], color: "#6f8799", fontStyle: "italic" },
  { tag: [t.function(t.variableName), t.function(t.propertyName), t.macroName], color: "#9fd49a" },
  { tag: [t.typeName, t.className, t.namespace, t.standard(t.typeName)], color: "#f0a878" },
  { tag: [t.definition(t.variableName), t.definition(t.propertyName)], color: "#e8ecef" },
  { tag: [t.propertyName, t.attributeName], color: "#bcd3e3" },
  { tag: [t.operator, t.punctuation, t.bracket], color: "#a9bccb" },
  { tag: t.meta, color: "#c9a0e8" },
  { tag: t.invalid, color: "#e0654f" },
]);

const theme = EditorView.theme({
  "&": { color: "#d6dee5", backgroundColor: "#07121c", fontSize: "14px", height: "100%" },
  ".cm-scroller": { fontFamily: 'var(--mono, "JetBrains Mono", ui-monospace, Menlo, monospace)', lineHeight: "1.55", overflow: "auto" },
  ".cm-content": { caretColor: "#e2b04a", padding: "10px 0", fontVariantLigatures: "none" },
  ".cm-gutters": { backgroundColor: "#07121c", color: "#4f6577", border: "none", borderRight: "1px solid #17324a" },
  ".cm-activeLine": { backgroundColor: "#0e2335" },
  ".cm-activeLineGutter": { backgroundColor: "#0e2335", color: "#93a6b5" },
  "&.cm-focused .cm-cursor": { borderLeftColor: "#e2b04a", borderLeftWidth: "2px" },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": { backgroundColor: "#2a4a66 !important" },
  ".cm-matchingBracket": { backgroundColor: "#24455f", outline: "1px solid #3d6a8c" },
  "&.cm-focused": { outline: "none" },
  ".cm-tooltip": { backgroundColor: "#12253a", border: "1px solid #22405a", color: "#e8ecef" },
  ".cm-tooltip-autocomplete > ul > li[aria-selected]": { backgroundColor: "#22405a", color: "#fff" },
  ".cm-foldGutter span": { color: "#4f6577" },
}, { dark: true });

function create(parent, opts = {}) {
  const lang = new Compartment(), tab = new Compartment();
  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc: opts.value || "",
      extensions: [
        lineNumbers(), highlightActiveLineGutter(), highlightSpecialChars(), history(), foldGutter(), drawSelection(),
        indentOnInput(), bracketMatching(), closeBrackets(), highlightActiveLine(),
        autocompletion({ override: [completeAnyWord], activateOnTyping: true, icons: false }),
        syntaxHighlighting(style), theme,
        tab.of(indentUnit.of(INDENT[opts.lang] || "    ")),
        lang.of((LANG[opts.lang] || LANG.py)()),
        EditorState.tabSize.of(4),
        keymap.of([
          { key: "Mod-Enter", run: () => { opts.onRun && opts.onRun(); return true; } },
          { key: "Mod-/", run: toggleComment },
          ...closeBracketsKeymap, ...defaultKeymap, ...historyKeymap, indentWithTab,
        ]),
        EditorView.contentAttributes.of({ autocapitalize: "off", autocorrect: "off", spellcheck: "false", "aria-label": opts.label || "Редактор кода" }),
        EditorView.updateListener.of(u => { if (u.docChanged && opts.onChange) opts.onChange(u.state.doc.toString()); }),
      ],
    }),
  });
  return {
    view,
    get value() { return view.state.doc.toString(); },
    set value(v) { view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: v } }); },
    setLang(l) { view.dispatch({ effects: [lang.reconfigure((LANG[l] || LANG.py)()), tab.reconfigure(indentUnit.of(INDENT[l] || "    "))] }); },
    insert(text, caretBack = 0) {
      const r = view.state.selection.main;
      view.dispatch({ changes: { from: r.from, to: r.to, insert: text }, selection: { anchor: r.from + text.length - caretBack } });
      view.focus();
    },
    indent() { view.focus(); indentWithTab.run(view); },
    undo() { undo(view); view.focus(); },
    redo() { redo(view); view.focus(); },
    focus() { view.focus(); },
    destroy() { view.destroy(); },
  };
}

window.AvaEditor = { create };
