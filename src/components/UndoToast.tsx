import { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';

interface Props {
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
  durationMs?: number;
}

export default function UndoToast({ message, onUndo, onDismiss, durationMs = 5000 }: Props) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const startTime = Date.now();
    let rAF: number;
    let timeoutId: number;

    const update = () => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / durationMs) * 100);
      setProgress(remaining);
      if (remaining > 0) {
        rAF = requestAnimationFrame(update);
      }
    };
    rAF = requestAnimationFrame(update);

    timeoutId = window.setTimeout(() => {
      onDismiss();
    }, durationMs);

    return () => {
      cancelAnimationFrame(rAF);
      clearTimeout(timeoutId);
    };
  }, [durationMs, onDismiss]);

  return (
    <div className="fixed bottom-24 left-4 right-4 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="bg-[#141417] border border-[#FF6B35]/30 rounded-xl p-3 flex items-center justify-between shadow-lg overflow-hidden relative">
        <div className="text-sm font-semibold text-white/90 z-10 truncate pr-4">
          {message}
        </div>
        <button
          onClick={onUndo}
          className="z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FF6B35]/15 text-[#FF6B35] font-bold text-xs active:scale-95 transition-transform"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          UNDO
        </button>
        
        {/* Progress bar at the bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
          <div 
            className="h-full bg-[#FF6B35] transition-none" 
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
