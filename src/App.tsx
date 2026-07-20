import { useState, useEffect, useMemo, useRef } from 'react';
import { useStore } from './hooks/useStore';
import { useScreenTime } from './hooks/useScreenTime';
import { useNotifications } from './hooks/useNotifications';
import { usePersisted } from './hooks/usePersisted';
import TasksView from './components/TasksView';
import DailiesView from './components/DailiesView';
import HabitsView from './components/HabitsView';
import BlockerView from './components/BlockerView';
import SettingsView from './components/SettingsView';
import BottomNav from './components/BottomNav';
import Onboarding from './components/Onboarding';
import { hapticSuccess } from './lib/haptics';

type Tab = 'tasks' | 'dailies' | 'habits' | 'blocker' | 'settings';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('tasks');
  const store = useStore();
  const st = useScreenTime();
  const notif = useNotifications();

  const [onboarded, setOnboarded, onboardedReady] = usePersisted('tl_onboarded', false);
  const [showIntro, setShowIntro] = useState(false);
  // Decide once, the moment the real value loads — never flash the intro
  // for a returning user, or skip it for a new one, based on the default.
  useEffect(() => {
    if (onboardedReady) setShowIntro(!onboarded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onboardedReady]);

  // Splash while the persisted stores hydrate, so nobody sees an empty
  // "no tasks yet" state (or the wrong onboarding decision) for a frame.
  const ready = store.ready && onboardedReady;

  // Keep the OS shield in step with the locking tasks from anywhere in the
  // app — completing the last task on the Tasks tab must unlock immediately,
  // not only once the Blocker tab is opened. An active emergency pass pauses
  // the shield; when it expires (the store ticks it down) this re-locks.
  useEffect(() => {
    st.sync(!store.allLockingDone && !store.emergencyActive);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.allLockingDone, store.emergencyActive, st.enabled, st.status.authorization, st.status.selectionCount, st.status.blocking]);

  // Tell the native layer which days (today or later) still have incomplete
  // locking to-dos or all-day locking dailies, so the midnight DeviceActivity
  // schedule can re-lock apps for a new day even if TaskLock is never opened.
  // Timed locking dailies get their own per-time schedule alongside it, so
  // e.g. a 9 PM lock still engages on time even if the app is never opened.
  const pendingLockDates = useMemo(
    () => store.getPendingLockDates(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store.tasks, store.dailies, store.today],
  );
  const pendingTimedLockDates = useMemo(
    () => store.getPendingTimedLockDates(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store.dailies, store.today],
  );
  useEffect(() => {
    st.updateSchedule(pendingLockDates, pendingTimedLockDates);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingLockDates.join(','), JSON.stringify(pendingTimedLockDates), st.enabled, st.status.authorization, st.status.selectionCount]);

  // Keep the home screen widget's snapshot of today's lock state fresh.
  useEffect(() => {
    st.updateWidgetState({
      date: store.today,
      lockingLeft: store.lockingLeft,
      allLockingDone: store.allLockingDone,
      hasLockingToday: store.hasLockingToday,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.today, store.lockingLeft, store.allLockingDone, store.hasLockingToday]);

  // Reminders: a heads-up before each timed locking daily starts gating, a
  // one-shot nudge tonight if something is still locking apps by evening, and
  // an "apps locked again" note when an emergency pass runs out.
  useEffect(() => {
    notif.resync(store.dailies, !store.allLockingDone, store.emergencyPassExpiresAt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.dailies, store.allLockingDone, store.emergencyPassExpiresAt, notif.enabled, notif.permission]);

  // Unlock celebration, shown wherever the last locking item is completed.
  const [celebrated, setCelebrated] = useState(false);
  const prevDone = useRef(store.allLockingDone);
  const hadLocking = store.hasLockingToday;
  useEffect(() => {
    if (!prevDone.current && store.allLockingDone && hadLocking) {
      hapticSuccess();
      setCelebrated(true);
      const id = setTimeout(() => setCelebrated(false), 3000);
      prevDone.current = store.allLockingDone;
      return () => clearTimeout(id);
    }
    prevDone.current = store.allLockingDone;
  }, [store.allLockingDone, hadLocking]);

  const finishIntro = () => {
    setOnboarded(true);
    setShowIntro(false);
  };

  if (!ready) {
    return <div className="min-h-screen max-w-md mx-auto" style={{ background: '#0a0a0f' }} />;
  }

  return (
    <div
      className="max-w-md mx-auto relative overflow-hidden animate-slide-up flex flex-col"
      style={{ background: '#0a0a0f', height: '100dvh' }}
    >
      {showIntro && <Onboarding isNativeIOS={st.isNativeIOS} onDone={finishIntro} />}

      {celebrated && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-green-500/20 border border-green-400/40 backdrop-blur-xl rounded-3xl px-10 py-8 text-center animate-celebrate">
            <div className="text-6xl mb-3">🎉</div>
            <p className="text-white font-bold text-xl">Apps Unlocked!</p>
            <p className="text-green-300/70 text-sm mt-1">All locking tasks done</p>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto min-h-0">
        {activeTab === 'tasks'    && <TasksView store={store} />}
        {activeTab === 'dailies'  && <DailiesView store={store} />}
        {activeTab === 'habits'   && <HabitsView store={store} />}
        {activeTab === 'blocker'  && <BlockerView store={store} st={st} />}
        {activeTab === 'settings' && <SettingsView store={store} notif={notif} onShowIntro={() => setShowIntro(true)} />}
      </div>
      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        allLockingDone={store.allLockingDone}
        lockingLeft={store.lockingLeft}
      />
    </div>
  );
}
