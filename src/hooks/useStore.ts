import { useState, useEffect, useCallback } from 'react';
import type { Task, Habit, Priority } from '../types';
import { toLocalDateStr, localToday } from '../lib/date';

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

  // Roll "today" over at midnight while the app stays open, and re-check
  // whenever the tab/app returns to the foreground. This is what re-arms the
  // blocker for a new day without a restart.
  useEffect(() => {
    const check = () => setToday(prev => {
      const now = localToday();
      return now === prev ? prev : now;
    });
    const id = setInterval(check, 30_000);
    document.addEventListener('visibilitychange', check);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', check);
    };
  }, []);

  const [tasks, setTasks] = useLocalStorage<Task[]>('tl_tasks', []);
  const [habits, setHabits] = useLocalStorage<Habit[]>('tl_habits', []);

  const [selectedDate, setSelectedDate] = useState(today);

  const lockingTasksToday = tasks.filter(t => t.date === today && t.isLocking);
  const allLockingDone = lockingTasksToday.length === 0 || lockingTasksToday.every(t => t.completed);
  const lockingLeft = lockingTasksToday.filter(t => !t.completed).length;

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
    selectedDate,
    setSelectedDate,
    today,
    allLockingDone,
    lockingLeft,
    todayTasks,
    completedToday,
    getCompletedDates,
    addTask,
    toggleTask,
    deleteTask,
    toggleHabit,
    addHabit,
    deleteHabit,
    getStreak,
    getLast7Days,
  };
}

export type Store = ReturnType<typeof useStore>;
