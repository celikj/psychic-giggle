import { useState, useEffect, useCallback } from 'react';
import type { Task, Habit, Daily, Priority } from '../types';
import { toLocalDateStr, localToday } from '../lib/date';

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minutesNow(): number {
  const n = new Date();
  return n.getHours() * 60 + n.getMinutes();
}

function uid(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function useLocalStorage<T>(key: string, initialValue: T): [T, (v: T | ((p: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item === null) return initialValue;
      const parsed = JSON.parse(item) as T;
      // Guard against corrupted storage: an array slot must hold an array.
      if (Array.isArray(initialValue) && !Array.isArray(parsed)) return initialValue;
      return parsed;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage full or unavailable — app still works in memory */
    }
  }, [key, value]);

  return [value, setValue];
}

export function useStore() {
  const [today, setToday] = useState(localToday);
  const [nowMinutes, setNowMinutes] = useState(minutesNow);

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
        const now = minutesNow();
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

  const [tasks, setTasks] = useLocalStorage<Task[]>('tl_tasks', []);
  const [habits, setHabits] = useLocalStorage<Habit[]>('tl_habits', []);
  const [dailies, setDailies] = useLocalStorage<Daily[]>('tl_dailies', []);

  const [selectedDate, setSelectedDate] = useState(today);

  const todayWeekday = new Date(today + 'T00:00:00').getDay();
  const dueDailies = dailies.filter(d => d.targetDays.includes(todayWeekday));
  const isDailyDoneToday = useCallback(
    (d: Daily) => d.completedDates.includes(today),
    [today],
  );

  // A locking daily "gates" (blocks apps) once it's due: immediately for
  // all-day dailies, from its start time for timed ones — until checked off.
  const gatingDailies = dueDailies.filter(
    d => d.isLocking && !d.completedDates.includes(today) && (!d.time || nowMinutes >= timeToMinutes(d.time)),
  );
  const upcomingGates = dueDailies
    .filter(d => d.isLocking && !d.completedDates.includes(today) && d.time && nowMinutes < timeToMinutes(d.time))
    .sort((a, b) => timeToMinutes(a.time!) - timeToMinutes(b.time!));
  const nextGate = upcomingGates.length > 0 ? upcomingGates[0] : null;

  const lockingTasksToday = tasks.filter(t => t.date === today && t.isLocking);
  const lockingLeft = lockingTasksToday.filter(t => !t.completed).length + gatingDailies.length;
  const allLockingDone = lockingLeft === 0;
  const hasLockingToday = lockingTasksToday.length > 0 || dueDailies.some(d => d.isLocking);

  const todayTasks = tasks.filter(t => t.date === selectedDate);
  const completedToday = todayTasks.filter(t => t.completed).length;

  const getCompletedDates = useCallback((): Set<string> => {
    const dateMap = new Map<string, { total: number; completed: number }>();
    tasks.forEach(t => {
      const existing = dateMap.get(t.date) ?? { total: 0, completed: 0 };
      dateMap.set(t.date, {
        total: existing.total + 1,
        completed: existing.completed + (t.completed ? 1 : 0),
      });
    });
    const result = new Set<string>();
    dateMap.forEach((v, k) => {
      if (v.total > 0 && v.completed === v.total) result.add(k);
    });
    return result;
  }, [tasks]);

  const addTask = useCallback((title: string, priority: Priority, isLocking: boolean) => {
    setTasks(prev => [
      ...(Array.isArray(prev) ? prev : []),
      { id: uid(), title, completed: false, date: selectedDate, priority, isLocking },
    ]);
  }, [selectedDate, setTasks]);

  const toggleTask = useCallback((id: string) => {
    setTasks(prev => (Array.isArray(prev) ? prev : []).map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  }, [setTasks]);

  const deleteTask = useCallback((id: string) => {
    setTasks(prev => (Array.isArray(prev) ? prev : []).filter(t => t.id !== id));
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

  const deleteDaily = useCallback((id: string) => {
    setDailies(prev => (Array.isArray(prev) ? prev : []).filter(d => d.id !== id));
  }, [setDailies]);

  /** Consecutive due-days completed; skips days the daily isn't scheduled. */
  const getDailyStreak = useCallback((daily: Daily): number => {
    let streak = 0;
    const d = new Date();
    const dueOn = (dt: Date) => daily.targetDays.includes(dt.getDay());
    const doneOn = (dt: Date) => daily.completedDates.includes(toLocalDateStr(dt));
    if (dueOn(d) && doneOn(d)) streak++; // today counts if done, never breaks
    d.setDate(d.getDate() - 1);
    for (let i = 0; i < 3650; i++) {
      if (dueOn(d)) {
        if (!doneOn(d)) break;
        streak++;
      }
      d.setDate(d.getDate() - 1);
    }
    return streak;
  }, []);

  /**
   * Dates (today onward) the native midnight re-lock should arm for: days
   * with incomplete locking to-dos plus days an all-day locking daily is due.
   * Timed dailies are excluded — they lock from their start time in-app, not
   * at midnight.
   */
  const getPendingLockDates = useCallback((): string[] => {
    const dates = new Set(
      tasks.filter(t => t.isLocking && !t.completed && t.date >= today).map(t => t.date),
    );
    const allDayLocking = dailies.filter(d => d.isLocking && !d.time);
    for (let i = 0; i < 14; i++) {
      const dt = new Date();
      dt.setDate(dt.getDate() + i);
      const ds = toLocalDateStr(dt);
      if (allDayLocking.some(d => d.targetDays.includes(dt.getDay()) && !d.completedDates.includes(ds))) {
        dates.add(ds);
      }
    }
    return [...dates].sort();
  }, [tasks, dailies, today]);

  const getStreak = useCallback((habit: Habit): number => {
    let streak = 0;
    const d = new Date();
    // A streak isn't broken just because today isn't checked off yet.
    if (!habit.completedDates.includes(toLocalDateStr(d))) d.setDate(d.getDate() - 1);
    while (streak < 3650) {
      if (!habit.completedDates.includes(toLocalDateStr(d))) break;
      streak++;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  }, []);

  const getLast7Days = useCallback((): string[] => {
    const days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(toLocalDateStr(d));
    }
    return days;
  }, []);

  return {
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
    addTask,
    toggleTask,
    deleteTask,
    toggleHabit,
    addHabit,
    deleteHabit,
    addDaily,
    toggleDaily,
    deleteDaily,
    getDailyStreak,
    getStreak,
    getLast7Days,
  };
}

export type Store = ReturnType<typeof useStore>;
