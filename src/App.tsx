import { useState, useEffect, useMemo, useRef } from 'react';
import { useStore } from './hooks/useStore';
import { useScreenTime } from './hooks/useScreenTime';
import { useNotifications } from './hooks/useNotifications';
import { usePersisted } from './hooks/usePersisted';
import { useMonetization } from './hooks/useMonetization';
import TasksView from './components/TasksView';
import DailiesView from './components/DailiesView';
import HabitsView from './components/HabitsView';
import BlockerView from './components/BlockerView';
import SettingsView from './components/SettingsView';
import BottomNav from './components/BottomNav';
import Onboarding from './components/Onboarding';
import StarterSetup from './components/StarterSetup';
import PaywallView from './components/PaywallView';
import UndoToast from './components/UndoToast';
import { hapticSuccess } from './lib/haptics';
import { telemetry } from './lib/telemetry';
import { checkForExistingBackup, restoreBackup } from './lib/backup';
import { isFocusActive, computeActiveSchedules } from './lib/focusSessions';

type Tab = 'tasks' | 'dailies' | 'habits' | 'blocker' | 'settings';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('tasks');
  const store = useStore();
  const st = useScreenTime();
  const notif = useNotifications();
  const monetization = useMonetization();

  const [paywallReason, setPaywallReason] = useState<'daily' | 'habit' | 'locking' | null>(null);

  const [onboarded, setOnboarded, onboardedReady] = usePersisted('tl_onboarded', false);
  const [showIntro, setShowIntro] = useState(false);
  // Decide once, the moment the real value loads — never flash the intro
  // for a returning user, or skip it for a new one, based on the default.
  useEffect(() => {
    if (onboardedReady) {
      if (!onboarded) {
        checkForExistingBackup().then(backup => {
          if (backup) {
            if (window.confirm('Found an existing TaskLock backup in iCloud! Would you like to restore it?')) {
              restoreBackup(backup).then(() => {
                setOnboarded(true);
                window.location.reload();
              });
              return;
            }
          }
          setShowIntro(true);
        });
      } else {
        setShowIntro(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onboardedReady]);

  // Splash while the persisted stores hydrate, so nobody sees an empty
  // "no tasks yet" state (or the wrong onboarding decision) for a frame.
  const ready = store.ready && onboardedReady && monetization.isReady;

  // Keep the OS shield in step with the locking tasks from anywhere in the
  // app — completing the last task on the Tasks tab must unlock immediately,
  // not only once the Blocker tab is opened. An active emergency pass pauses
  // the shield; when it expires (the store ticks it down) this re-locks.
  // While a focus session is running it owns the shield (its own app list),
  // so the task/scheduled sync must not touch it. A scheduled block that's
  // currently active should keep apps blocked even once tasks are done.
  const focusActive = isFocusActive(store.focusSession);
  const scheduleActive = computeActiveSchedules(store.scheduledBlocks).length > 0;
  useEffect(() => {
    if (focusActive) return;
    st.sync((!store.allLockingDone || scheduleActive) && !store.emergencyActive);

    // Natively enforce the emergency pass timeout — at 15 min it re-locks via
    // DeviceActivity even if the app is force-quit (the timer + notification
    // are the belt-and-suspenders fallback).
    if (store.emergencyActive) {
      st.startEmergencyPass(store.emergencyPassMinutes);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.allLockingDone, store.emergencyActive, focusActive, scheduleActive, st.enabled, st.status.authorization, st.status.selectionCount, st.status.blocking]);

  // Keep native scheduled-block DeviceActivity schedules in step with the
  // user's blocks, so they engage during their window even if TaskLock is
  // never opened.
  useEffect(() => {
    st.updateScheduledBlocks(true, store.scheduledBlocks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(store.scheduledBlocks), st.status.authorization, st.status.selectionCount]);

  // Streak Insurance: Reset freezes on new month, auto-apply on day tick
  useEffect(() => {
    if (!ready || !monetization.isReady) return;
    
    const currentMonth = store.today.substring(0, 7);
    if (store.freezeMonth !== currentMonth) {
      store.resetFreezesForNewMonth(currentMonth);
    }
    
    // Auto-apply logic: if there is inventory, look at yesterday
    const isPremium = monetization.tier === 'premium';
    const inventory = Math.max(0, (isPremium ? 3 : 1) - store.freezesUsed);
    if (inventory > 0) {
      const yesterday = new Date(store.today + 'T12:00:00Z');
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = yesterday.toISOString().split('T')[0];
      
      let freezesLeft = inventory;
      
      // Check habits
      for (const h of store.habits) {
        if (freezesLeft <= 0) break;
        const done = h.completedDates.includes(yStr);
        const frozen = h.frozenDates?.includes(yStr);
        // Only freeze if they have a streak worth saving
        // A simple heuristic: if they completed it the day BEFORE yesterday, freeze it.
        const dayBefore = new Date(yesterday);
        dayBefore.setDate(dayBefore.getDate() - 1);
        const dbStr = dayBefore.toISOString().split('T')[0];
        const dbDone = h.completedDates.includes(dbStr);
        const dbFrozen = h.frozenDates?.includes(dbStr);
        
        if (!done && !frozen && (dbDone || dbFrozen)) {
          store.applyFreeze('habit', h.id, yStr);
          store.incrementFreezesUsed();
          freezesLeft--;
        }
      }
      
      // Check dailies
      for (const d of store.dailies) {
        if (freezesLeft <= 0) break;
        const due = d.targetDays.includes(yesterday.getDay());
        if (!due) continue;
        
        const done = d.completedDates.includes(yStr);
        const frozen = d.frozenDates?.includes(yStr);
        
        // Find previous due date
        const prevDue = new Date(yesterday);
        prevDue.setDate(prevDue.getDate() - 1);
        for (let i=0; i<7; i++) {
          if (d.targetDays.includes(prevDue.getDay())) break;
          prevDue.setDate(prevDue.getDate() - 1);
        }
        const pStr = prevDue.toISOString().split('T')[0];
        const pdDone = d.completedDates.includes(pStr);
        const pdFrozen = d.frozenDates?.includes(pStr);
        
        if (!done && !frozen && (pdDone || pdFrozen)) {
          store.applyFreeze('daily', d.id, yStr);
          store.incrementFreezesUsed();
          freezesLeft--;
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, store.today, store.freezeMonth]);

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

  // First-run routine builder: right after the intro closes, ask a few
  // questions and turn the answers into starter dailies. Shown once, and only
  // when there's nothing set up yet (a restored backup shouldn't see it).
  const [starterDone, setStarterDone] = usePersisted('tl_starter_done', false);
  const [showStarter, setShowStarter] = useState(false);

  const finishIntro = () => {
    telemetry.track('onboardingComplete');
    setOnboarded(true);
    setShowIntro(false);
    if (!starterDone && store.dailies.length === 0) setShowStarter(true);
  };

  // Smart landing tab: the starter flow's addDaily calls are async state
  // updates, so `store.dueDailies` isn't updated yet inside finishStarter
  // itself — a one-shot flag lets an effect make the call once those
  // dailies have actually landed in the store.
  const [justFinishedStarter, setJustFinishedStarter] = useState(false);

  const finishStarter = () => {
    setStarterDone(true);
    setShowStarter(false);
    setJustFinishedStarter(true);
  };

  useEffect(() => {
    if (!justFinishedStarter) return;
    setJustFinishedStarter(false);
    // The starter flow just filled Dailies while To-Dos is still empty —
    // land where the new routine actually is, not on an empty list.
    if (store.dueDailies.length > 0 && store.todayTasks.length === 0) {
      setActiveTab('dailies');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [justFinishedStarter]);

  if (!ready) {
    return <div className="min-h-screen max-w-md mx-auto" style={{ background: '#0a0a0f' }} />;
  }

  return (
    <div
      className="max-w-md mx-auto relative overflow-hidden animate-slide-up flex flex-col"
      style={{ background: '#0a0a0f', height: '100dvh' }}
    >
      {showIntro && <Onboarding isNativeIOS={st.isNativeIOS} onDone={finishIntro} />}
      {showStarter && !showIntro && <StarterSetup store={store} onDone={finishStarter} />}

      {celebrated && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-green-500/20 border border-green-400/40 backdrop-blur-xl rounded-3xl px-10 py-8 text-center animate-celebrate">
            <div className="text-6xl mb-3">🎉</div>
            <p className="text-white font-bold text-xl">Apps Unlocked!</p>
            <p className="text-green-300/70 text-sm mt-1">All locking tasks done</p>
          </div>
        </div>
      )}

      {paywallReason && (
        <PaywallView
          monetization={monetization}
          reason={paywallReason}
          onClose={() => setPaywallReason(null)}
        />
      )}

      {store.pendingDeletes.map((pd, index) => {
        if (index !== store.pendingDeletes.length - 1) return null;
        return (
          <UndoToast
            key={pd.item.id}
            message={`Deleted ${pd.item.title || 'item'}`}
            onUndo={() => store.undoDelete(pd.item)}
            onDismiss={() => store.commitDelete(pd.item.id)}
          />
        );
      })}

      <div className="flex-1 overflow-y-auto min-h-0">
        {activeTab === 'tasks'    && <TasksView store={store} monetization={monetization} st={st} onShowPaywall={() => setPaywallReason('locking')} onOpenBlocker={() => setActiveTab('blocker')} onOpenStats={() => setActiveTab('settings')} />}
        {activeTab === 'dailies'  && <DailiesView store={store} monetization={monetization} notif={notif} onShowPaywall={() => setPaywallReason('daily')} />}
        {activeTab === 'habits'   && <HabitsView store={store} monetization={monetization} onShowPaywall={() => setPaywallReason('habit')} />}
        {activeTab === 'blocker'  && <BlockerView store={store} st={st} />}
        {activeTab === 'settings' && <SettingsView store={store} notif={notif} monetization={monetization} onShowIntro={() => setShowIntro(true)} />}
      </div>
      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        allLockingDone={store.allLockingDone}
        lockingLeft={store.lockingLeft}
        locale={store.locale}
      />
    </div>
  );
}
