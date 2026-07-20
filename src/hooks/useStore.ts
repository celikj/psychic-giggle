import { useState, useEffect, useCallback } from 'react';
import type { Task, Habit, Daily, Priority } from '../types';
import { localToday } from '../lib/date';
import { usePersisted } from './usePersisted';
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
  reorderByIds,
} from '../lib/storeLogic';

const EMERGENCY_PASS_MINUTES = 5;

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
  /** True once tasks/habits/dailies have loaded from disk — gate rendering on this to avoid a flash of the empty default before real data arrives. */
  const ready = tasksReady && habitsReady && dailiesReady;

  const [selectedDate, setSelectedDate] = useState(today);

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

  const todayTasks = tasks.filter(t => t.date === selectedDate);
  const completedToday = todayTasks.filter(t => t.completed).length;

  const getCompletedDates = useCallback((): Set<string> => computeCompletedDates(tasks), [tasks]);

  const addTask = useCallback((title: string, priority: Priority, isLocking: boolean) => {
    setTasks(prev => [
      ...(Array.isArray(prev) ? prev : []),
      { id: uid(), title, completed: false, date: selectedDate, priority, isLocking },
    ]);
  }, [selectedDate, setTasks]);

  const editTask = useCallback((id: string, updates: { title: string; priority: Priority; isLocking: boolean }) => {
    setTasks(prev => (Array.isArray(prev) ? prev : []).map(t => t.id === id ? { ...t, ...updates } : t));
  }, [setTasks]);

  const toggleTask = useCallback((id: string) => {
    setTasks(prev => (Array.isArray(prev) ? prev : []).map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  }, [setTasks]);

  const deleteTask = useCallback((id: string) => {
    setTasks(prev => (Array.isArray(prev) ? prev : []).filter(t => t.id !== id));
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

  const toggleHabit = useCallback((id: string) => {
    setHabits(prev => (Array.isArray(prev) ? prev : []).map(h => {
      if (h.id !== id) return h;
      const done = h.completedDates.includes(today);
      return {
        ...h,
        completedDates: done ? h.completedDates.filter(d => d !== today) : [...h.completedDates, today],
      };
    }));
  }, [today, setHabits]);

  const addHabit = useCallback((title: string, emoji: string, color: string, targetDays: number[]) => {
    setHabits(prev => [
      ...(Array.isArray(prev) ? prev : []),
      { id: uid(), title, emoji, completedDates: [], color, targetDays },
    ]);
  }, [setHabits]);

  const editHabit = useCallback((id: string, updates: { title: string; emoji: string; color: string; targetDays: number[] }) => {
    setHabits(prev => (Array.isArray(prev) ? prev : []).map(h => h.id === id ? { ...h, ...updates } : h));
  }, [setHabits]);

  const deleteHabit = useCallback((id: string) => {
    setHabits(prev => (Array.isArray(prev) ? prev : []).filter(h => h.id !== id));
  }, [setHabits]);

  const addDaily = useCallback((daily: Omit<Daily, 'id' | 'completedDates'>) => {
    setDailies(prev => [
      ...(Array.isArray(prev) ? prev : []),
      { ...daily, id: uid(), completedDates: [] },
    ]);
  }, [setDailies]);

  const toggleDaily = useCallback((id: string) => {
    setDailies(prev => (Array.isArray(prev) ? prev : []).map(d => {
      if (d.id !== id) return d;
      const done = d.completedDates.includes(today);
      return {
        ...d,
        completedDates: done ? d.completedDates.filter(x => x !== today) : [...d.completedDates, today],
      };
    }));
  }, [today, setDailies]);

  const editDaily = useCallback((id: string, updates: Omit<Daily, 'id' | 'completedDates'>) => {
    setDailies(prev => (Array.isArray(prev) ? prev : []).map(d => d.id === id ? { ...d, ...updates } : d));
  }, [setDailies]);

  const deleteDaily = useCallback((id: string) => {
    setDailies(prev => (Array.isArray(prev) ? prev : []).filter(d => d.id !== id));
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
  const emergencySecondsLeft = emergencyActive ? Math.ceil((emergencyPass!.expiresAt - nowMs) / 1000) : 0;

  const startEmergencyPass = useCallback(() => {
    if (emergencyPass?.date === today) return; // once per day, no exceptions
    setNowMs(Date.now());
    setEmergencyPass({ date: today, expiresAt: Date.now() + EMERGENCY_PASS_MINUTES * 60_000 });
  }, [emergencyPass, today, setEmergencyPass]);

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
    toggleHabit,
    addHabit,
    editHabit,
    deleteHabit,
    addDaily,
    editDaily,
    toggleDaily,
    deleteDaily,
    getDailyStreak,
    getStreak,
    getLast7Days,
  };
}

export type Store = ReturnType<typeof useStore>;
