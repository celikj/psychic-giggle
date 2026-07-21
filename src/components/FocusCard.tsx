import { useState, useEffect } from 'react';
import { Square, Timer, ChevronRight, Smartphone } from 'lucide-react';
import type { Store } from '../hooks/useStore';
import type { ScreenTimeController } from '../hooks/useScreenTime';
import { isFocusActive, focusTimeRemaining } from '../lib/focusSessions';

export default function FocusCard({ store, st }: { store: Store; st: ScreenTimeController }) {
  const [now, setNow] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const active = isFocusActive(store.focusSession, now);
  const remaining = active ? focusTimeRemaining(store.focusSession, now) : 0;
  
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  const timeStr = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

  return (
    <div className="px-4 mt-6">
      <div className="rounded-2xl border border-white/[0.07] bg-[#141417] p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center flex-shrink-0">
            <Timer className="w-5 h-5 text-purple-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">Focus Session</p>
            <p className="text-xs text-white/40">Lock distractions for a set time</p>
          </div>
        </div>

        {st.isNativeIOS && st.status.authorization === 'approved' && (
          <button
            onClick={() => st.chooseApps('focus')}
            disabled={st.busy || active}
            className={`mt-4 w-full flex items-center justify-between py-3.5 px-4 rounded-xl active:scale-95 transition-transform disabled:opacity-50 bg-white/5 border border-white/10`}
          >
            <span className="flex items-center gap-2.5 min-w-0">
              <Smartphone className="w-4 h-4 flex-shrink-0 text-white/50" />
              <span className="text-sm font-semibold text-white truncate">
                Choose focus apps
              </span>
            </span>
            <span className="text-xs text-white/50 flex items-center gap-1 flex-shrink-0">
              Pick <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </button>
        )}

        {!active ? (
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[25, 50, 90].map(mins => (
              <button
                key={mins}
                onClick={async () => {
                  const s = store.startFocus(mins);
                  if (s && st.isNativeIOS) {
                    await st.startFocus(s.id, s.endsAt);
                  }
                }}
                disabled={active || (st.isNativeIOS && st.status.authorization !== 'approved')}
                className="py-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-sm font-semibold active:scale-95 transition-transform disabled:opacity-50"
              >
                {mins} min
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-4 flex flex-col items-center py-4 bg-purple-500/5 rounded-xl border border-purple-500/10">
            <p className="text-4xl font-bold tracking-tighter text-white font-mono">{timeStr}</p>
            <button
              onClick={async () => {
                const s = store.focusSession;
                if (s && st.isNativeIOS) {
                  await st.cancelFocus(s.id);
                }
                store.cancelFocus();
              }}
              className="mt-4 px-6 py-2 rounded-lg bg-red-500/15 text-red-400 text-sm font-semibold active:scale-95 flex items-center gap-2"
            >
              <Square className="w-4 h-4" /> Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
