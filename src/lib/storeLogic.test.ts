import { describe, it, expect } from 'vitest';
import type { Task, Daily, Habit } from '../types';
import { toLocalDateStr } from './date';
import {
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
} from './storeLogic';

// Fixed anchor so tests don't depend on the real calendar date. Its weekday
// is derived rather than hardcoded, so fixtures stay correct regardless.
const NOW = new Date(2026, 6, 20, 15, 0); // Jul 20 2026, 15:00 local
const TODAY = toLocalDateStr(NOW);
const TODAY_WEEKDAY = NOW.getDay();
const OTHER_WEEKDAY = (TODAY_WEEKDAY + 3) % 7;

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: overrides.id ?? Math.random().toString(36),
    title: 'Task',
    completed: false,
    date: TODAY,
    priority: 'medium',
    isLocking: false,
    ...overrides,
  };
}

function daily(overrides: Partial<Daily> = {}): Daily {
  return {
    id: overrides.id ?? Math.random().toString(36),
    title: 'Daily',
    emoji: '🎯',
    targetDays: [TODAY_WEEKDAY],
    isLocking: false,
    completedDates: [],
    ...overrides,
  };
}

function habit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: overrides.id ?? Math.random().toString(36),
    title: 'Habit',
    emoji: '🎯',
    completedDates: [],
    color: '#FF6B35',
    targetDays: [0, 1, 2, 3, 4, 5, 6],
    ...overrides,
  };
}

function daysAgo(n: number): string {
  const d = new Date(NOW);
  d.setDate(d.getDate() - n);
  return toLocalDateStr(d);
}

function daysAhead(n: number): string {
  const d = new Date(NOW);
  d.setDate(d.getDate() + n);
  return toLocalDateStr(d);
}

describe('computeLockState', () => {
  it('is unlocked with nothing configured', () => {
    const state = computeLockState([], [], TODAY, NOW);
    expect(state.allLockingDone).toBe(true);
    expect(state.lockingLeft).toBe(0);
    expect(state.hasLockingToday).toBe(false);
  });

  it('locks on an incomplete locking to-do due today', () => {
    const state = computeLockState([task({ isLocking: true, completed: false })], [], TODAY, NOW);
    expect(state.allLockingDone).toBe(false);
    expect(state.lockingLeft).toBe(1);
    expect(state.hasLockingToday).toBe(true);
  });

  it('unlocks once the locking to-do is completed', () => {
    const state = computeLockState([task({ isLocking: true, completed: true })], [], TODAY, NOW);
    expect(state.allLockingDone).toBe(true);
  });

  it('ignores a locking to-do scheduled for a different date', () => {
    const state = computeLockState([task({ isLocking: true, completed: false, date: daysAhead(1) })], [], TODAY, NOW);
    expect(state.allLockingDone).toBe(true);
    expect(state.hasLockingToday).toBe(false);
  });

  it('ignores a non-locking to-do regardless of completion', () => {
    const state = computeLockState([task({ isLocking: false, completed: false })], [], TODAY, NOW);
    expect(state.allLockingDone).toBe(true);
  });

  it('an untimed locking daily gates immediately once due', () => {
    const d = daily({ isLocking: true });
    const state = computeLockState([], [d], TODAY, NOW);
    expect(state.dueDailies).toEqual([d]);
    expect(state.gatingDailies).toEqual([d]);
    expect(state.allLockingDone).toBe(false);
  });

  it('a completed daily does not gate', () => {
    const d = daily({ isLocking: true, completedDates: [TODAY] });
    const state = computeLockState([], [d], TODAY, NOW);
    expect(state.gatingDailies).toEqual([]);
    expect(state.allLockingDone).toBe(true);
  });

  it('excludes a daily not scheduled for today', () => {
    const d = daily({ isLocking: true, targetDays: [OTHER_WEEKDAY] });
    const state = computeLockState([], [d], TODAY, NOW);
    expect(state.dueDailies).toEqual([]);
    expect(state.gatingDailies).toEqual([]);
    expect(state.hasLockingToday).toBe(false);
  });

  it('a timed locking daily does not gate before its time, and appears as the next gate', () => {
    const d = daily({ isLocking: true, time: '21:00' }); // NOW is 15:00
    const state = computeLockState([], [d], TODAY, NOW);
    expect(state.gatingDailies).toEqual([]);
    expect(state.allLockingDone).toBe(true);
    expect(state.nextGate).toEqual(d);
  });

  it('a timed locking daily gates once its time has passed', () => {
    const d = daily({ isLocking: true, time: '09:00' }); // NOW is 15:00
    const state = computeLockState([], [d], TODAY, NOW);
    expect(state.gatingDailies).toEqual([d]);
    expect(state.allLockingDone).toBe(false);
    expect(state.nextGate).toBeNull();
  });

  it('picks the earliest of several upcoming timed gates', () => {
    const late = daily({ id: 'late', isLocking: true, time: '23:00' });
    const early = daily({ id: 'early', isLocking: true, time: '18:00' });
    const state = computeLockState([], [late, early], TODAY, NOW);
    expect(state.nextGate?.id).toBe('early');
  });

  it('a non-locking daily never gates', () => {
    const d = daily({ isLocking: false });
    const state = computeLockState([], [d], TODAY, NOW);
    expect(state.gatingDailies).toEqual([]);
    expect(state.hasLockingToday).toBe(false);
  });

  it('lockingLeft counts to-dos and gating dailies together', () => {
    const state = computeLockState(
      [task({ isLocking: true, completed: false }), task({ isLocking: true, completed: true })],
      [daily({ isLocking: true }), daily({ isLocking: true, time: '23:00' })], // one gates, one is still upcoming
      TODAY,
      NOW,
    );
    expect(state.lockingLeft).toBe(2); // 1 incomplete to-do + 1 gating daily
  });
});

