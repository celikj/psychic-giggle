import { useState } from 'react';
import { Check, Lock, Sparkles } from 'lucide-react';
import type { Store } from '../hooks/useStore';
import { STARTER_QUESTIONS } from '../lib/templates';
import { hapticTick, hapticSuccess } from '../lib/haptics';

interface Props {
  store: Store;
  onDone: () => void;
}

function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

/**
 * First-run routine builder, shown once right after the intro. Asks a handful
 * of yes/no questions about common routines — tap to say yes, tweak the time
 * inline — and adds the selected ones as dailies in a single step.
 */
export default function StarterSetup({ store, onDone }: Props) {
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(STARTER_QUESTIONS.flatMap((q, i) => (q.preselected ? [i] : []))),
  );
  const [times, setTimes] = useState<string[]>(() => STARTER_QUESTIONS.map(q => q.time));

  const toggle = (i: number) => {
    hapticTick();
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  const handleAdd = () => {
    STARTER_QUESTIONS.forEach((q, i) => {
      if (!selected.has(i)) return;
      store.addDaily({
        title: q.title,
        emoji: q.emoji,
        targetDays: q.targetDays,
        time: times[i],
        isLocking: q.isLocking,
      });
    });
    hapticSuccess();
    onDone();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ background: '#0a0a0f' }}>
      <div className="w-full max-w-md h-full flex flex-col" style={{ paddingTop: 'max(env(safe-area-inset-top), 24px)' }}>
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-[#FF6B35]" />
            <h2 className="text-2xl font-bold text-white">Build your routine</h2>
          </div>
          <p className="text-white/40 text-sm leading-relaxed">
            A few quick questions — tap the ones that sound like you, tweak the
            times, and they become your dailies. You can change everything later.
          </p>
        </div>

        {/* Questions */}
        <div className="flex-1 overflow-y-auto px-4 space-y-2 pb-4">
          {STARTER_QUESTIONS.map((q, i) => {
            const on = selected.has(i);
            return (
              <button
                key={q.title}
                onClick={() => toggle(i)}
                aria-label={q.question}
                aria-pressed={on}
                className={`w-full flex items-center gap-3 rounded-2xl p-3.5 text-left border transition-all duration-200 animate-slide-in ${
                  on ? 'bg-[#FF6B35]/10 border-[#FF6B35]/40' : 'bg-[#141417] border-white/[0.07]'
                }`}
                style={{ animationDelay: `${i * 40}ms` }}
              >
                {/* Yes-checkbox */}
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 border transition-colors ${
                  on ? 'bg-[#FF6B35] border-[#FF6B35]' : 'bg-white/5 border-white/15'
                }`}>
                  {on && <Check className="w-4 h-4 text-white" />}
                </div>

                <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-lg flex-shrink-0">
                  {q.emoji}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white leading-snug">{q.question}</p>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span className="text-[10px] font-medium text-white/35">{q.schedule}</span>
                    {q.isLocking && (
                      <span className="flex items-center gap-0.5 text-[10px] font-semibold text-red-400 bg-red-500/15 border border-red-500/25 px-1.5 py-0.5 rounded-md">
                        <Lock className="w-2.5 h-2.5" /> Locks apps from {formatTime(times[i])}
                      </span>
                    )}
                  </div>
                </div>

                {/* Time, editable without toggling the row */}
                <input
                  type="time"
                  value={times[i]}
                  aria-label={`Time for ${q.title}`}
                  onClick={e => e.stopPropagation()}
                  onChange={e => {
                    const v = e.target.value;
                    if (v) setTimes(prev => prev.map((t, j) => (j === i ? v : t)));
                  }}
                  className={`flex-shrink-0 bg-white/5 border rounded-lg px-2 py-1.5 text-white outline-none transition-colors ${
                    on ? 'border-[#FF6B35]/30' : 'border-white/10'
                  }`}
                  style={{ colorScheme: 'dark' }}
                />
              </button>
            );
          })}
        </div>

        {/* Actions */}
        <div className="px-4" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 24px)' }}>
          <button
            onClick={handleAdd}
            disabled={selected.size === 0}
            className="w-full py-4 rounded-2xl bg-[#FF6B35] text-white font-semibold text-sm active:scale-95 transition-transform disabled:opacity-30"
            style={{ boxShadow: '0 8px 24px rgba(255,107,53,0.35)' }}
          >
            {selected.size === 0
              ? 'Pick at least one'
              : `Add ${selected.size} dail${selected.size === 1 ? 'y' : 'ies'}`}
          </button>
          <button
            onClick={onDone}
            className="w-full py-3 mt-1 text-white/35 text-sm font-medium hover:text-white/60"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}
