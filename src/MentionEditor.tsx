import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createEditor, Descendant, Editor, Transforms, Range } from 'slate';
import { Slate, Editable, ReactEditor, RenderPlaceholderProps, withReact } from 'slate-react';
import { withHistory } from 'slate-history';
import { MentionFieldOption, INITIAL_VALUE } from './types';
import { serialize, deserialize } from './serialize';
import { MentionMenu } from './MentionMenu';

export interface MentionEditorProps {
  /** Wire-format string, e.g. `"Hello <@a1b2c3d4-...>, pay rent."` */
  value: string;
  /** Already localized/filtered list of fields the consumer wants offered. */
  fields: MentionFieldOption[];
  onChange?: (value: string) => void;
  dir?: 'ltr' | 'rtl';
  disabled?: boolean;
  isError?: boolean;
  placeholder?: string;
  /** Approximate visible height, textarea-`rows`-equivalent. */
  rows?: number;
  className?: string;
}

export function MentionEditor(props: MentionEditorProps): React.JSX.Element {
  const {
    value,
    fields,
    onChange,
    dir,
    disabled = false,
    isError = false,
    placeholder,
    rows,
    className,
  } = props;

  // `generation` forces a full remount of the Slate editor instance whenever the
  // `value` prop changes for a reason *other* than our own onChange echoing back
  // down (e.g. the consumer swaps to editing a different record). See the
  // render-time reset block below for the echo-vs-external distinction.
  const [generation, setGeneration] = useState(0);
  const editor = useMemo(() => withMentions(withHistory(withReact(createEditor()))), [generation]);

  const lastEmittedRef = useRef(value);
  const [committedValue, setCommittedValue] = useState(value);
  const [slateValue, setSlateValue] = useState<Descendant[]>(() =>
    value ? deserialize(value, fields) : INITIAL_VALUE
  );
  const [target, setTarget] = useState<Range | null>(null);
  const [index, setIndex] = useState(0);
  const [search, setSearch] = useState('');

  if (value !== committedValue) {
    setCommittedValue(value);
    if (value !== lastEmittedRef.current) {
      setSlateValue(value ? deserialize(value, fields) : INITIAL_VALUE);
      setGeneration((g) => g + 1);
      setTarget(null);
      setSearch('');
      setIndex(0);
      lastEmittedRef.current = value;
    }
  }

  // Filter fields based on the search query
  const filteredFields = useMemo(() => {
    if (!search) return fields.slice(0, 10); // Show top 10 if no search
    return fields
      .filter((field) => field.label.toLowerCase().includes(search.toLowerCase()))
      .slice(0, 10);
  }, [fields, search]);

  // Calculate the DOM position for the popup menu. This has to run in a layout
  // effect, *after* the DOM commits -- `target` and the text content it points
  // into are usually set in the very same state update (the user just typed
  // the character that both changed the content and opened the menu), so
  // resolving the DOM range during render itself would run before the new
  // text node exists, and silently fail.
  const [menuTargetRect, setMenuTargetRect] = useState<DOMRect | null>(null);
  useLayoutEffect(() => {
    if (!target) {
      setMenuTargetRect(null);
      return;
    }
    const recompute = () => {
      try {
        const domRange = ReactEditor.toDOMRange(editor, target);
        setMenuTargetRect(domRange.getBoundingClientRect());
      } catch {
        setMenuTargetRect(null);
      }
    };
    recompute();
    // getBoundingClientRect() is viewport-relative, so it goes stale the
    // moment any scrollable ancestor scrolls (capture phase catches that,
    // since plain `scroll` events don't bubble) or the window resizes --
    // recompute it fresh rather than trusting the last-known value.
    window.addEventListener('scroll', recompute, true);
    window.addEventListener('resize', recompute);
    return () => {
      window.removeEventListener('scroll', recompute, true);
      window.removeEventListener('resize', recompute);
    };
  }, [target, editor, slateValue]);

  // --- CORE LOGIC: Trigger Detection ---
  const handleChange = useCallback(
    (newValue: Descendant[]) => {
      setSlateValue(newValue);

      const serialized = serialize(newValue);
      if (serialized !== lastEmittedRef.current) {
        lastEmittedRef.current = serialized;
        setCommittedValue(serialized);
        onChange?.(serialized);
      }

      const mention = findMentionTrigger(editor);
      if (mention) {
        setTarget(mention.range);
        setSearch(mention.search);
        setIndex(0);
      } else {
        setTarget(null);
      }
    },
    [editor, onChange]
  );

  // --- CORE LOGIC: Insertion ---
  const selectField = useCallback(
    (selectedField: MentionFieldOption) => {
      if (target) {
        Transforms.select(editor, target);
        Transforms.delete(editor);
        Transforms.insertNodes(
          editor,
          {
            type: 'mention',
            field: selectedField,
            children: [{ text: '' }],
          },
          { select: true }
        );
        // Move cursor after the inserted void mention so the user can keep typing
        Transforms.move(editor, { distance: 1, unit: 'offset' });
        setTarget(null);
      }
    },
    [editor, target]
  );

  // --- KEYBOARD NAVIGATION ---
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (target) {
        switch (event.key) {
          case 'ArrowDown': {
            event.preventDefault();
            const nextIndex = index >= filteredFields.length - 1 ? 0 : index + 1;
            setIndex(nextIndex);
            break;
          }
          case 'ArrowUp': {
            event.preventDefault();
            const prevIndex = index <= 0 ? filteredFields.length - 1 : index - 1;
            setIndex(prevIndex);
            break;
          }
          case 'Tab':
          case 'Enter':
            event.preventDefault();
            selectField(filteredFields[index]);
            break;
          case 'Escape':
            event.preventDefault();
            setTarget(null);
            break;
        }
      }
    },
    [target, index, filteredFields, selectField]
  );

  const rootClassName = [
    'mention-editor relative rounded-md border',
    'bg-(--mention-editor-bg,var(--color-white)) dark:bg-(--mention-editor-bg,var(--color-neutral-900))',
    isError
      ? 'border-(--mention-editor-border-color-error,var(--color-red-500))'
      : 'border-(--mention-editor-border-color,var(--color-gray-300)) dark:border-(--mention-editor-border-color,var(--color-neutral-700))',
    disabled && 'opacity-60',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const editableStyle = rows ? { minHeight: `${rows * 1.5}em` } : undefined;

  return (
    <Slate key={generation} editor={editor} value={slateValue} onChange={handleChange}>
      <div className={rootClassName}>
        <Editable
          className="mention-editor__editable min-h-11 px-3 py-2 text-base leading-6 outline-none text-(--mention-editor-text-color,var(--color-gray-900)) dark:text-(--mention-editor-text-color,var(--color-gray-100))"
          style={editableStyle}
          dir={dir}
          readOnly={disabled}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          renderElement={(elementProps) => <Element {...elementProps} />}
          renderPlaceholder={renderPlaceholder}
        />
        {target && (
          <MentionMenu
            fields={filteredFields}
            selectedIndex={index}
            onSelect={selectField}
            onHover={setIndex}
            targetRect={menuTargetRect}
          />
        )}
      </div>
    </Slate>
  );
}

