import { Pencil } from 'lucide-react';

interface Props {
  /** Accessible name, e.g. `Edit "Write report"`. */
  label: string;
  onClick: () => void;
}

/** Explicit edit affordance next to delete — the tap-title-to-edit shortcut still works, this just makes it discoverable. */
export default function EditButton({ label, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="flex-shrink-0 p-1.5 rounded-xl hover:bg-white/10 active:bg-white/20 transition-colors"
    >
      <Pencil className="w-4 h-4 text-white/20 hover:text-[#FF6B35] transition-colors" />
    </button>
  );
}
