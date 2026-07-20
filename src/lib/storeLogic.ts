import type { Task, Habit, Daily } from '../types';
import { toLocalDateStr } from './date';

/**
 * Pure calculations backing useStore — streaks, lock/gate state, and the
 * native re-arm date sets. Kept free of React so they're directly testable;
 * every function that needs "now" takes it as a parameter (defaulting to
 * `new Date()`) rather than reading the clock itself.
 */

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function minutesOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

export interface LockState {
  /** Dailies due today (on today's weekday), locking or not. */
  dueDailies: Daily[];
  /** Locking dailies due today, not yet done, and past their start time (or untimed). */
  gatingDailies: Daily[];
  /** The next locking daily due today that hasn't started gating yet, if any. */
  nextGate: Daily | null;
  lockingTasksToday: Task[];
  lockingLeft: number;
  allLockingDone: boolean;
  hasLockingToday: boolean;
}

/**
 * What's currently gating (blocking) apps, and what's coming up. A locking
 * daily gates once due: immediately if it has no time, from its start time
 * if it does — until checked off. A locking to-do gates for as long as it's
 * incomplete, regardless of time of day.
 */
export function computeLockState(tasks: Task[], dailies: Daily[], today: string, now: Date = new Date()): LockState {
  const todayWeekday = now.getDay();
  const nowMinutes = minutesOfDay(now);
  const dueDailies = dailies.filter(d => d.targetDays.includes(todayWeekday));

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

  return { dueDailies, gatingDailies, nextGate, lockingTasksToday, lockingLeft, allLockingDone, hasLockingToday };
}

/** Dates where every task that day is complete (and there's at least one). */
export function computeCompletedDates(tasks: Task[]): Set<string> {
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
}

