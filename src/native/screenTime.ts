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
  selectApps(options?: { type?: string }): Promise<{ count: number }>;
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
  /**
   * Push today's lock-state snapshot to the App Group for the home screen
   * widget, and ask WidgetKit to redraw.
   */
  updateWidgetState(options: {
    date: string;
    lockingLeft: number;
    allLockingDone: boolean;
    hasLockingToday: boolean;
  }): Promise<void>;
  
  startFocus(options: { id: string; endsAt: string }): Promise<{ success: boolean }>;
  cancelFocus(options: { id: string }): Promise<{ success: boolean }>;
  updateScheduledBlocks(options: {
    enabled: boolean;
    blocks: Array<{
      id: string;
      startTime: string;
      endTime: string;
      days: number[];
      enabled: boolean;
    }>;
  }): Promise<{ success: boolean }>;
  /**
   * Natively enforce an emergency pass: after `durationMinutes`, the
   * DeviceActivity monitor re-applies the shield even if the app was killed
   * mid-pass.
   */
  startEmergencyPass(options: { durationMinutes: number }): Promise<{ success: boolean }>;
}

// Native impl lives in ios/App/App/ScreenTimePlugin.swift (Family Controls).
const ScreenTime = registerPlugin<ScreenTimePlugin>('ScreenTime');

// VITE_SCREENSHOT_MODE forces the native-iOS UI path in a plain browser —
// used only by scripts/capture-screenshots.mjs to render App Store
// screenshots with Playwright, since the real Screen Time plugin only exists
// on-device. Never set for a real TestFlight/App Store build.
export const isNativeIOS = import.meta.env.VITE_SCREENSHOT_MODE === 'true' || Capacitor.getPlatform() === 'ios';

export default ScreenTime;