describe('computeCompletedDates', () => {
  it('includes a date only when every task that day is complete', () => {
    const dates = computeCompletedDates([
      task({ date: '2026-01-01', completed: true }),
      task({ date: '2026-01-01', completed: true }),
      task({ date: '2026-01-02', completed: true }),
      task({ date: '2026-01-02', completed: false }),
    ]);
    expect(dates.has('2026-01-01')).toBe(true);
    expect(dates.has('2026-01-02')).toBe(false);
  });

  it('has no entries when there are no tasks', () => {
    expect(computeCompletedDates([]).size).toBe(0);
  });
});

describe('computeDailyStreak', () => {
  it('is 0 with no completions', () => {
    expect(computeDailyStreak(daily(), NOW)).toBe(0);
  });

  const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];

  it('counts consecutive due-days including today when done', () => {
    const d = daily({ targetDays: EVERY_DAY, completedDates: [TODAY, daysAgo(1), daysAgo(2)] });
    expect(computeDailyStreak(d, NOW)).toBe(3);
  });

  it('does not break the streak just because today is not done yet', () => {
    const d = daily({ targetDays: EVERY_DAY, completedDates: [daysAgo(1), daysAgo(2)] }); // today missing
    expect(computeDailyStreak(d, NOW)).toBe(2);
  });

  it('a gap breaks the streak', () => {
    const d = daily({ targetDays: EVERY_DAY, completedDates: [TODAY, daysAgo(1), daysAgo(3)] }); // daysAgo(2) missing
    expect(computeDailyStreak(d, NOW)).toBe(2);
  });

  it('skips days the daily is not scheduled on, without breaking the streak', () => {
    // Scheduled every day except OTHER_WEEKDAY; completed on every scheduled
    // day for the last week, and OTHER_WEEKDAY simply has no completion.
    const scheduledDays = [0, 1, 2, 3, 4, 5, 6].filter(w => w !== OTHER_WEEKDAY);
    const completedDates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const ds = daysAgo(i);
      const weekday = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - i).getDay();
      if (scheduledDays.includes(weekday)) completedDates.push(ds);
    }
    const d = daily({ targetDays: scheduledDays, completedDates });
    // Only 6 of the last 7 calendar days are actually scheduled (one weekday
    // is excluded); every one of those 6 was completed, so the streak is 6 —
    // the unscheduled day is skipped over rather than breaking the count.
    expect(computeDailyStreak(d, NOW)).toBe(6);
  });
});