// slate-react's default placeholder renders at a fixed dim-black opacity,
// which reads poorly in dark mode. Overriding it lets the placeholder use
// real (theme-aware) Tailwind colors at full opacity instead.
const renderPlaceholder = ({ attributes, children }: RenderPlaceholderProps) => (
  <span
    {...attributes}
    style={{ ...attributes.style, opacity: 1 }}
    className="text-(--mention-editor-placeholder-color,var(--color-gray-400)) dark:text-(--mention-editor-placeholder-color,var(--color-neutral-500))"
  >
    {children}
  </span>
);

// --- TRIGGER DETECTION ---

const MAX_MENTION_SEARCH_LENGTH = 50;

/**
 * Finds an in-progress `@search` token immediately before the cursor, if any.
 *
 * This deliberately walks backward one character at a time via
 * `unit: 'character'` rather than `unit: 'word'`: Slate's word-unit movement
 * skips *past* a lone trailing `@` to find the nearest real word, which makes
 * it useless for detecting "the user just typed @ with nothing after it yet"
 * -- exactly the moment this needs to fire. Character-unit stepping is the
 * one primitive that behaves predictably here, including hopping over void
 * mentions as a single atomic step.
 *
 * Recomputing the full range (both ends) on every keystroke -- rather than
 * caching the anchor once and trusting a stale focus -- also means selecting
 * a suggestion always deletes exactly the `@search` text typed so far, never
 * leaving leftover characters behind.
 */
