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
}

// Native impl lives in ios/App/App/ScreenTimePlugin.swift (Family Controls).
const ScreenTime = registerPlugin<ScreenTimePlugin>('ScreenTime');

export const isNativeIOS = Capacitor.getPlatform() === 'ios';

export default ScreenTime;
