import { useState, useEffect, useRef } from 'react';
import { Lock, Unlock, Shield, ShieldCheck, ChevronRight, Loader2, Smartphone } from 'lucide-react';
import type { Store } from '../hooks/useStore';
import { useScreenTime } from '../hooks/useScreenTime';

interface Props { store: Store }

export default function BlockerView({ store }: Props) {
  const { allLockingDone, lockingLeft, todayTasks, completedToday } = store;

  const st = useScreenTime();
  // Keep the OS shield in step with whether locking tasks remain.
  useEffect(() => {
    st.sync(!allLockingDone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allLockingDone, st.enabled, st.status.authorization, st.status.selectionCount, st.status.blocking]);

  const [celebrated, setCelebrated] = useState(false);
  const prevDone = useRef(allLockingDone);

  useEffect(() => {
    if (!prevDone.current && allLockingDone) {
      setCelebrated(true);
      setTimeout(() => setCelebrated(false), 3000);
    }
    prevDone.current = allLockingDone;
  }, [allLockingDone]);

  const lockingTasks = todayTasks.filter(t => t.isLocking);
  const lockingDone = lockingTasks.filter(t => t.completed).length;
  const lockingPct = lockingTasks.length === 0 ? 100 : Math.round((lockingDone / lockingTasks.length) * 100);

  const approved = st.status.authorization === 'approved';
  const hasSelection = st.status.selectionCount > 0;

  return (
    <div className="flex flex-col pb-24">
      {/* Celebration overlay */}
      {celebrated && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-green-500/20 border border-green-400/40 backdrop-blur-xl rounded-3xl px-10 py-8 text-center animate-celebrate">
            <div className="text-6xl mb-3">🎉</div>
            <p className="text-white font-bold text-xl">Apps Unlocked!</p>
            <p className="text-green-300/70 text-sm mt-1">All locking tasks done</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="px-5 pt-14 pb-6">
        <div className="flex items-center gap-3 mb-2">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
              allLockingDone
                ? 'bg-green-500/15 border border-green-500/30 pulse-green'
                : 'bg-red-500/15 border border-red-500/30 pulse-red'
            }`}
          >
            {allLockingDone
              ? <Unlock className="w-6 h-6 text-green-400" />
              : <Lock className="w-6 h-6 text-red-400" />}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">
              {allLockingDone ? 'Apps Unlocked' : 'Apps Locked'}
            </h1>
            <p className="text-sm text-white/40">
              {allLockingDone
                ? 'Great job! Your apps are open.'
                : `Finish ${lockingLeft} task${lockingLeft !== 1 ? 's' : ''} to unlock`}
            </p>
          </div>
        </div>

        {!allLockingDone && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-white/30 mb-2">
              <span>Progress toward unlock</span>
              <span>{lockingPct}%</span>
            </div>
            <div className="h-2 bg-white/8 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${lockingPct}%`,
                  background: lockingPct === 100 ? '#34D399' : 'linear-gradient(90deg, #FF6B35, #FBBF24)',
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-white/20 mt-1.5">
              <span>{completedToday} / {todayTasks.length} tasks done today</span>
              <span>{lockingDone} / {lockingTasks.length} locking</span>
            </div>
          </div>
        )}
      </div>

      {/* ---- Native Screen Time blocker (iOS only) ---- */}
      {st.isNativeIOS && (
        <div className="px-4">
          <div className="rounded-2xl border border-white/[0.07] bg-[#141417] p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FF6B35]/15 border border-[#FF6B35]/25 flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-[#FF6B35]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">App Blocker</p>
                <p className="text-xs text-white/40">Blocks real apps with Apple Screen Time</p>
              </div>
              {st.busy && <Loader2 className="w-4 h-4 text-white/40 animate-spin" />}
            </div>

            {/* Not supported */}
            {!st.status.supported && (
              <p className="mt-4 text-xs text-white/40 leading-relaxed">
                App blocking needs iOS&nbsp;16 or later. Update your iPhone to use it.
              </p>
            )}

            {/* Step 1 — permission */}
            {st.status.supported && !approved && (
              <>
                <p className="mt-4 text-xs text-white/40 leading-relaxed">
                  Grant Screen Time access, then pick the apps you want locked while tasks are pending.
                </p>
                <button
                  onClick={st.requestPermission}
                  disabled={st.busy}
                  className="mt-3 w-full py-3 rounded-xl bg-[#FF6B35] text-white text-sm font-semibold active:scale-95 transition-transform disabled:opacity-50"
                >
                  {st.status.authorization === 'denied'
                    ? 'Denied — enable in Settings › Screen Time'
                    : 'Grant Screen Time access'}
                </button>
              </>
            )}

            {/* Step 2 — pick apps via Apple's system picker */}
            {st.status.supported && approved && (
              <div className="mt-4 space-y-3">
                <button
                  onClick={st.chooseApps}
                  disabled={st.busy}
                  className={`w-full flex items-center justify-between py-3.5 px-4 rounded-xl active:scale-95 transition-transform disabled:opacity-50 ${
                    hasSelection ? 'bg-white/5 border border-white/10' : 'bg-[#FF6B35]'
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <Smartphone className={`w-4 h-4 flex-shrink-0 ${hasSelection ? 'text-white/50' : 'text-white'}`} />
                    <span className="text-sm font-semibold text-white truncate">
                      {hasSelection
                        ? `${st.status.selectionCount} app${st.status.selectionCount !== 1 ? 's' : ''} & categories selected`
                        : 'Choose apps to block'}
                    </span>
                  </span>
                  <span className="text-xs text-white/50 flex items-center gap-1 flex-shrink-0">
                    {hasSelection ? 'Change' : 'Pick'} <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </button>

                {hasSelection && (
                  <>
                    <div className="flex items-center justify-between py-1">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white">Lock until tasks done</p>
                        <p className="text-xs text-white/40">
                          {!st.enabled
                            ? 'Off'
                            : st.status.blocking
                              ? 'Selected apps are locked right now'
                              : 'Unlocked — all tasks done'}
                        </p>
                      </div>
                      <button
                        onClick={() => st.setEnabled(!st.enabled)}
                        className={`relative w-12 h-7 rounded-full transition-colors flex-shrink-0 ${st.enabled ? 'bg-[#FF6B35]' : 'bg-white/15'}`}
                        aria-label="Toggle app blocking"
                      >
                        <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${st.enabled ? 'left-6' : 'left-1'}`} />
                      </button>
                    </div>

                    {st.enabled && (
                      <div className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold border ${
                        st.status.blocking
                          ? 'bg-red-500/10 border-red-500/20 text-red-400'
                          : 'bg-green-500/10 border-green-500/20 text-green-400'
                      }`}>
                        {st.status.blocking
                          ? <><Lock className="w-3.5 h-3.5" /> Locked — finish {lockingLeft} task{lockingLeft !== 1 ? 's' : ''} to unlock</>
                          : <><ShieldCheck className="w-3.5 h-3.5" /> Unlocked</>}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          <p className="text-center text-[11px] text-white/25 mt-4 px-6 leading-relaxed">
            Mark a task as a <span className="text-white/50 font-medium">Locking Task</span> on the Tasks screen, and your chosen apps stay blocked until it's done.
          </p>
        </div>
      )}

      {/* ---- Web / non-iOS ---- */}
      {!st.isNativeIOS && (
        <div className="px-4">
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-center">
            <div className="text-4xl mb-3">📱</div>
            <p className="text-white/70 text-sm font-semibold">Real app blocking runs on iPhone</p>
            <p className="text-white/35 text-xs mt-2 leading-relaxed">
              In the iOS app you pick apps with Apple's own Screen Time picker, and they're blocked system-wide until your locking tasks are done.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
