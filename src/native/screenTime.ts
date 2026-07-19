import { registerPlugin, Capacitor } from '@capacitor/core';

export type AuthorizationState = 'approved' | 'denied' | 'notDetermined' | 'unavailable';

export interface ScreenTimeStatus {
  supported: boolean;
  authorization: AuthorizationState;
  selectionCount: number;
  blocking: boolean;
}

export interface ScreenTimePlugin {
  isSupported(): Promise<{ supported: boolean }>;
  getStatus(): Promise<ScreenTimeStatus>;
  requestAuthorization(): Promise<{ authorization: string }>;
  selectApps(): Promise<{ count: number }>;
  startBlocking(): Promise<{ blocking: boolean }>;
  stopBlocking(): Promise<{ blocking: boolean }>;
  /**
   * Sync the native re-arm schedules.
   * - `dates`: local YYYY-MM-DD dates that still have an incomplete locking
   *   to-do or all-day locking daily. Re-applies the shield at midnight.
   * - `timedDates`: for timed locking dailies, a map from "HH:MM" to the
   *   dates still pending at that time. Re-applies the shield at that time
   *   of day, one native schedule per distinct time.
   * Both work without the app being opened.
   */
  updateSchedule(options: {
    dates: string[];
    timedDates: Record<string, string[]>;
    enabled: boolean;
  }): Promise<{ monitoring: boolean }>;
}

// Native impl lives in ios/App/App/ScreenTimePlugin.swift (Family Controls).
const ScreenTime = registerPlugin<ScreenTimePlugin>('ScreenTime');

export const isNativeIOS = Capacitor.getPlatform() === 'ios';

export default ScreenTime;
