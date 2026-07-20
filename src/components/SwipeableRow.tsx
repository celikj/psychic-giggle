import { useRef, useState, type ReactNode } from 'react';

interface Props {
  /** Swipe right (past the threshold) — e.g. complete the item. */
  onSwipeRight?: () => void;
  /** Swipe left — e.g. delete the item. */
  onSwipeLeft?: () => void;
  /** Shown under the row while swiping right / left. */
  rightHint?: ReactNode;
  leftHint?: ReactNode;
  /** Suspend swiping (e.g. while a drag-reorder is in progress). */
  disabled?: boolean;
  children: ReactNode;
}

const THRESHOLD = 72;
const MAX_PULL = THRESHOLD * 1.5;

/**
 * Horizontal swipe wrapper for list rows. The first ~10px of movement decides
 * the gesture's axis: vertical stays with the page scroll (touch-action:
 * pan-y keeps that native), horizontal moves the row and reveals the hint
 * layer, triggering the action when released past the threshold.
 */
export default function SwipeableRow({ onSwipeRight, onSwipeLeft, rightHint, leftHint, disabled, children }: Props) {
  const [dx, setDx] = useState(0);
  const [settling, setSettling] = useState(false);
  const gesture = useRef<{ x: number; y: number; axis: 'h' | 'v' | null }>({ x: 0, y: 0, axis: null });

  const onTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    const t = e.touches[0];
    gesture.current = { x: t.clientX, y: t.clientY, axis: null };
    setSettling(false);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (disabled) return;
    const t = e.touches[0];
    const rawDx = t.clientX - gesture.current.x;
    const rawDy = t.clientY - gesture.current.y;
    if (!gesture.current.axis) {
      if (Math.abs(rawDx) < 10 && Math.abs(rawDy) < 10) return;
      gesture.current.axis = Math.abs(rawDx) > Math.abs(rawDy) ? 'h' : 'v';
    }
    if (gesture.current.axis !== 'h') return;
    let next = rawDx;
    if (next > 0 && !onSwipeRight) next = 0;
    if (next < 0 && !onSwipeLeft) next = 0;
    setDx(Math.max(-MAX_PULL, Math.min(MAX_PULL, next)));
  };

  const onTouchEnd = () => {
    if (disabled) return;
    if (gesture.current.axis === 'h') {
      if (dx >= THRESHOLD) onSwipeRight?.();
      else if (dx <= -THRESHOLD) onSwipeLeft?.();
    }
    gesture.current.axis = null;
    setSettling(true);
    setDx(0);
  };

  const progress = Math.min(1, Math.abs(dx) / THRESHOLD);

  return (
    <div
      className="relative"
      style={{ touchAction: 'pan-y' }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
    >
      {dx > 0 && (
        <div
          className="absolute inset-0 rounded-2xl bg-green-500/15 border border-green-500/25 flex items-center justify-start pl-5"
          style={{ opacity: progress }}
        >
          {rightHint}
        </div>
      )}
      {dx < 0 && (
        <div
          className="absolute inset-0 rounded-2xl bg-red-500/15 border border-red-500/25 flex items-center justify-end pr-5"
          style={{ opacity: progress }}
        >
          {leftHint}
        </div>
      )}
      <div style={{ transform: `translateX(${dx}px)`, transition: settling ? 'transform 0.2s ease' : 'none' }}>
        {children}
      </div>
    </div>
  );
}