describe('computeHabitStreak', () => {
  it('is 0 with no completions', () => {
    expect(computeHabitStreak(habit(), NOW)).toBe(0);
  });

  it('counts consecutive days including today when done', () => {
    const h = habit({ completedDates: [TODAY, daysAgo(1), daysAgo(2)] });
    expect(computeHabitStreak(h, NOW)).toBe(3);
  });

  it('does not break the streak just because today is not done yet', () => {
    const h = habit({ completedDates: [daysAgo(1), daysAgo(2)] });
    expect(computeHabitStreak(h, NOW)).toBe(2);
  });

  it('a gap breaks the streak', () => {
    const h = habit({ completedDates: [TODAY, daysAgo(1), daysAgo(3)] });
    expect(computeHabitStreak(h, NOW)).toBe(2);
  });
});

describe('computePendingLockDates', () => {
  it('includes today for an incomplete locking to-do due today', () => {
    const dates = computePendingLockDates([task({ isLocking: true, completed: false })], [], TODAY, NOW);
    expect(dates).toContain(TODAY);
  });

  it('excludes a completed locking to-do', () => {
    const dates = computePendingLockDates([task({ isLocking: true, completed: true })], [], TODAY, NOW);
    expect(dates).toEqual([]);
  });

  it('excludes a locking to-do dated in the past', () => {
    const dates = computePendingLockDates([task({ isLocking: true, completed: false, date: daysAgo(1) })], [], TODAY, NOW);
    expect(dates).toEqual([]);
  });

  it('includes a future date for a locking to-do due then', () => {
    const future = daysAhead(3);
    const dates = computePendingLockDates([task({ isLocking: true, completed: false, date: future })], [], TODAY, NOW);
    expect(dates).toContain(future);
  });

  it('includes upcoming due dates for an all-day locking daily', () => {
    const d = daily({ isLocking: true }); // due today's weekday, no time
    const dates = computePendingLockDates([], [d], TODAY, NOW);
    expect(dates).toContain(TODAY);
  });

  it('excludes a timed locking daily — that goes through computePendingTimedLockDates instead', () => {
    const d = daily({ isLocking: true, time: '21:00' });
    const dates = computePendingLockDates([], [d], TODAY, NOW);
    expect(dates).toEqual([]);
  });
});

describe('computePendingTimedLockDates', () => {
  it('groups pending dates by the daily\'s exact time', () => {
    const d = daily({ isLocking: true, time: '21:00' });
    const byTime = computePendingTimedLockDates([d], NOW);
    expect(byTime['21:00']).toContain(TODAY);
    expect(Object.keys(byTime)).toEqual(['21:00']);
  });

  it('unions two dailies that share the same time', () => {
    const a = daily({ id: 'a', isLocking: true, time: '21:00', targetDays: [TODAY_WEEKDAY] });
    const b = daily({ id: 'b', isLocking: true, time: '21:00', targetDays: [OTHER_WEEKDAY] });
    const byTime = computePendingTimedLockDates([a, b], NOW);
    // Both weekdays are covered under the one shared time key.
    expect(byTime['21:00'].length).toBeGreaterThanOrEqual(2);
  });

  it('omits a time whose only pending occurrence is already completed', () => {
    // Due weekly on TODAY_WEEKDAY, so within the 14-day window it recurs
    // once more (7 days out) — both occurrences need to be done for the
    // time slot to drop out entirely.
    const d = daily({ isLocking: true, time: '21:00', targetDays: [TODAY_WEEKDAY], completedDates: [TODAY, daysAhead(7)] });
    const byTime = computePendingTimedLockDates([d], NOW);
    expect(byTime['21:00']).toBeUndefined();
  });

  it('excludes untimed locking dailies', () => {
    const d = daily({ isLocking: true });
    const byTime = computePendingTimedLockDates([d], NOW);
    expect(Object.keys(byTime)).toEqual([]);
  });
});

