import { useState, useEffect, useMemo, useRef } from 'react';
import { useStore } from './hooks/useStore';
import { useScreenTime } from './hooks/useScreenTime';
import TasksView from './components/TasksView';
import DailiesView from './components/DailiesView';
import HabitsView from './components/HabitsView';
import BlockerView from './components/BlockerView';
import BottomNav from './components/BottomNav';
import Onboarding, { ONBOARDED_KEY } from './components/Onboarding';

type Tab = 'tasks' | 'dailies' | 'habits' | 'blocker';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('tasks');
  const store = useStore();
  const st = useScreenTime();

  const [showIntro, setShowIntro] = useState(() => {
    try {
      return localStorage.getItem(ONBOARDED_KEY) !== '1';
    } catch {
      return false;
    }
  });

  // Keep the OS shield in step with the locking tasks from anywhere in the
  // app — completing the last task on the Tasks tab must unlock immediately,
  // not only once the Blocker tab is opened.
  useEffect(() => {
    st.sync(!store.allLockingDone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.allLockingDone, st.enabled, st.status.authorization, st.status.selectionCount, st.status.blocking]);

  // Tell the native layer which days (today or later) still have incomplete
  // locking to-dos or all-day locking dailies, so the midnight DeviceActivity
  // schedule can re-lock apps for a new day even if TaskLock is never opened.
  const pendingLockDates = useMemo(
    () => store.getPendingLockDates(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store.tasks, store.dailies, store.today],
  );
  useEffect(() => {
    st.updateSchedule(pendingLockDates);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingLockDates.join(','), st.enabled, st.status.authorization, st.status.selectionCount]);

  // Unlock celebration, shown wherever the last locking item is completed.
  const [celebrated, setCelebrated] = useState(false);
  const prevDone = useRef(store.allLockingDone);
  const hadLocking = store.hasLockingToday;
  useEffect(() => {
    if (!prevDone.current && store.allLockingDone && hadLocking) {
      setCelebrated(true);
      const id = setTimeout(() => setCelebrated(false), 3000);
      prevDone.current = store.allLockingDone;
      return () => clearTimeout(id);
    }
    prevDone.current = store.allLockingDone;
  }, [store.allLockingDone, hadLocking]);

  const finishIntro = () => {
    try {
      localStorage.setItem(ONBOARDED_KEY, '1');
    } catch {
      /* private mode — just close it for this session */
    }
    setShowIntro(false);
  };

  return (
    <div className="min-h-screen max-w-md mx-auto relative overflow-hidden" style={{ background: '#0a0a0f' }}>
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

      <div className="overflow-y-auto" style={{ minHeight: '100vh' }}>
        {activeTab === 'tasks'   && <TasksView store={store} onShowIntro={() => setShowIntro(true)} />}
        {activeTab === 'dailies' && <DailiesView store={store} />}
        {activeTab === 'habits'  && <HabitsView store={store} />}
        {activeTab === 'blocker' && <BlockerView store={store} st={st} />}
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
