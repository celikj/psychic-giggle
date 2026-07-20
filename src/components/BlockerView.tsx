import { Lock, Unlock, Shield, ShieldCheck, ShieldAlert, ChevronRight, Loader2, Smartphone, CheckCircle2, Circle, Clock, LifeBuoy } from 'lucide-react';
import type { Store } from '../hooks/useStore';
import type { ScreenTimeController } from '../hooks/useScreenTime';
import { hapticWarning } from '../lib/haptics';
import FocusCard from './FocusCard';
import ScheduledBlocksCard from './ScheduledBlocksCard';

interface Props {
  store: Store;
  /** Shared controller owned by App, so the shield syncs from every tab. */
  st: ScreenTimeController;
}

export default function BlockerView({ store, st }: Props) {
  const { allLockingDone, lockingLeft } = store;

  // Always today's items — the lock state ignores the calendar's selected date.
  const todaysAll = store.tasks.filter(t => t.date === store.today);
  const completedToday = todaysAll.filter(t => t.completed).length;
  const lockingTasks = todaysAll.filter(t => t.isLocking);
  const lockingDailies = store.dueDailies.filter(d => d.isLocking);

  // One merged list of everything that gates apps today.
  const lockingItems = [
    ...lockingTasks.map(t => ({ id: `t-${t.id}`, title: t.title, done: t.completed, time: undefined as string | undefined })),
    ...lockingDailies.map(d => ({ id: `d-${d.id}`, title: d.title, done: store.isDailyDoneToday(d), time: d.time })),
  ];
  const lockingDone = lockingItems.filter(i => i.done).length;
  const lockingPct = lockingItems.length === 0 ? 100 : Math.round((lockingDone / lockingItems.length) * 100);

  const formatGateTime = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const approved = st.status.authorization === 'approved';
  const hasSelection = st.status.selectionCount > 0;

  return (
    <div className="flex flex-col pb-24">
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
              {!allLockingDone
                ? `Finish ${lockingLeft} item${lockingLeft !== 1 ? 's' : ''} to unlock`
                : store.nextGate
                  ? `Apps lock again at ${formatGateTime(store.nextGate.time!)} — ${store.nextGate.title}`
                  : lockingItems.length > 0
                    ? 'Great job! Your apps are open.'
                    : 'No locking items today — add a locking to-do or daily'}
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
              <span>{completedToday} / {todaysAll.length} to-dos done today</span>
              <span>{lockingDone} / {lockingItems.length} locking</span>
            </div>
          </div>
        )}

        {/* Emergency pass — a strict blocker with zero escape hatch just gets
            deleted the first time someone urgently needs a blocked app. */}
        {!allLockingDone && (
          store.emergencyActive ? (
            <div className="mt-4 flex items-center gap-2.5 rounded-xl px-3.5 py-3 bg-amber-500/10 border border-amber-500/25">
              <LifeBuoy className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <div className="flex-1 text-xs font-semibold text-amber-300">
                Emergency pass active — apps lock again in{' '}
                {Math.floor(store.emergencySecondsLeft / 60)}:{String(store.emergencySecondsLeft % 60).padStart(2, '0')}
              </div>
            </div>
          ) : store.emergencyUsedToday ? (
            <p className="mt-4 text-[11px] text-white/25 px-1">
              <LifeBuoy className="w-3 h-3 inline mr-1 align-[-1px]" />
              Emergency pass used today — back tomorrow.
            </p>
          ) : (
            <button
              onClick={() => {
                if (window.confirm(`Unlock your apps for ${store.emergencyPassMinutes} minutes? You get one emergency pass per day.`)) {
                  hapticWarning();
                  store.startEmergencyPass();
                }
              }}
              className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/50 text-xs font-semibold active:scale-95 transition-transform"
            >
              <LifeBuoy className="w-3.5 h-3.5" />
              Emergency pass — {store.emergencyPassMinutes} min, once a day
            </button>
          )
        )}
      </div>

      {/* Strict Mode toggle */}
      <div className="px-4 mb-4">
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                store.strictEnabled
                  ? store.strictState.isActive
                    ? 'bg-red-500/15 border border-red-500/25'
                    : 'bg-amber-500/10 border border-amber-500/20'
                  : 'bg-white/5 border border-white/10'
              }`}>
                <ShieldAlert className={`w-4 h-4 ${
                  store.strictEnabled
                    ? store.strictState.isActive ? 'text-red-400' : 'text-amber-400'
                    : 'text-white/30'
                }`} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white">Strict Mode</p>
                <p className="text-xs text-white/40">
                  {store.strictState.isActive
                    ? 'Active — controls locked until tasks done'
                    : store.strictEnabled
                      ? 'Armed — activates when locking items are pending'
                      : 'Prevents disabling the blocker or deleting locking tasks'}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                if (!store.strictEnabled) {
                  if (window.confirm(
                    '⚠️ Strict Mode\n\nWhile locking items are pending, you won\'t be able to:\n\n• Turn off the app blocker\n• Delete locking tasks\n• Remove the locking flag from items\n\nThis resets at midnight. Enable Strict Mode?'
                  )) {
                    store.setStrictEnabled(true);
                  }
                } else {
                  if (store.strictState.isActive) {
                    window.alert(store.strictState.reason);
                  } else {
                    store.setStrictEnabled(false);
                  }
                }
              }}
              className={`relative w-12 h-7 rounded-full transition-colors flex-shrink-0 ${
                store.strictEnabled ? 'bg-red-500' : 'bg-white/15'
              }`}
              aria-label="Toggle strict mode"
            >
              <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${
                store.strictEnabled ? 'left-6' : 'left-1'
              }`} />
            </button>
          </div>
          {store.strictState.isActive && (
            <div className="mt-3 flex items-center gap-2 rounded-xl px-3 py-2 bg-red-500/10 border border-red-500/20">
              <ShieldAlert className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
              <span className="text-[11px] font-semibold text-red-400">
                Blocker controls are locked until all locking items are done
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Today's locking items */}
      {lockingItems.length > 0 && (
        <div className="px-4 mb-4">
          <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-2 px-1">
            Locking items today
          </p>
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] divide-y divide-white/5">
            {lockingItems.map(item => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                {item.done
                  ? <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                  : <Circle className="w-4 h-4 text-red-400/60 flex-shrink-0" />}
                <span className={`flex-1 text-sm font-medium truncate ${item.done ? 'text-white/30 line-through' : 'text-white/80'}`}>
                  {item.title}
                </span>
                {item.time && !item.done && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-sky-300/80 bg-sky-500/10 border border-sky-500/20 px-1.5 py-0.5 rounded-lg flex-shrink-0">
                    <Clock className="w-3 h-3" /> {formatGateTime(item.time)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

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

            {/* Step 1 — permission */}
            {!approved && (
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
            {approved && (
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
                        onClick={() => {
                          if (store.strictState.isActive && !store.strictState.canToggleBlocker) {
                            window.alert(store.strictState.reason);
                            return;
                          }
                          st.setEnabled(!st.enabled);
                        }}
                        disabled={store.strictState.isActive && !store.strictState.canToggleBlocker}
                        className={`relative w-12 h-7 rounded-full transition-colors flex-shrink-0 ${st.enabled ? 'bg-[#FF6B35]' : 'bg-white/15'} ${store.strictState.isActive && !store.strictState.canToggleBlocker ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                          ? <><Lock className="w-3.5 h-3.5" /> Locked — finish {lockingLeft} item{lockingLeft !== 1 ? 's' : ''} to unlock</>
                          : <><ShieldCheck className="w-3.5 h-3.5" /> Unlocked</>}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          <p className="text-center text-[11px] text-white/25 mt-4 px-6 leading-relaxed">
            Mark a to-do or daily as <span className="text-white/50 font-medium">Locking</span>, and your chosen apps stay blocked until it's done. Timed dailies lock from their start time.
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

      {/* Focus Sessions & Scheduled Blocks */}
      <FocusCard store={store} st={st} />
      <ScheduledBlocksCard store={store} st={st} />
    </div>
  );
}
