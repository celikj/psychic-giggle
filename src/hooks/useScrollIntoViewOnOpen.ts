import { useEffect, useRef } from 'react';

/**
 * Makes sure the add/edit form is actually on screen once it opens.
 *
 * The editor renders in place of the item being edited, so it's already where
 * the user was looking — but a card near the bottom edge is replaced by a form
 * several times its height, which would still run off the fold. Adding a new
 * item has no anchor at all: the form appears at the end of a list the user may
 * be scrolled well above.
 *
 * `block: 'nearest'` scrolls the minimum needed, so the common case (the form
 * already fully visible) doesn't move at all. For a form taller than the
 * viewport that means aligning its top edge, landing on the title field.
 *
 * Pass the id of whatever is being edited as `key` too, so switching straight
 * from one item's editor to another's re-scrolls.
 */
export function useScrollIntoViewOnOpen<T extends HTMLElement>(open: boolean, key?: string | null) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!open) return;
    // The form animates in; measuring on the next frame avoids scrolling to
    // where it started rather than where it lands.
    const frame = requestAnimationFrame(() => {
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    return () => cancelAnimationFrame(frame);
  }, [open, key]);

  return ref;
}
