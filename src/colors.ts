import type { CSSProperties } from 'react';
import { MentionEditorColors } from './types';

// Maps each `colors` prop key to the CSS custom property the compiled
// Tailwind classes read via `var(--x, <built-in fallback>)`. Setting the
// property inline (rather than requiring a consumer to write global CSS)
// wins over the fallback automatically -- and, being inline, wins regardless
// of stylesheet load order, since there's no competing external rule to race.
const COLOR_VARS: Record<keyof MentionEditorColors, string> = {
  bg: '--mention-editor-bg',
  textColor: '--mention-editor-text-color',
  borderColor: '--mention-editor-border-color',
  borderColorError: '--mention-editor-border-color-error',
  placeholderColor: '--mention-editor-placeholder-color',
  mentionColor: '--mention-editor-mention-color',
  mentionBg: '--mention-editor-mention-bg',
  menuBg: '--mention-editor-menu-bg',
  menuBorderColor: '--mention-editor-menu-border-color',
  menuTextColor: '--mention-editor-menu-text-color',
  menuHighlightBg: '--mention-editor-menu-highlight-bg',
};

/**
 * Builds an inline `style` object setting only the CSS custom properties for
 * the given keys that are actually present in `colors` -- omitted keys are
 * left unset entirely, so the built-in fallback in the compiled CSS still
 * applies for them.
 */
export const colorsToCssVars = (
  colors: MentionEditorColors | undefined,
  keys: (keyof MentionEditorColors)[]
): CSSProperties => {
  if (!colors) return {};
  const style: Record<string, string> = {};
  for (const key of keys) {
    const value = colors[key];
    if (value) style[COLOR_VARS[key]] = value;
  }
  return style as CSSProperties;
};
