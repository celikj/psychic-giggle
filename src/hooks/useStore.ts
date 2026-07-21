import { useState, useEffect, useCallback } from 'react';
import type { Task, Habit, Daily, Priority } from '../types';
import { telemetry } from '../lib/telemetry';
import { localToday } from '../lib/date';
import { usePersisted } from './usePersisted';
import type { FocusSession, ScheduledBlock } from '../lib/focusSessions';
import { createFocusSession, computeActiveSchedules } from '../lib/focusSessions';
import {
  minutesOfDay,
  computeLockState,
  computeCompletedDates,
  computeDailyStreak,
  computeHabitStreak,
  computePendingLockDates,
  computePendingTimedLockDates,
  computeLast7Days,
  computeOverdueTasks,
  computeWeeklyStats,
  computeStrictState,
  reorderByIds,
} from '../lib/storeLogic';
import { autoBackupToDocuments } from '../lib/backup';
import { type Locale } from '../lib/i18n';

// 15 minutes is the floor DeviceActivity allows for a scheduled interval, so
// at this length the native re-lock enforces even if the app is force-quit.
const EMERGENCY_PASS_MINUTES = 15;

interface EmergencyPass {
  /** Local date the pass was used — it's one per day. */
  date: string;
  /** Epoch ms when the shield comes back. */
  expiresAt: number;
}