const findMentionTrigger = (editor: Editor): { range: Range; search: string } | null => {
  const { selection } = editor;
  if (!selection || !Range.isCollapsed(selection)) return null;
  const [start] = Range.edges(selection);

  let point = start;
  let text = '';
  for (let i = 0; i < MAX_MENTION_SEARCH_LENGTH; i++) {
    const prev = Editor.before(editor, point, { unit: 'character' });
    if (!prev) break;
    const char = Editor.string(editor, { anchor: prev, focus: point });
    if (char === '' || /\s/.test(char)) break; // hit a void boundary or whitespace
    text = char + text;
    point = prev;
    if (char === '@') break;
  }

  if (!text.startsWith('@')) return null;

  // The '@' must be at the very start of the block or preceded by whitespace,
  // never mid-word (e.g. "user@").
  const charBeforeAt = Editor.before(editor, point, { unit: 'character' });
  if (charBeforeAt) {
    const charBefore = Editor.string(editor, { anchor: charBeforeAt, focus: point });
    if (charBefore !== '' && !/\s/.test(charBefore)) return null;
  }

  return { range: { anchor: point, focus: start }, search: text.slice(1) };
};

// --- SLATE PLUGIN & RENDERERS ---

// Extends the editor to handle specific mention behaviors (like deleting the whole node on backspace)
const withMentions = (editor: Editor) => {
  const { isInline, isVoid, deleteBackward } = editor;

  editor.isInline = (element) => {
    return element.type === 'mention' ? true : isInline(element);
  };

  editor.isVoid = (element) => {
    return element.type === 'mention' ? true : isVoid(element);
  };

  // Custom delete behavior: if you backspace a mention, delete the whole thing
  editor.deleteBackward = (...args) => {
    const { selection } = editor;
    if (selection && Range.isCollapsed(selection)) {
      const before = Editor.before(editor, selection.anchor);
      if (before) {
        const [match] = Array.from(
          Editor.nodes(editor, {
            at: before,
            match: (n) => (n as { type?: string }).type === 'mention',
          })
        );
        if (match) {
          Transforms.delete(editor, { at: match[1] });
          return;
        }
      }
    }
    deleteBackward(...args);
  };

  return editor;
};

// Renders Slate nodes into React components
const Element: React.FC<{
  attributes: React.HTMLAttributes<HTMLElement>;
  children: React.ReactNode;
  element: { type: string; field?: MentionFieldOption };
}> = ({ attributes, children, element }) => {
  switch (element.type) {
    case 'mention':
      return (
        <span
          {...attributes}
          contentEditable={false}
          className="mention-editor__mention cursor-default underline decoration-1 underline-offset-2 [unicode-bidi:isolate] text-(--mention-editor-mention-color,var(--color-blue-600)) dark:text-(--mention-editor-mention-color,var(--color-blue-400)) bg-(--mention-editor-mention-bg,transparent)"
        >
          @{element.field?.label}
          {children}
        </span>
      );
    default:
      return (
        <p {...attributes} className="mention-editor__paragraph m-0 [&+&]:mt-1">
          {children}
        </p>
      );
  }
};
