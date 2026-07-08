# @itsammarb/mention-editor

A Discord-style `@mention` rich-text editor built on [Slate.js](https://www.slatejs.org/). Mentions are atomic (void + inline) nodes: backspacing next to one deletes it whole, and the suggestion menu tracks the real caret position via `ReactEditor.toDOMRange`.

## Install

```sh
npm install @itsammarb/mention-editor slate slate-react slate-history
```

Peer dependencies: React 18 or 19, `slate` and `slate-react` `^0.94.0`. No Tailwind setup required on your end — see [Styling](#styling).

## Usage

```tsx
import { MentionEditor } from '@itsammarb/mention-editor';
import '@itsammarb/mention-editor/styles.css';

const fields = [
  { id: 'a1b2c3d4-0000-0000-0000-000000000001', label: 'Landlord Name' },
  { id: 'a1b2c3d4-0000-0000-0000-000000000002', label: 'Monthly Rent' },
];

function ClauseEditor() {
  const [value, setValue] = useState('Hello <@a1b2c3d4-0000-0000-0000-000000000001>, welcome.');

  return (
    <MentionEditor
      value={value}
      fields={fields}
      onChange={setValue}
      placeholder="Type @ to reference a field..."
      dir="rtl" // or "ltr"; omit to let the browser infer it
      rows={4}
    />
  );
}
```

## Wire format

`value` / `onChange` use a plain string, not a Slate document: mentions are written as the field's `id` wrapped in `<@` and `>`, e.g.:

```
Hello <@a1b2c3d4-0000-0000-0000-000000000001>, welcome.
```

`serialize`/`deserialize` (also exported) convert between this string and Slate's internal `Descendant[]` tree. `\n` in the string is a paragraph break. The closing `>` means any id shape works out of the box — no separate id-format configuration needed.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `value` | `string` | *(required)* | Wire-format content (controlled — the editor always reflects this string). |
| `fields` | `{ id: string; label: string }[]` | *(required)* | Fields offered in the `@` suggestion menu; filter/localize before passing in — the component doesn't fetch or translate these itself. |
| `onChange` | `(value: string) => void` | `undefined` | Called with the new wire-format string on every edit. Omit for a read-only display (combine with `disabled`). |
| `dir` | `'ltr' \| 'rtl'` | `undefined` (browser infers) | Applied directly as the `dir` HTML attribute on the editable surface — required for correct caret movement and bidi layout with RTL content such as Arabic. |
| `disabled` | `boolean` | `false` | Makes the editor read-only (`Editable`'s `readOnly`) and dims it via `opacity-60`. |
| `isError` | `boolean` | `false` | Swaps the border to the invalid-state color (`border-red-500`). Purely visual — doesn't block typing. |
| `placeholder` | `string` | `undefined` (no placeholder) | Shown only when the document is fully empty (a single empty paragraph) — see [Behavior notes](#behavior-notes). |
| `rows` | `number` | `undefined` (intrinsic `min-h-11`, ~44px) | Sets `min-height` to `rows * 1.5em`, textarea-`rows`-equivalent. The editor still grows taller than this if content wraps to more lines. |
| `className` | `string` | `undefined` | Extra class name(s) appended to the root container, after the built-in ones — use this for layout (width, margin) or to override the built-in border/background. |

## Exported utilities

Everything importable from `@itsammarb/mention-editor`:

| Export | Kind | Description |
| --- | --- | --- |
| `MentionEditor` | component | The editor itself; see [Props](#props). |
| `MentionEditorProps` | type | Prop types for `MentionEditor`. |
| `MentionFieldOption` | type | Shape of an entry in `fields`: `{ id: string; label: string }`. |
| `serialize(nodes: Descendant[]): string` | function | Converts a Slate `Descendant[]` tree to the wire-format string. Useful if you need to inspect/generate content outside the component (e.g. server-side). |
| `deserialize(value: string, fields?: MentionFieldOption[]): Descendant[]` | function | Inverse of `serialize`. `fields` resolves each mention's label; an id not found in `fields` still renders, falling back to the raw id as its label. |
| `serializeToDiscordMarkup` | function | Deprecated alias of `serialize`, kept for backwards compatibility with the pre-rename API. Prefer `serialize`. |
| `INITIAL_VALUE` | constant | The empty-document Slate value (`[{ type: 'paragraph', children: [{ text: '' }] }]`) `MentionEditor` uses internally when `value` is `''`. Useful if you're building your own Slate tooling around this package's types. |
| `MENTION_OPEN` / `MENTION_CLOSE` | constants | The literal delimiters (`'<@'` / `'>'`) used by the wire format — not configurable, but exported so you can detect/strip mention tokens from raw wire strings yourself without duplicating the regex. |

## Styling

The default look is authored with Tailwind utility classes internally, but compiled at *this package's* build time into a self-contained `dist/styles.css` — import it once (as shown above) and it works with zero Tailwind setup on your end, whether or not your app uses Tailwind at all. The compiled CSS deliberately excludes Tailwind's Preflight (base element reset), so it can't leak out and restyle your app's own `<h1>`, `<button>`, etc.

Every rendered part carries a stable class name, at normal specificity (plain single-class selectors, so a later rule you write always wins):

| Class | Element | Notes |
| --- | --- | --- |
| `.mention-editor` | root `<div>` | Border, rounding, background; gets `className` appended and `opacity-60` when `disabled`. |
| `.mention-editor__editable` | the `Editable` surface | Padding, text size/color, `min-height`. |
| `.mention-editor__paragraph` | each `<p>` block | Margin between paragraphs. |
| `.mention-editor__mention` | a mention `<span>` | Color, underline, `unicode-bidi: isolate` (see [Behavior notes](#behavior-notes)). |
| `.mention-editor__menu` | suggestion menu `<div>` | Portaled to `document.body`; border, shadow, sizing. |
| `.mention-editor__menu-item` | each menu row `<div>` | Also gets a highlight class when it's the keyboard-selected row. |

Override any of these by targeting the class directly in your own CSS, or via `className` on the root for layout/border/background changes.

### Theme colors

Every color is also a CSS custom property, so you can retheme the whole component with a handful of variable declarations instead of overriding individual classes. Set them anywhere that's an ancestor of the whole page — `:root`, `html`, `body`, or a global stylesheet rule — **not** scoped to `.mention-editor` itself: the suggestion menu is rendered through a React portal directly into `document.body`, so it sits *outside* `.mention-editor` in the real DOM and wouldn't inherit a variable scoped there.

```css
/* anywhere in your global CSS, loaded in any order relative to this package's styles.css */
:root {
  --mention-editor-mention-color: #16a34a; /* green mention text/underline */
  --mention-editor-mention-bg: #dcfce7; /* optional pill-style highlight behind a mention */
  --mention-editor-border-color: #db2777;
  --mention-editor-menu-highlight-bg: #fde68a; /* selected/hovered suggestion row */
}
```

| Variable | Controls | Light default | Dark default |
| --- | --- | --- | --- |
| `--mention-editor-bg` | Editor container background | white | neutral-900 |
| `--mention-editor-text-color` | Editor body text color | gray-900 | gray-100 |
| `--mention-editor-border-color` | Container border (normal state) | gray-300 | neutral-700 |
| `--mention-editor-border-color-error` | Container border when `isError` | red-500 | red-500 (same in both) |
| `--mention-editor-placeholder-color` | Placeholder text color | gray-400 | neutral-500 |
| `--mention-editor-mention-color` | A mention's text/underline color | blue-600 | blue-400 |
| `--mention-editor-mention-bg` | Background behind a mention (e.g. a pill highlight) | transparent | transparent |
| `--mention-editor-menu-bg` | Suggestion menu background | white | neutral-800 |
| `--mention-editor-menu-border-color` | Suggestion menu border | gray-300 | neutral-700 |
| `--mention-editor-menu-text-color` | Suggestion menu row text | gray-900 | gray-100 |
| `--mention-editor-menu-highlight-bg` | Selected/hovered suggestion row background | indigo-50 | neutral-700 |

Setting a variable applies it in both light and dark mode (the fallback is what differs by scheme, not the override) — if you want genuinely different override colors per scheme, redeclare the variable yourself inside your own `@media (prefers-color-scheme: dark)` block.

These defaults aren't asserted anywhere as a real `:root` rule in this package's stylesheet — they're inline `var(--x, fallback)` fallbacks on each utility class instead. That's deliberate: a real default declaration and a consumer override would both be equal-specificity `:root` rules, so whichever stylesheet happened to load *last* would silently win regardless of intent. Reading the variable with an inline fallback means there's only ever one real assignment (yours, if you set one), so load order can't matter.

**Dark mode**: the built-in dark defaults respond to the OS/browser's `prefers-color-scheme: dark`, *not* a manually-toggled `.dark` class (e.g. from `next-themes` or a similar library). If your app drives dark mode via a class rather than OS preference, set the variables above directly (they'll then apply regardless of scheme), or scope your own overrides under your app's dark-mode class selector.

If your own app happens to use Tailwind and you want to reuse its utility classes against this component's internal DOM (beyond what `className` on the root reaches), you can optionally point your app's Tailwind config/`@source` at `node_modules/@itsammarb/mention-editor/dist` — but this is purely an opt-in extra, not required for the component to work or look right.

## Behavior notes

Things that are fixed (not currently exposed as props), so you know what to expect rather than hunt for a setting:

- The trigger character is always `@`, and it only fires at the start of a line or after whitespace — typing `user@` mid-word never opens the menu.
- The suggestion menu shows at most the first 10 matches of `fields`, filtered by a case-insensitive substring match against `label`. There's no built-in async/debounced search — `fields` is expected to already be the candidate list.
- Keyboard handling in the menu is fixed: `↑`/`↓` to move, `Tab` or `Enter` to select, `Escape` to dismiss.
- Undo/redo (`Ctrl/Cmd+Z`, `Ctrl/Cmd+Shift+Z`) works out of the box via `slate-history`.
- A mention is atomic: backspacing immediately after one deletes it whole in a single keystroke, never leaving a partial node.
- `placeholder` only renders when the document is *exactly* one empty paragraph — it disappears the moment any character (or a mention) is present, and won't reappear just because the visible text looks empty (e.g. a paragraph containing only a mention still counts as non-empty).
