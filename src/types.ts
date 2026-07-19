export type Priority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  date: string;
  priority: Priority;
  isLocking: boolean;
}

export interface Daily {
  id: string;
  title: string;
  emoji: string;
  /** Weekdays this daily is due (0 = Sunday). */
  targetDays: number[];
  /**
   * Optional "HH:MM" start time. A locking daily with a time gates apps only
   * from this time until it's checked off; without one it gates all day.
   */
  time?: string;
  isLocking: boolean;
  /** Barcode that must be scanned with the camera to check this daily off. */
  barcode?: string;
  completedDates: string[];
}

export interface Habit {
  id: string;
  title: string;
  emoji: string;
  completedDates: string[];
  color: string;
  targetDays: number[];
}
