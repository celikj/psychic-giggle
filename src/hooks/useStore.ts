import { useState, useEffect, useCallback } from 'react';
import type { Task, Habit, BlockedApp, Priority } from '../types';

function useLocalStorage<T>(key: string, initialValue: T): [T, (v: T | ((p: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}

export function useStore() {
  const today = new Date().toISOString().split('T')[0];

  const [tasks, setTasks] = useLocalStorage<Task[]>('tl_tasks', [
    { id: '1', title: 'Morning workout', completed: false, date: today, priority: 'high', isLocking: true },
    { id: '2', title: 'Read for 30 minutes', completed: false, date: today, priority: 'medium', isLocking: false },
    { id: '3', title: 'Review project proposal', completed: false, date: today, priority: 'high', isLocking: true },
    { id: '4', title: 'Reply to emails', completed: false, date: today, priority: 'low', isLocking: false },
    { id: '5', title: 'Meditate 10 min', completed: false, date: today, priority: 'medium', isLocking: false },
  ]);

  const [habits, setHabits] = useLocalStorage<Habit[]>('tl_habits', [
    { id: '1', title: 'Morning workout', emoji: '💪', completedDates: [], color: '#FF6B35', targetDays: [1, 2, 3, 4, 5] },
    { id: '2', title: 'Read 30 min', emoji: '📚', completedDates: [], color: '#4F9EF8', targetDays: [0, 1, 2, 3, 4, 5, 6] },
    { id: '3', title: 'Meditate', emoji: '🧘', completedDates: [], color: '#A78BFA', targetDays: [0, 1, 2, 3, 4, 5, 6] },
    { id: '4', title: 'No social media', emoji: '📵', completedDates: [], color: '#34D399', targetDays: [1, 2, 3, 4, 5] },
  ]);

  const [blockedApps, setBlockedApps] = useLocalStorage<BlockedApp[]>('tl_blocked', [
    { id: '1', name: 'Instagram', icon: '📸', url: 'https://instagram.com' },
    { id: '2', name: 'Twitter / X', icon: '🐦', url: 'https://x.com' },
    { id: '3', name: 'YouTube', icon: '▶️', url: 'https://youtube.com' },
    { id: '4', name: 'TikTok', icon: '🎵', url: 'https://tiktok.com' },
    { id: '5', name: 'Reddit', icon: '🟠', url: 'https://reddit.com' },
  ]);

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
      { id: Date.now().toString(), title, completed: false, date: selectedDate, priority, isLocking },
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
      { id: Date.now().toString(), title, emoji, completedDates: [], color, targetDays },
    ]);
  }, [setHabits]);

  const deleteHabit = useCallback((id: string) => {
    setHabits(prev => (Array.isArray(prev) ? prev : []).filter(h => h.id !== id));
  }, [setHabits]);

  const addBlockedApp = useCallback((name: string, icon: string, url: string) => {
    setBlockedApps(prev => [
      ...(Array.isArray(prev) ? prev : []),
      { id: Date.now().toString(), name, icon, url },
    ]);
  }, [setBlockedApps]);

  const removeBlockedApp = useCallback((id: string) => {
    setBlockedApps(prev => (Array.isArray(prev) ? prev : []).filter(a => a.id !== id));
  }, [setBlockedApps]);

  const getStreak = useCallback((habit: Habit): number => {
    let streak = 0;
    const d = new Date();
    while (streak < 365) {
      const dateStr = d.toISOString().split('T')[0];
      if (!habit.completedDates.includes(dateStr)) break;
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
      days.push(d.toISOString().split('T')[0]);
    }
    return days;
  }, []);

  return {
    tasks,
    habits,
    blockedApps,
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
    addBlockedApp,
    removeBlockedApp,
    getStreak,
    getLast7Days,
  };
}

export type Store = ReturnType<typeof useStore>;
