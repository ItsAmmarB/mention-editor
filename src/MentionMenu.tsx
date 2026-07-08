import React from 'react';
import { createPortal } from 'react-dom';
import { MentionFieldOption } from './types';

interface MentionMenuProps {
  fields: MentionFieldOption[];
  selectedIndex: number;
  onSelect: (field: MentionFieldOption) => void;
  onHover: (index: number) => void;
  targetRect: DOMRect | null;
}

export const MentionMenu: React.FC<MentionMenuProps> = ({
  fields,
  selectedIndex,
  onSelect,
  onHover,
  targetRect,
}) => {
  if (!targetRect || fields.length === 0) return null;

  // Rendered into document.body via a portal and positioned with `fixed` using
  // raw viewport coordinates from getBoundingClientRect(). This is what makes
  // the menu land correctly regardless of whether the editor sits inside a
  // scrollable container, a `position: fixed` modal, or a modal nested inside
  // another modal: portaling to <body> means there's no transformed/positioned
  // ancestor between the menu and the viewport to throw off `fixed` coordinates.
  // The caller (MentionEditor) keeps `targetRect` fresh across scroll/resize.
  return createPortal(
    <div
      className="mention-editor__menu z-[9999] w-[280px] max-h-[300px] overflow-y-auto rounded-md border border-gray-300 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-800"
      style={{
        position: 'fixed',
        top: targetRect.bottom + 8,
        left: targetRect.left,
      }}
    >
      {fields.map((field, i) => (
        <div
          key={field.id}
          className={
            'mention-editor__menu-item cursor-pointer px-3 py-2 text-gray-900 dark:text-gray-100' +
            (i === selectedIndex ? ' bg-indigo-50 dark:bg-neutral-700' : '')
          }
          onClick={(e) => {
            e.preventDefault();
            onSelect(field);
          }}
          onMouseDown={(e) => e.preventDefault()} // Prevent editor blur
          onMouseEnter={() => onHover(i)}
        >
          {field.label}
        </div>
      ))}
    </div>,
    document.body
  );
};
