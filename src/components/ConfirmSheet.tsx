import type { ReactNode } from 'react';

interface Props {
  icon: ReactNode;
  /** Hex accent color, tinted for the icon badge and used solid on the confirm button. */
  accent: string;
  title: string;
  body: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** In-app bottom sheet standing in for window.confirm(), for the moments that need to feel native rather than a browser dialog. */
export default function ConfirmSheet({ icon, accent, title, body, confirmLabel, cancelLabel = 'Cancel', onConfirm, onCancel }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 animate-slide-up" onClick={onCancel}>
      <div
        className="w-full max-w-md bg-[#141417] rounded-t-3xl p-6 border-t border-white/10"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 24px)' }}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center mb-4"
          style={{ backgroundColor: accent + '26', border: `1px solid ${accent}40` }}
        >
          {icon}
        </div>
        <h2 className="text-lg font-bold text-white mb-1.5">{title}</h2>
        <div className="text-sm text-white/50 leading-relaxed mb-6">{body}</div>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl bg-white/5 text-white/50 text-sm font-semibold"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 rounded-xl text-white text-sm font-semibold active:scale-95 transition-transform"
            style={{ backgroundColor: accent }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
