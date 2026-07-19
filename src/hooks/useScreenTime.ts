import { useCallback, useEffect, useState } from 'react';
import { App as CapApp } from '@capacitor/app';
import ScreenTime, { isNativeIOS, type ScreenTimeStatus } from '../native/screenTime';

const ENABLED_KEY = 'tl_screentime_enabled';

const DEFAULT_STATUS: ScreenTimeStatus = {
  supported: false,
  authorization: 'unavailable',
  selectionCount: 0,
  blocking: false,
};

/**
 * Drives the native Screen Time blocker. On non-iOS platforms every action is a
 * no-op so the same UI renders harmlessly in the browser build.
 */
export function useScreenTime() {
  const [status, setStatus] = useState<ScreenTimeStatus>(DEFAULT_STATUS);
  const [enabled, setEnabledState] = useState<boolean>(() => localStorage.getItem(ENABLED_KEY) === '1');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!isNativeIOS) return;
    try {
      setStatus(await ScreenTime.getStatus());
    } catch {
      /* plugin unavailable — leave defaults */
    }
  }, []);

  const setEnabled = useCallback(async (value: boolean) => {
    localStorage.setItem(ENABLED_KEY, value ? '1' : '0');
    setEnabledState(value);
    // Turning the feature off should immediately release any active shield.
    if (!value && isNativeIOS) {
      try { await ScreenTime.stopBlocking(); } catch { /* ignore */ }
      await refresh();
    }
  }, [refresh]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Re-sync when the app comes back to the foreground (shield state lives in the OS).
  useEffect(() => {
    if (!isNativeIOS) return;
    const handle = CapApp.addListener('resume', () => { refresh(); });
    return () => { handle.then(h => h.remove()); };
  }, [refresh]);

  const requestPermission = useCallback(async () => {
    if (!isNativeIOS) return;
    setBusy(true);
    try {
      await ScreenTime.requestAuthorization();
    } catch {
      /* user declined; refresh reflects it */
    } finally {
      await refresh();
      setBusy(false);
    }
  }, [refresh]);

  const chooseApps = useCallback(async () => {
    if (!isNativeIOS) return;
    setBusy(true);
    try {
      await ScreenTime.selectApps();
    } catch {
      /* cancelled */
    } finally {
      await refresh();
      setBusy(false);
    }
  }, [refresh]);

  /** Keep the OS shield in step with whether locking tasks are still pending. */
  const sync = useCallback(async (shouldBlock: boolean) => {
    if (!isNativeIOS || !enabled) return;
    if (status.authorization !== 'approved' || status.selectionCount === 0) return;
    try {
      if (shouldBlock && !status.blocking) {
        await ScreenTime.startBlocking();
        await refresh();
      } else if (!shouldBlock && status.blocking) {
        await ScreenTime.stopBlocking();
        await refresh();
      }
    } catch {
      /* ignore transient shield errors */
    }
  }, [enabled, status.authorization, status.selectionCount, status.blocking, refresh]);

  return { status, enabled, setEnabled, busy, requestPermission, chooseApps, sync, refresh, isNativeIOS };
}

export type ScreenTimeController = ReturnType<typeof useScreenTime>;
