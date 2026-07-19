import { Trash2 } from 'lucide-react';

interface Props {
  /** Accessible name, e.g. `Delete "Write report"`. */
  label: string;
  onConfirm: () => void;
  /** Set when this item is currently locking apps — deleting it is the obvious cheat to unlock without finishing it, so the confirm copy calls that out. */
  warnLocking?: boolean;
}

export default function ConfirmDeleteButton({ label, onConfirm, warnLocking }: Props) {
  const handleClick = () => {
    const message = warnLocking
      ? "This is locking your apps right now — deleting it unlocks them without finishing it. Delete anyway?"
      : "Delete this? This can't be undone.";
    if (window.confirm(message)) onConfirm();
  };

  return (
    <button
      onClick={handleClick}
      aria-label={label}
      className="flex-shrink-0 p-1.5 rounded-xl hover:bg-white/10 active:bg-white/20 transition-colors"
    >
      <Trash2 className="w-4 h-4 text-white/20 hover:text-red-400 transition-colors" />
    </button>
  );
}
