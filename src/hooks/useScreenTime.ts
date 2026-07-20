import { useCallback, useEffect, useState } from 'react';
import { App as CapApp } from '@capacitor/app';
import ScreenTime, { isNativeIOS, type ScreenTimeStatus } from '../native/screenTime';
import { usePersisted } from './usePersisted';

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
  const [enabled, setEnabledPersisted] = usePersisted<boolean>('tl_screentime_enabled', false);
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
    setEnabledPersisted(value);
    // Turning the feature off should immediately release any active shield.
    if (!value && isNativeIOS) {
      try { await ScreenTime.stopBlocking(); } catch { /* ignore */ }
      await refresh();
    }
  }, [refresh, setEnabledPersisted]);

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

  /**
   * Keep the native re-arm schedules in step with which upcoming days (and,
   * for timed locking dailies, which specific times of day) still have
   * incomplete locking items — so apps re-lock even if TaskLock is never
   * opened.
   */
  const updateSchedule = useCallback(async (dates: string[], timedDates: Record<string, string[]>) => {
    if (!isNativeIOS) return;
    try {
      await ScreenTime.updateSchedule({ dates, timedDates, enabled });
    } catch {
      /* older native build without the method — in-app sync still works */
    }
  }, [enabled]);

  /** Push today's lock state to the home screen widget. */
  const updateWidgetState = useCallback(async (state: {
    date: string; lockingLeft: number; allLockingDone: boolean; hasLockingToday: boolean;
  }) => {
    if (!isNativeIOS) return;
    try {
      await ScreenTime.updateWidgetState(state);
    } catch {
      /* older native build without the method — widget just stays stale */
    }
  }, []);

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

  return { status, enabled, setEnabled, busy, requestPermission, chooseApps, sync, updateSchedule, updateWidgetState, refresh, isNativeIOS };
}

export type ScreenTimeController = ReturnType<typeof useScreenTime>;
