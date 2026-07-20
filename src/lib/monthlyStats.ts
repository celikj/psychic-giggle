import type { Daily, Habit } from '../types';

export interface DayStat {
  date: string;       // YYYY-MM-DD
  completed: boolean; // For single item
  frozen: boolean;
  rate: number;       // For the whole month (overall rate) or just 1.0/0.0
}

export interface MonthlyStats {
  month: string;                    // "2026-07"
  days: DayStat[];                  // Array of days in the month
  completionRate: number;           // 0-1
  bestStreak: number;
  bestWeekday: number;              // 0-6
  totalCompleted: number;
  totalDue: number;
}

/**
 * Returns all dates for a given month ("YYYY-MM").
 */
function getDaysInMonth(month: string): Date[] {
  const [year, m] = month.split('-').map(Number);
  const date = new Date(year, m - 1, 1);
  const days: Date[] = [];
  while (date.getMonth() === m - 1) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
}

export function computeItemMonthlyStats(
  item: Daily | Habit,
  month: string,
): MonthlyStats {
  const daysInMonth = getDaysInMonth(month);
  
  let totalDue = 0;
  let totalCompleted = 0;
  let currentStreak = 0;
  let bestStreak = 0;
  const weekdayCounts = [0, 0, 0, 0, 0, 0, 0];
  const weekdayCompletions = [0, 0, 0, 0, 0, 0, 0];
  
  const days: DayStat[] = daysInMonth.map(d => {
    const dStr = [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0')
    ].join('-');
    
    const dayOfWeek = d.getDay();
    let isDue = false;

    if ('targetDays' in item) {
      // It's a Daily
      isDue = item.targetDays.includes(dayOfWeek);
    } else {
      // It's a Habit (due every day, or at least we track every day)
      isDue = true;
    }

    const completed = item.completedDates.includes(dStr);
    const frozen = item.frozenDates?.includes(dStr) ?? false;

    if (isDue) {
      totalDue++;
      weekdayCounts[dayOfWeek]++;
      if (completed) {
        totalCompleted++;
        weekdayCompletions[dayOfWeek]++;
        currentStreak++;
        bestStreak = Math.max(bestStreak, currentStreak);
      } else if (frozen) {
        // Keeps streak alive but doesn't add to completions
      } else {
        currentStreak = 0;
      }
    } else {
      // Not due. If completed anyway (e.g. daily checked on off-day), counts as extra?
      // Usually dailies aren't shown on off-days, but if they are, it shouldn't affect streaks negatively.
      if (completed) {
        totalCompleted++;
        weekdayCounts[dayOfWeek]++; // Adjust baseline
        weekdayCompletions[dayOfWeek]++;
        currentStreak++;
        bestStreak = Math.max(bestStreak, currentStreak);
      }
    }

    return {
      date: dStr,
      completed,
      frozen,
      rate: completed ? 1.0 : (frozen ? 0.5 : 0.0),
    };
  });

  let bestWeekday = 0;
  let bestWeekdayRate = -1;
  for (let i = 0; i < 7; i++) {
    const rate = weekdayCounts[i] === 0 ? 0 : weekdayCompletions[i] / weekdayCounts[i];
    if (rate > bestWeekdayRate) {
      bestWeekdayRate = rate;
      bestWeekday = i;
    }
  }

  return {
    month,
    days,
    completionRate: totalDue === 0 ? 0 : totalCompleted / totalDue,
    bestStreak,
    bestWeekday,
    totalCompleted,
    totalDue,
  };
}