/** Consecutive due-days completed; skips days the daily isn't scheduled. Today counts if done or frozen, but never breaks the streak if not done yet. */
export function computeDailyStreak(daily: Daily, now: Date = new Date()): number {
  let streak = 0;
  const d = new Date(now);
  const dueOn = (dt: Date) => daily.targetDays.includes(dt.getDay());
  
  const ds = toLocalDateStr(d);
  const doneOn = (dt: Date) => daily.completedDates.includes(toLocalDateStr(dt));
  const frozenOn = (dt: Date) => daily.frozenDates?.includes(toLocalDateStr(dt));
  
  if (dueOn(d) && (doneOn(d) || frozenOn(d))) streak++;
  d.setDate(d.getDate() - 1);
  for (let i = 0; i < 3650; i++) {
    if (dueOn(d)) {
      if (!doneOn(d) && !frozenOn(d)) break;
      streak++;
    }
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

/** Consecutive days completed or frozen. Today counts if done/frozen, but never breaks the streak if not done yet. */
export function computeHabitStreak(habit: Habit, now: Date = new Date()): number {
  let streak = 0;
  const d = new Date(now);
  
  const ds = toLocalDateStr(d);
  const doneToday = habit.completedDates.includes(ds);
  const frozenToday = habit.frozenDates?.includes(ds);
  
  if (!doneToday && !frozenToday) d.setDate(d.getDate() - 1);
  
  while (streak < 3650) {
    const pds = toLocalDateStr(d);
    const done = habit.completedDates.includes(pds);
    const frozen = habit.frozenDates?.includes(pds);
    if (!done && !frozen) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

/**
 * Dates (today onward) the native midnight re-lock should arm for: days with
 * an incomplete locking to-do, plus days an all-day locking daily is due.
 * Timed dailies are excluded — computePendingTimedLockDates handles those,
 * since they need to re-lock at their own start time, not at midnight.
 */
export function computePendingLockDates(tasks: Task[], dailies: Daily[], today: string, now: Date = new Date()): string[] {
  const dates = new Set(
    tasks.filter(t => t.isLocking && !t.completed && t.date >= today).map(t => t.date),
  );
  const allDayLocking = dailies.filter(d => d.isLocking && !d.time);
  for (let i = 0; i < 14; i++) {
    const dt = new Date(now);
    dt.setDate(dt.getDate() + i);
    const ds = toLocalDateStr(dt);
    if (allDayLocking.some(d => d.targetDays.includes(dt.getDay()) && !d.completedDates.includes(ds))) {
      dates.add(ds);
    }
  }
  return [...dates].sort();
}

/**
 * For each distinct start time among timed locking dailies, the dates
 * (today onward) it should re-arm for — i.e. at least one daily due at that
 * time isn't completed yet. Keyed by "HH:MM" to match Daily.time, so the
 * native layer can register one repeating schedule per time-of-day.
 */
export function computePendingTimedLockDates(dailies: Daily[], now: Date = new Date()): Record<string, string[]> {
  const byTime = new Map<string, Daily[]>();
  for (const d of dailies.filter(d => d.isLocking && d.time)) {
    const list = byTime.get(d.time!) ?? [];
    list.push(d);
    byTime.set(d.time!, list);
  }
  const result: Record<string, string[]> = {};
  byTime.forEach((ds, time) => {
    const dates: string[] = [];
    for (let i = 0; i < 14; i++) {
      const dt = new Date(now);
      dt.setDate(dt.getDate() + i);
      const dateStr = toLocalDateStr(dt);
      if (ds.some(d => d.targetDays.includes(dt.getDay()) && !d.completedDates.includes(dateStr))) {
        dates.push(dateStr);
      }
    }
    if (dates.length > 0) result[time] = dates;
  });
  return result;
}

/** Incomplete to-dos dated strictly before today, oldest first. */
export function computeOverdueTasks(tasks: Task[], today: string): Task[] {
  return tasks
    .filter(t => !t.completed && t.date < today)
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Reorder `tasks` so the ones named in `orderedIds` take that relative order,
 * while every other task keeps its exact position. This lets the view reorder
 * just the visible subset (one day's incomplete tasks) without disturbing how
 * other days' tasks are stored.
 */
export function reorderByIds(tasks: Task[], orderedIds: string[]): Task[] {
  const idSet = new Set(orderedIds);
  const queue = orderedIds
    .map(id => tasks.find(t => t.id === id))
    .filter((t): t is Task => t !== undefined);
  let qi = 0;
  return tasks.map(t => (idSet.has(t.id) && qi < queue.length ? queue[qi++] : t));
}

export interface WeeklyStats {
  /** Oldest first, ending today. */
  days: { date: string; tasks: number; dailies: number; habits: number; total: number }[];
  totalCompletions: number;
  /** Highest current streak across all dailies and habits. */
  bestStreak: number;
  /** Days (of the last 7) with at least one completion. */
  activeDays: number;
}

/** Completion counts over the last 7 calendar days, for the stats card. */
export function computeWeeklyStats(tasks: Task[], dailies: Daily[], habits: Habit[], now: Date = new Date()): WeeklyStats {
  const days = computeLast7Days(now).map(date => {
    const t = tasks.filter(x => x.date === date && x.completed).length;
    const d = dailies.filter(x => x.completedDates.includes(date)).length;
    const h = habits.filter(x => x.completedDates.includes(date)).length;
    return { date, tasks: t, dailies: d, habits: h, total: t + d + h };
  });
  const bestStreak = Math.max(
    0,
    ...dailies.map(d => computeDailyStreak(d, now)),
    ...habits.map(h => computeHabitStreak(h, now)),
  );
  return {
    days,
    totalCompletions: days.reduce((sum, d) => sum + d.total, 0),
    bestStreak,
    activeDays: days.filter(d => d.total > 0).length,
  };
}

export function computeLast7Days(now: Date = new Date()): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    days.push(toLocalDateStr(d));
  }
  return days;
}

// ---- Strict Mode ----

export interface StrictState {
  /** Strict mode is on AND locking items are pending — all guards enforced. */
  isActive: boolean;
  /** False when strict is active: the "Lock until tasks done" toggle is frozen. */
  canToggleBlocker: boolean;
  /** False when strict is active: locking items can't be deleted. */
  canDeleteLockingItem: boolean;
  /** False when strict is active: the isLocking flag can't be removed from an item. */
  canRemoveLocking: boolean;
  /** False when strict is active and the daily pass was already used. */
  canUseEmergencyPass: boolean;
  /** Human-readable explanation for disabled controls. */
  reason: string;
}

/**
 * Determines whether Strict Mode is actively enforcing restrictions.
 *
 * Strict is "active" when `strictEnabled` is true AND at least one locking
 * item is still pending today. While active, the user cannot:
 * - toggle the blocker off
 * - delete a locking item
 * - un-mark an item as locking
 * - use the emergency pass more than once per day
 *
 * Once all locking items are done (or at midnight when the day rolls over),
 * strict lifts and all controls are re-enabled.
 */
export function computeStrictState(
  strictEnabled: boolean,
  lockState: LockState,
  emergencyUsedToday: boolean,
): StrictState {
  const isActive = strictEnabled && !lockState.allLockingDone && lockState.hasLockingToday;

  if (!isActive) {
    return {
      isActive: false,
      canToggleBlocker: true,
      canDeleteLockingItem: true,
      canRemoveLocking: true,
      canUseEmergencyPass: !emergencyUsedToday,
      reason: '',
    };
  }

  return {
    isActive: true,
    canToggleBlocker: false,
    canDeleteLockingItem: false,
    canRemoveLocking: false,
    canUseEmergencyPass: !emergencyUsedToday,
    reason: 'Strict Mode is active — finish your locking tasks or wait until midnight.',
  };
}
