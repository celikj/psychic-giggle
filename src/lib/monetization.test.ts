import { describe, it, expect } from 'vitest';
import { canAddLockingDaily, canMakeDailyLocking, canAddLockingTask, canMakeTaskLocking, LIMITS } from './monetization';
import type { Task, Daily, Habit } from '../types';

describe('Monetization Logic', () => {
  it('allows adding locking dailies up to the limit', () => {
    const dailies: Daily[] = [];
    expect(canAddLockingDaily(dailies, false)).toBe(true);
    
    for (let i = 0; i < LIMITS.FREE_LOCKING_DAILIES; i++) {
      dailies.push({ id: `d${i}`, isLocking: true } as Daily);
    }
    
    // Limit reached for locking dailies
    expect(canAddLockingDaily(dailies, false)).toBe(false);
    expect(canAddLockingDaily(dailies, true)).toBe(true); // Premium bypasses
    
    // Changing an existing non-locking daily to locking
    dailies.push({ id: 'free1', isLocking: false } as Daily);
    expect(canMakeDailyLocking(dailies, 'free1', false)).toBe(false);
    
    // Editing an existing locking daily is fine
    expect(canMakeDailyLocking(dailies, 'd0', false)).toBe(true);
  });

  it('limits locking tasks per day', () => {
    const tasks: Task[] = [];
    expect(canAddLockingTask(tasks, '2026-01-01', false)).toBe(true);
    
    // Add two locking tasks on 01-01
    tasks.push({ id: 't1', date: '2026-01-01', isLocking: true } as Task);
    expect(canAddLockingTask(tasks, '2026-01-01', false)).toBe(true);
    tasks.push({ id: 't1_2', date: '2026-01-01', isLocking: true } as Task);
    
    // Limit reached for 01-01
    expect(canAddLockingTask(tasks, '2026-01-01', false)).toBe(false);
    
    // But other days are fine
    expect(canAddLockingTask(tasks, '2026-01-02', false)).toBe(true);
    
    // Non-locking tasks don't count
    tasks.push({ id: 't2', date: '2026-01-01', isLocking: false } as Task);
    expect(canAddLockingTask(tasks, '2026-01-01', false)).toBe(false); // Still false for new locking ones
    
    // Premium bypasses
    expect(canAddLockingTask(tasks, '2026-01-01', true)).toBe(true);
  });

  it('allows editing an existing locking task without hitting limit again', () => {
    const tasks: Task[] = [
      { id: 't1', date: '2026-01-01', isLocking: true } as Task,
      { id: 't1_2', date: '2026-01-01', isLocking: true } as Task,
    ];
    
    // We want to edit 't1' and keep it locking
    expect(canMakeTaskLocking(tasks, 't1', '2026-01-01', false)).toBe(true);
    
    // We want to edit a non-locking task 't2' to make it locking, but limit is hit
    tasks.push({ id: 't2', date: '2026-01-01', isLocking: false } as Task);
    expect(canMakeTaskLocking(tasks, 't2', '2026-01-01', false)).toBe(false);
  });
});