function uid(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function useStore() {
  const [today, setToday] = useState(localToday);
  const [nowMinutes, setNowMinutes] = useState(() => minutesOfDay(new Date()));

  // Roll "today" over at midnight and tick the clock while the app stays
  // open, re-checking on foreground. This is what re-arms the blocker for a
  // new day and triggers timed dailies at their start time.
  useEffect(() => {
    const check = () => {
      setToday(prev => {
        const now = localToday();
        return now === prev ? prev : now;
      });
      setNowMinutes(prev => {
        const now = minutesOfDay(new Date());
        return now === prev ? prev : now;
      });
    };
    const id = setInterval(check, 30_000);
    document.addEventListener('visibilitychange', check);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', check);
    };
  }, []);

  const [tasks, setTasks, tasksReady] = usePersisted<Task[]>('tl_tasks', []);
  const [habits, setHabits, habitsReady] = usePersisted<Habit[]>('tl_habits', []);
  const [dailies, setDailies, dailiesReady] = usePersisted<Daily[]>('tl_dailies', []);
  
  const [freezesUsed, setFreezesUsed, freezesReady] = usePersisted<number>('tl_freezes_used', 0);
  const [freezeMonth, setFreezeMonth] = usePersisted<string>('tl_freeze_month', today.substring(0, 7));
  
  const [focusSession, setFocusSession, focusReady] = usePersisted<FocusSession | null>('tl_focus', null);
  const [scheduledBlocks, setScheduledBlocks, blocksReady] = usePersisted<ScheduledBlock[]>('tl_schedules', []);
  const [lastBackup, setLastBackup, backupReady] = usePersisted<string | null>('tl_last_backup', null);

  /** True once tasks/habits/dailies have loaded from disk — gate rendering on this to avoid a flash of the empty default before real data arrives. */
  const ready = tasksReady && habitsReady && dailiesReady && freezesReady && focusReady && blocksReady && backupReady;

  const [strictEnabled, setStrictEnabled] = usePersisted<boolean>('tl_strict', false);

  // Activation-funnel milestone — fires once, whichever kind of locking item
  // (to-do or daily) is created first.
  const [, setFirstLockingTracked] = usePersisted('tl_track_first_locking', false);
  const trackFirstLocking = useCallback(() => {
    setFirstLockingTracked(tracked => {
      if (!tracked) telemetry.track('firstLockingItemAdded');
      return true;
    });
  }, [setFirstLockingTracked]);

  // Forced to English for v1: the TR dictionary exists but only a fraction of
  // the UI reads from it, so both the Settings toggle and device-language
  // auto-detection are disabled until the translation is complete. Re-enable
  // by restoring `getDeviceLocale()` as the default and the Settings section.
  const [locale, setLocale] = usePersisted<Locale>('tl_locale', 'en');

  interface PendingDelete {
    type: 'task' | 'habit' | 'daily';
    item: any; // Task | Habit | Daily
  }
  const [pendingDeletes, setPendingDeletes] = useState<PendingDelete[]>([]);

  const [selectedDate, setSelectedDate] = useState(today);

  // Auto-backup to Documents (iCloud)
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => {
      autoBackupToDocuments({
        version: 1,
        exportedAt: new Date().toISOString(),
        tasks,
        habits,
        dailies
      }).then(() => {
        setLastBackup(new Date().toISOString());
      });
    }, 5000); // 5s debounce
    return () => clearTimeout(t);
  }, [tasks, habits, dailies, ready, setLastBackup]);

  const isDailyDoneToday = useCallback(
    (d: Daily) => d.completedDates.includes(today),
    [today],
  );

  // "now" only needs to be precise to the minute here (nowMinutes already
  // ticks independently), so today at nowMinutes is a faithful stand-in for
  // computeLockState's reference Date.
  const referenceNow = new Date();
  referenceNow.setHours(Math.floor(nowMinutes / 60), nowMinutes % 60, 0, 0);
  const lockState = computeLockState(tasks, dailies, today, referenceNow);
  const { dueDailies, gatingDailies, nextGate, lockingLeft, allLockingDone, hasLockingToday } = lockState;

  const activeSchedules = computeActiveSchedules(scheduledBlocks, referenceNow);
  const isScheduleActive = activeSchedules.length > 0;

  const todayTasks = tasks.filter(t => t.date === selectedDate);
  const completedToday = todayTasks.filter(t => t.completed).length;

  const getCompletedDates = useCallback((): Set<string> => computeCompletedDates(tasks), [tasks]);

  const addTask = useCallback((title: string, priority: Priority, isLocking: boolean) => {
    telemetry.track('addTask', { priority, isLocking: isLocking ? 'true' : 'false' });
    if (isLocking) trackFirstLocking();
    setTasks(prev => [
      ...(Array.isArray(prev) ? prev : []),
      { id: uid(), title, completed: false, date: selectedDate, priority, isLocking },
    ]);
  }, [selectedDate, setTasks, trackFirstLocking]);

  const editTask = useCallback((id: string, updates: { title: string; priority: Priority; isLocking: boolean }) => {
    setTasks(prev => (Array.isArray(prev) ? prev : []).map(t => t.id === id ? { ...t, ...updates } : t));
  }, [setTasks]);

  const toggleTask = useCallback((id: string) => {
    setTasks(prev => (Array.isArray(prev) ? prev : []).map(t => {
      if (t.id === id) {
        if (!t.completed) telemetry.track('completeTask', { isLocking: t.isLocking ? 'true' : 'false' });
        return { ...t, completed: !t.completed };
      }
      return t;
    }));
  }, [setTasks]);

  const deleteTask = useCallback((id: string) => {
    setTasks(prev => {
      const arr = Array.isArray(prev) ? prev : [];
      const item = arr.find(t => t.id === id);
      if (item) setPendingDeletes(pd => [...pd, { type: 'task', item }]);
      return arr.filter(t => t.id !== id);
    });
  }, [setTasks]);

  const overdueTasks = computeOverdueTasks(tasks, today);

  const moveTaskToToday = useCallback((id: string) => {
    setTasks(prev => (Array.isArray(prev) ? prev : []).map(t => t.id === id ? { ...t, date: today } : t));
  }, [today, setTasks]);

  const moveAllOverdueToToday = useCallback(() => {
    setTasks(prev => (Array.isArray(prev) ? prev : []).map(
      t => !t.completed && t.date < today ? { ...t, date: today } : t,
    ));
  }, [today, setTasks]);

  /** Persist a manual order for the given ids; other tasks keep their positions. */
  const reorderTasks = useCallback((orderedIds: string[]) => {
    setTasks(prev => reorderByIds(Array.isArray(prev) ? prev : [], orderedIds));
  }, [setTasks]);

  const toggleHabit = useCallback((id: string, overrideDate?: string) => {
    const targetDate = overrideDate || today;
    setHabits(prev => (Array.isArray(prev) ? prev : []).map(h => {
      if (h.id === id) {
        const isDone = h.completedDates.includes(targetDate);
        if (!isDone) telemetry.track('checkoffHabit');
        return {
          ...h,
          completedDates: isDone
            ? h.completedDates.filter(d => d !== targetDate)
            : [...h.completedDates, targetDate],
        };
      }
      return h;
    }));
  }, [today, setHabits]);

  const addHabit = useCallback((title: string, emoji: string, color: string, targetDays: number[]) => {
    telemetry.track('addHabit');
    setHabits(prev => [
      ...(Array.isArray(prev) ? prev : []),
      { id: uid(), title, emoji, completedDates: [], color, targetDays },
    ]);
  }, [setHabits]);

  const editHabit = useCallback((id: string, updates: { title: string; emoji: string; color: string; targetDays: number[] }) => {
    setHabits(prev => (Array.isArray(prev) ? prev : []).map(h => h.id === id ? { ...h, ...updates } : h));
  }, [setHabits]);

  const deleteHabit = useCallback((id: string) => {
    setHabits(prev => {
      const arr = Array.isArray(prev) ? prev : [];
      const item = arr.find(h => h.id === id);
      if (item) setPendingDeletes(pd => [...pd, { type: 'habit', item }]);
      return arr.filter(h => h.id !== id);
    });
  }, [setHabits]);

  const addDaily = useCallback((daily: Omit<Daily, 'id' | 'completedDates'>) => {
    telemetry.track('addDaily', { isLocking: daily.isLocking ? 'true' : 'false' });
    if (daily.isLocking) trackFirstLocking();
    setDailies(prev => [
      ...(Array.isArray(prev) ? prev : []),
      { ...daily, id: uid(), completedDates: [] },
    ]);
  }, [setDailies, trackFirstLocking]);

  const toggleDaily = useCallback((id: string) => {
    setDailies(prev => (Array.isArray(prev) ? prev : []).map(d => {
      if (d.id === id) {
        const isDone = d.completedDates.includes(today);
        if (!isDone) telemetry.track('checkoffDaily', { isLocking: d.isLocking ? 'true' : 'false' });
        return {
          ...d,
          completedDates: isDone
            ? d.completedDates.filter(dt => dt !== today)
            : [...d.completedDates, today],
        };
      }
      return d;
    }));
  }, [today, setDailies]);

  const applyFreeze = useCallback((type: 'daily' | 'habit', id: string, date: string) => {
    if (type === 'daily') {
      setDailies(prev => (Array.isArray(prev) ? prev : []).map(d => {
        if (d.id === id) {
          telemetry.track('applyFreeze', { type: 'daily' });
          return { ...d, frozenDates: [...(d.frozenDates || []), date] };
        }
        return d;
      }));
    } else {
      setHabits(prev => (Array.isArray(prev) ? prev : []).map(h => {
        if (h.id === id) {
          telemetry.track('applyFreeze', { type: 'habit' });
          return { ...h, frozenDates: [...(h.frozenDates || []), date] };
        }
        return h;
      }));
    }
  }, [setDailies, setHabits]);

  const incrementFreezesUsed = useCallback(() => {
    setFreezesUsed(prev => prev + 1);
  }, [setFreezesUsed]);

  const resetFreezesForNewMonth = useCallback((newMonth: string) => {
    setFreezeMonth(newMonth);
    setFreezesUsed(0);
  }, [setFreezeMonth, setFreezesUsed]);

  const editDaily = useCallback((id: string, updates: Omit<Daily, 'id' | 'completedDates'>) => {
    setDailies(prev => (Array.isArray(prev) ? prev : []).map(d => d.id === id ? { ...d, ...updates } : d));
  }, [setDailies]);

  const deleteDaily = useCallback((id: string) => {
    setDailies(prev => {
      const arr = Array.isArray(prev) ? prev : [];
      const item = arr.find(d => d.id === id);
      if (item) setPendingDeletes(pd => [...pd, { type: 'daily', item }]);
      return arr.filter(d => d.id !== id);
    });
  }, [setDailies]);

  const getDailyStreak = useCallback((daily: Daily): number => computeDailyStreak(daily), []);

  const getPendingLockDates = useCallback(
    (): string[] => computePendingLockDates(tasks, dailies, today),
    [tasks, dailies, today],
  );

  const getPendingTimedLockDates = useCallback(
    (): Record<string, string[]> => computePendingTimedLockDates(dailies),
    [dailies],
  );

  const getStreak = useCallback((habit: Habit): number => computeHabitStreak(habit), []);

  const getLast7Days = useCallback((): string[] => computeLast7Days(), []);

  const getWeeklyStats = useCallback(
    () => computeWeeklyStats(tasks, dailies, habits),
    [tasks, dailies, habits],
  );

  // ---- Emergency pass: pause the shield for a few minutes, once per day ----
  const [emergencyPass, setEmergencyPass] = usePersisted<EmergencyPass | null>('tl_emergency_pass', null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  // Tick every second only while a pass is running, so the countdown updates
  // and `emergencyActive` flips off (re-locking apps) the moment it expires.
  useEffect(() => {
    if (!emergencyPass || emergencyPass.expiresAt <= Date.now()) return;
    setNowMs(Date.now());
    const id = setInterval(() => {
      setNowMs(Date.now());
      if (Date.now() >= emergencyPass.expiresAt) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [emergencyPass]);

  const emergencyActive = !!emergencyPass && emergencyPass.expiresAt > nowMs;
  const emergencyUsedToday = emergencyPass?.date === today;

  // Strict Mode — blocks bypass actions while locking items are pending.
  // Must be after emergencyPass so we know whether the pass was used today.
  const strictState = computeStrictState(strictEnabled, lockState, emergencyUsedToday);
  const emergencySecondsLeft = emergencyActive ? Math.ceil((emergencyPass!.expiresAt - nowMs) / 1000) : 0;

  const startEmergencyPass = useCallback(() => {
    if (emergencyPass?.date === today) return; // once per day, no exceptions
    setNowMs(Date.now());
    setEmergencyPass({ date: today, expiresAt: Date.now() + EMERGENCY_PASS_MINUTES * 60_000 });
  }, [emergencyPass, today, setEmergencyPass]);

  const startFocus = useCallback((durationMins: number) => {
    const session = createFocusSession(durationMins);
    setFocusSession(session);
    return session;
  }, [setFocusSession]);

  const cancelFocus = useCallback(() => {
    setFocusSession(prev => prev ? { ...prev, completed: true } : null);
  }, [setFocusSession]);

  const addSchedule = useCallback((block: ScheduledBlock) => {
    setScheduledBlocks(prev => [...prev, block]);
  }, [setScheduledBlocks]);

  const editSchedule = useCallback((id: string, updates: Partial<ScheduledBlock>) => {
    setScheduledBlocks(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, [setScheduledBlocks]);

  const deleteSchedule = useCallback((id: string) => {
    setScheduledBlocks(prev => prev.filter(s => s.id !== id));
  }, [setScheduledBlocks]);

  const toggleSchedule = useCallback((id: string) => {
    setScheduledBlocks(prev => prev.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s));
  }, [setScheduledBlocks]);

  return {
    ready,
    tasks,
    habits,
    dailies,
    dueDailies,
    gatingDailies,
    nextGate,
    isDailyDoneToday,
    selectedDate,
    setSelectedDate,
    today,
    allLockingDone,
    lockingLeft,
    hasLockingToday,
    todayTasks,
    completedToday,
    getCompletedDates,
    getPendingLockDates,
    getPendingTimedLockDates,
    addTask,
    editTask,
    toggleTask,
    deleteTask,
    overdueTasks,
    moveTaskToToday,
    moveAllOverdueToToday,
    reorderTasks,
    getWeeklyStats,
    emergencyActive,
    emergencyUsedToday,
    emergencySecondsLeft,
    startEmergencyPass,
    emergencyPassMinutes: EMERGENCY_PASS_MINUTES,
    emergencyPassExpiresAt: emergencyActive ? emergencyPass!.expiresAt : null,
    strictEnabled,
    setStrictEnabled,
    strictState,
    toggleHabit,
    addHabit,
    editHabit,
    deleteHabit,
    applyFreeze,
    freezesUsed,
    incrementFreezesUsed,
    freezeMonth,
    resetFreezesForNewMonth,
    addDaily,
    editDaily,
    toggleDaily,
    deleteDaily,
    getDailyStreak,
    getStreak,
    getLast7Days,
    focusSession,
    startFocus,
    cancelFocus,
    scheduledBlocks,
    isScheduleActive,
    addSchedule,
    editSchedule,
    deleteSchedule,
    toggleSchedule,
    lastBackup,
    locale,
    setLocale,
    pendingDeletes,
    undoDelete: useCallback((item: any) => {
      if (item.date && !item.targetDays) {
        setTasks(prev => [...prev, item as Task]);
      } else if (item.targetDays && typeof item.isLocking === 'boolean') {
        setDailies(prev => [...prev, item as Daily]);
      } else {
        setHabits(prev => [...prev, item as Habit]);
      }
      setPendingDeletes(pd => pd.filter(p => p.item.id !== item.id));
    }, [setTasks, setDailies, setHabits]),
    commitDelete: useCallback((id: string) => {
      setPendingDeletes(pd => pd.filter(p => p.item.id !== id));
    }, []),
  };
}

export type Store = ReturnType<typeof useStore>;
