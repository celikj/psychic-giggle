import type { Task, Daily } from '../types';

export const LIMITS = {
  FREE_LOCKING_TASKS_PER_DAY: 2,
  FREE_LOCKING_DAILIES: 2,
} as const;

export function canAddLockingDaily(dailies: Daily[], isPremium: boolean): boolean {
  if (isPremium) return true;
  const lockingDailies = dailies.filter(d => d.isLocking).length;
  return lockingDailies < LIMITS.FREE_LOCKING_DAILIES;
}

export function canMakeDailyLocking(dailies: Daily[], dailyId: string, isPremium: boolean): boolean {
  if (isPremium) return true;
  const existing = dailies.find(d => d.id === dailyId);
  if (existing?.isLocking) return true;
  const lockingDailies = dailies.filter(d => d.isLocking).length;
  return lockingDailies < LIMITS.FREE_LOCKING_DAILIES;
}

/** 
 * A task is "locking" if it has isLocking = true.
 * The limit applies to incomplete locking tasks due on the selected date.
 * (If a user completes their free locking task for today, they can add another, 
 * or the limit could just be strictly on the total number of locking tasks for that day).
 * Let's keep it simple: total locking tasks for the specific date.
 */
export function canAddLockingTask(tasks: Task[], date: string, isPremium: boolean): boolean {
  if (isPremium) return true;
  const lockingToday = tasks.filter(t => t.date === date && t.isLocking).length;
  return lockingToday < LIMITS.FREE_LOCKING_TASKS_PER_DAY;
}

/** 
 * When editing a task to become locking, we check the same limit,
 * unless it was already a locking task (in which case it doesn't count against the limit again).
 */
export function canMakeTaskLocking(tasks: Task[], taskId: string, date: string, isPremium: boolean): boolean {
  if (isPremium) return true;
  const existing = tasks.find(t => t.id === taskId);
  if (existing?.isLocking && existing.date === date) return true;
  
  const lockingToday = tasks.filter(t => t.date === date && t.isLocking).length;
  return lockingToday < LIMITS.FREE_LOCKING_TASKS_PER_DAY;
}
