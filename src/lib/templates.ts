/** Starter suggestions shown on an empty Dailies/Habits list, one tap to add. */

export interface DailyTemplate {
  emoji: string;
  title: string;
  subtitle: string;
  targetDays: number[];
  time?: string;
  isLocking: boolean;
}

const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];
const WEEKDAYS = [1, 2, 3, 4, 5];

export const DAILY_TEMPLATES: DailyTemplate[] = [
  { emoji: '🪥', title: 'Brush teeth', subtitle: 'Every night · 9:00 PM · locking', targetDays: EVERY_DAY, time: '21:00', isLocking: true },
  { emoji: '🧺', title: 'Do laundry', subtitle: 'Weekdays · locking', targetDays: WEEKDAYS, isLocking: true },
  { emoji: '📖', title: 'Read before bed', subtitle: 'Every night · 10:00 PM · locking', targetDays: EVERY_DAY, time: '22:00', isLocking: true },
  { emoji: '💊', title: 'Take vitamins', subtitle: 'Every morning · 8:00 AM', targetDays: EVERY_DAY, time: '08:00', isLocking: false },
  { emoji: '🐕', title: 'Walk the dog', subtitle: 'Every day', targetDays: EVERY_DAY, isLocking: false },
];

/**
 * First-run setup: each entry is a question we ask the user right after the
 * intro. Saying yes adds the matching daily with a sensible default time
 * (editable inline before adding).
 */
export interface StarterQuestion {
  emoji: string;
  /** The question shown, e.g. "Brush your teeth before bed?" */
  question: string;
  /** Daily title once added. */
  title: string;
  /** Short schedule summary shown under the question. */
  schedule: string;
  targetDays: number[];
  time: string;
  isLocking: boolean;
  /** Checked by default — reserve for the strongest defaults. */
  preselected?: boolean;
}

export const STARTER_QUESTIONS: StarterQuestion[] = [
  { emoji: '🪥', question: 'Brush your teeth before bed?', title: 'Brush teeth', schedule: 'Every night', targetDays: EVERY_DAY, time: '21:30', isLocking: true, preselected: true },
  { emoji: '🛏️', question: 'Make your bed in the morning?', title: 'Make the bed', schedule: 'Every morning', targetDays: EVERY_DAY, time: '08:00', isLocking: false },
  { emoji: '💊', question: 'Vitamins or meds to take?', title: 'Take vitamins', schedule: 'Every morning', targetDays: EVERY_DAY, time: '09:00', isLocking: false },
  { emoji: '🏃', question: 'Move your body during the day?', title: 'Exercise', schedule: 'Weekdays', targetDays: WEEKDAYS, time: '17:30', isLocking: false },
  { emoji: '🧹', question: 'A quick 10-minute tidy-up?', title: 'Tidy up', schedule: 'Every evening', targetDays: EVERY_DAY, time: '19:00', isLocking: false },
  { emoji: '📖', question: 'Read before sleep?', title: 'Read before bed', schedule: 'Every night', targetDays: EVERY_DAY, time: '22:00', isLocking: true },
];

export interface HabitTemplate {
  emoji: string;
  title: string;
  subtitle: string;
  color: string;
  targetDays: number[];
}

export const HABIT_TEMPLATES: HabitTemplate[] = [
  { emoji: '💪', title: 'Morning workout', subtitle: 'Weekdays', color: '#FF6B35', targetDays: WEEKDAYS },
  { emoji: '🧘', title: 'Meditate', subtitle: 'Every day', color: '#A78BFA', targetDays: EVERY_DAY },
  { emoji: '💧', title: 'Drink water', subtitle: 'Every day', color: '#4F9EF8', targetDays: EVERY_DAY },
  { emoji: '📵', title: 'No social media', subtitle: 'Weekdays', color: '#34D399', targetDays: WEEKDAYS },
];
