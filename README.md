# @nexcore/mention-editor

A Discord-style `@mention` rich-text editor built on [Slate.js](https://www.slatejs.org/). Mentions are atomic (void + inline) nodes: backspacing next to one deletes it whole, and the suggestion menu tracks the real caret position via `ReactEditor.toDOMRange`.

## Install

```sh
npm install @nexcore/mention-editor slate slate-react slate-history
```

Peer dependencies: React 18 or 19, `slate` and `slate-react` `^0.94.0`. No Tailwind setup required on your end — see [Styling](#styling).

## Usage

```tsx
import { MentionEditor } from '@nexcore/mention-editor';
import '@nexcore/mention-editor/styles.css';

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

| Prop | Type | Description |
| --- | --- | --- |
| `value` | `string` | Wire-format content (controlled). |
| `fields` | `{ id: string; label: string }[]` | Fields offered in the `@` suggestion menu; filter/localize before passing in. |
| `onChange` | `(value: string) => void` | Called with the new wire-format string. |
| `dir` | `'ltr' \| 'rtl'` | Applied to the editable surface for correct caret/bidi behavior. |
| `disabled` | `boolean` | Makes the editor read-only. |
| `isError` | `boolean` | Applies the invalid-state styling. |
| `placeholder` | `string` | Shown when the editor is empty. |
| `rows` | `number` | Approximate visible height, `<textarea rows>`-equivalent. |
| `className` | `string` | Extra class name(s) on the root container. |

## Styling

The default look is authored with Tailwind utility classes internally, but compiled at *this package's* build time into a self-contained `dist/styles.css` — import it once (as shown above) and it works with zero Tailwind setup on your end, whether or not your app uses Tailwind at all. The compiled CSS deliberately excludes Tailwind's Preflight (base element reset), so it can't leak out and restyle your app's own `<h1>`, `<button>`, etc.

Each rendered part also carries a stable class name (`.mention-editor`, `.mention-editor__editable`, `.mention-editor__mention`, `.mention-editor__menu`, `.mention-editor__menu-item`) for overrides or e2e test selectors. Pass `className` to add to the root container, or write CSS/Tailwind rules targeting these classes directly — they ship at normal specificity (single class selectors), so a later rule wins.

If your own app happens to use Tailwind and you want to reuse its utility classes against this component's internal DOM (beyond what `className` on the root reaches), you can optionally point your app's Tailwind config/`@source` at `node_modules/@nexcore/mention-editor/dist` — but this is purely an opt-in extra, not required for the component to work or look right.
