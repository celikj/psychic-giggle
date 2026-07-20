import { Trash2 } from 'lucide-react';
import { hapticDelete } from '../lib/haptics';

interface Props {
  /** Accessible name, e.g. `Delete "Write report"`. */
  label: string;
  onConfirm: () => void;
  /** Set when this item is currently locking apps — deleting it is the obvious cheat to unlock without finishing it, so the confirm copy calls that out. */
  warnLocking?: boolean;
  /** Set when strict mode blocks deletion of this item entirely. */
  strictBlocked?: boolean;
}

/** The confirm-then-delete flow, shared by the button and swipe-to-delete. */
export function confirmDelete(warnLocking: boolean | undefined, onConfirm: () => void, strictBlocked?: boolean) {
  if (strictBlocked) {
    window.alert('Strict Mode is active — you can\'t delete a locking item until your tasks are done or midnight.');
    return;
  }
  if (warnLocking) {
    const message = "This is locking your apps right now — deleting it unlocks them without finishing it. Delete anyway?";
    if (!window.confirm(message)) return;
  }
  
  hapticDelete();
  onConfirm();
}

export default function ConfirmDeleteButton({ label, onConfirm, warnLocking, strictBlocked }: Props) {
  const handleClick = () => confirmDelete(warnLocking, onConfirm, strictBlocked);

  return (
    <button
      onClick={handleClick}
      aria-label={label}
      className={`flex-shrink-0 p-1.5 rounded-xl hover:bg-white/10 active:bg-white/20 transition-colors ${strictBlocked ? 'opacity-30 cursor-not-allowed' : ''}`}
    >
      <Trash2 className="w-4 h-4 text-white/20 hover:text-red-400 transition-colors" />
    </button>
  );
}
