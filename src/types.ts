import { BaseEditor, Descendant } from 'slate';
import { ReactEditor } from 'slate-react';
import { HistoryEditor } from 'slate-history';

// A mentionable field/clause offered by the consuming app (already localized/filtered).
export interface MentionFieldOption {
  id: string;
  label: string;
}

// Custom Slate Types
export type CustomText = { text: string };
export type MentionElement = {
  type: 'mention';
  field: MentionFieldOption;
  children: CustomText[];
};
export type ParagraphElement = {
  type: 'paragraph';
  children: (CustomText | MentionElement)[];
};

declare module 'slate' {
  interface CustomTypes {
    Editor: BaseEditor & ReactEditor & HistoryEditor;
    Element: ParagraphElement | MentionElement;
    Text: CustomText;
  }
}

export const INITIAL_VALUE: Descendant[] = [
  {
    type: 'paragraph',
    children: [{ text: '' }],
  },
];

// Delimiters wrapping a mention's id in the wire format, e.g. `<@a1b2c3d4-...>`.
export const MENTION_OPEN = '<@';
export const MENTION_CLOSE = '>';

// Per-instance color overrides for `MentionEditor`. Omitted keys keep the
// built-in default (see src/colors.ts for the CSS variable each maps to).
export interface MentionEditorColors {
  bg?: string;
  textColor?: string;
  borderColor?: string;
  borderColorError?: string;
  placeholderColor?: string;
  mentionColor?: string;
  mentionBg?: string;
  menuBg?: string;
  menuBorderColor?: string;
  menuTextColor?: string;
  menuHighlightBg?: string;
}
