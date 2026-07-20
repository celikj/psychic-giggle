import { describe, it, expect } from 'vitest';
import { computeItemMonthlyStats } from './monthlyStats';
import type { Daily, Habit } from '../types';

describe('monthlyStats', () => {
  it('computes stats correctly for an empty month', () => {
    const habit: Habit = {
      id: 'h1',
      title: 'Water',
      completedDates: [],
      frozenDates: [],
      date: '2026-07-01'
    };

    const stats = computeItemMonthlyStats(habit, '2026-07');
    expect(stats.month).toBe('2026-07');
    expect(stats.totalDue).toBe(31);
    expect(stats.totalCompleted).toBe(0);
    expect(stats.completionRate).toBe(0);
    expect(stats.bestStreak).toBe(0);
    expect(stats.days.length).toBe(31);
  });

  it('computes completion rate, streaks, and best weekday for a Daily', () => {
    // July 2026 starts on Wednesday (3)
    const daily: Daily = {
      id: 'd1',
      title: 'Gym',
      targetDays: [1, 3, 5], // Mon, Wed, Fri
      completedDates: [
        '2026-07-01', // Wed (done)
        '2026-07-03', // Fri (done)
        // missed 07-06 (Mon)
        '2026-07-08', // Wed (done)
        // 2026-07-10 is frozen, not done
        '2026-07-13', // Mon (done)
        '2026-07-15', // Wed (done)
      ],
      frozenDates: [
        '2026-07-10'  // Fri (frozen)
      ],
      isLocking: false,
      date: '2026-07-01'
    };

    const stats = computeItemMonthlyStats(daily, '2026-07');
    
    // total due: Mon (4), Wed (5), Fri (5) = 14 days due in July 2026
    expect(stats.totalDue).toBe(14);
    expect(stats.totalCompleted).toBe(5);
    expect(stats.completionRate).toBeCloseTo(5 / 14);

    // Streak logic:
    // 01(done), 03(done) -> streak=2
    // 06(missed) -> streak=0
    // 08(done), 10(frozen), 13(done), 15(done) -> streak=3
    expect(stats.bestStreak).toBe(3);

    // Weekday rates:
    // Wed: 3/5
    // Fri: 1/5 (since frozen doesn't count as complete)
    // Mon: 1/4
    // Best is Wed (3)
    expect(stats.bestWeekday).toBe(3);
  });
});