describe('computeOverdueTasks', () => {
  it('returns incomplete tasks dated before today, oldest first', () => {
    const old = task({ id: 'old', completed: false, date: daysAgo(3) });
    const recent = task({ id: 'recent', completed: false, date: daysAgo(1) });
    const overdue = computeOverdueTasks([recent, old], TODAY);
    expect(overdue.map(t => t.id)).toEqual(['old', 'recent']);
  });

  it('excludes completed past tasks and anything from today onward', () => {
    const overdue = computeOverdueTasks([
      task({ completed: true, date: daysAgo(1) }),
      task({ completed: false, date: TODAY }),
      task({ completed: false, date: daysAhead(1) }),
    ], TODAY);
    expect(overdue).toEqual([]);
  });
});

describe('reorderByIds', () => {
  const a = task({ id: 'a' });
  const b = task({ id: 'b' });
  const c = task({ id: 'c' });
  const other = task({ id: 'other', date: daysAhead(1) });

  it('applies the given relative order to the named tasks', () => {
    const result = reorderByIds([a, b, c], ['c', 'a', 'b']);
    expect(result.map(t => t.id)).toEqual(['c', 'a', 'b']);
  });

  it('leaves tasks outside the ordered subset in their original positions', () => {
    const result = reorderByIds([a, other, b, c], ['c', 'b', 'a']);
    expect(result.map(t => t.id)).toEqual(['c', 'other', 'b', 'a']);
  });

  it('ignores unknown ids without corrupting the list', () => {
    const result = reorderByIds([a, b], ['ghost', 'b', 'a']);
    expect(result.map(t => t.id).sort()).toEqual(['a', 'b']);
    expect(result).toHaveLength(2);
  });
});

describe('computeWeeklyStats', () => {
  it('is all zeros with no data', () => {
    const stats = computeWeeklyStats([], [], [], NOW);
    expect(stats.days).toHaveLength(7);
    expect(stats.totalCompletions).toBe(0);
    expect(stats.bestStreak).toBe(0);
    expect(stats.activeDays).toBe(0);
  });

  it('counts completed tasks, dailies, and habits per day', () => {
    const stats = computeWeeklyStats(
      [task({ date: TODAY, completed: true }), task({ date: TODAY, completed: false })],
      [daily({ completedDates: [TODAY, daysAgo(1)] })],
      [habit({ completedDates: [TODAY] })],
      NOW,
    );
    const todayRow = stats.days[6];
    expect(todayRow.date).toBe(TODAY);
    expect(todayRow.tasks).toBe(1); // the incomplete one doesn't count
    expect(todayRow.dailies).toBe(1);
    expect(todayRow.habits).toBe(1);
    expect(todayRow.total).toBe(3);
    expect(stats.totalCompletions).toBe(4); // + yesterday's daily
    expect(stats.activeDays).toBe(2);
  });

  it('ignores completions older than 7 days', () => {
    const stats = computeWeeklyStats([], [], [habit({ completedDates: [daysAgo(8)] })], NOW);
    expect(stats.totalCompletions).toBe(0);
  });

  it('bestStreak is the max current streak across dailies and habits', () => {
    const stats = computeWeeklyStats(
      [],
      [daily({ targetDays: [0, 1, 2, 3, 4, 5, 6], completedDates: [TODAY, daysAgo(1)] })],
      [habit({ completedDates: [TODAY, daysAgo(1), daysAgo(2), daysAgo(3)] })],
      NOW,
    );
    expect(stats.bestStreak).toBe(4);
  });
});

describe('computeLast7Days', () => {
  it('returns 7 consecutive dates ending today, oldest first', () => {
    const days = computeLast7Days(NOW);
    expect(days).toHaveLength(7);
    expect(days[6]).toBe(TODAY);
    expect(days[0]).toBe(daysAgo(6));
  });
});
