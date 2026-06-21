export type Priority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  date: string;
  priority: Priority;
  isLocking: boolean;
}

export interface Habit {
  id: string;
  title: string;
  emoji: string;
  completedDates: string[];
  color: string;
  targetDays: number[];
}

export interface BlockedApp {
  id: string;
  name: string;
  icon: string;
  url: string;
}
