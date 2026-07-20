import { useCallback, useEffect, useState } from 'react';
import { Capacitor, type PermissionState } from '@capacitor/core';
import type { LocalNotificationSchema } from '@capacitor/local-notifications';
import { usePersisted } from './usePersisted';
import type { Daily } from '../types';

const isNative = Capacitor.isNativePlatform();

/** Fixed id for tonight's "still locked" nudge — at most one is ever pending. */
const EVENING_NUDGE_ID = 2_000_000_000;
/** Fixed id for the "emergency pass ended" note — at most one is ever pending. */
const EMERGENCY_END_ID = 2_000_000_001;
const REMINDER_LEAD_MINUTES = 15;

/** Deterministic 0..99,999,999 id from a daily's uuid, so re-syncing reschedules the same slot instead of piling up duplicates. */
function hashId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % 100_000_000;
}

function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

/**
 * Local reminders for the app-blocking side of TaskLock:
 * - a weekly heads-up N minutes before each timed locking daily starts
 *   gating apps, so it isn't a surprise
 * - a one-shot nudge tonight if locking items are still open by evening
 *
 * Both are recomputed from scratch on every sync (cancel everything this app
 * has scheduled, then reschedule the current set) — simpler and more
 * robust than trying to diff a small, cheap-to-rebuild notification set.
 */
export function useNotifications() {
  const [enabled, setEnabledPersisted] = usePersisted('tl_notifications_enabled', false);
  const [permission, setPermission] = useState<PermissionState>('prompt');

  const refreshPermission = useCallback(async () => {
    if (!isNative) return;
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      const { display } = await LocalNotifications.checkPermissions();
      setPermission(display);
    } catch { /* plugin unavailable */ }
  }, []);

  useEffect(() => { refreshPermission(); }, [refreshPermission]);

  const setEnabled = useCallback(async (value: boolean) => {
    if (!value) {
      setEnabledPersisted(false);
      return;
    }
    if (!isNative) {
      setEnabledPersisted(true); // no-op on web, but keep the toggle consistent
      return;
    }
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      const { display } = await LocalNotifications.requestPermissions();
      setPermission(display);
      setEnabledPersisted(display === 'granted');
    } catch {
      setEnabledPersisted(false);
    }
  }, [setEnabledPersisted]);

  /** Rebuilds every notification this app owns from the current app state. */
  const resync = useCallback(async (dailies: Daily[], hasOpenLockTonight: boolean, emergencyPassExpiresAt?: number | null) => {
    if (!isNative) return;
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length) {
        await LocalNotifications.cancel({ notifications: pending.notifications });
      }
      if (!enabled || permission !== 'granted') return;

      const notifications: LocalNotificationSchema[] = [];

      for (const d of dailies.filter(d => d.isLocking && d.time)) {
        const [h, m] = d.time!.split(':').map(Number);
        let leadMinutes = h * 60 + m - REMINDER_LEAD_MINUTES;
        let dayOffset = 0;
        if (leadMinutes < 0) { leadMinutes += 24 * 60; dayOffset = -1; }
        const leadHour = Math.floor(leadMinutes / 60);
        const leadMinute = leadMinutes % 60;

        for (const jsWeekday of d.targetDays) {
          const shifted = ((jsWeekday + dayOffset) % 7 + 7) % 7;
          notifications.push({
            id: hashId(d.id) * 10 + shifted,
            title: `${d.emoji} ${d.title} in ${REMINDER_LEAD_MINUTES} min`,
            body: `Apps lock at ${formatTime(d.time!)} until it's done.`,
            schedule: { on: { weekday: (shifted + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7, hour: leadHour, minute: leadMinute } },
          });
        }
      }

      if (hasOpenLockTonight) {
        const at = new Date();
        at.setHours(20, 0, 0, 0);
        if (at.getTime() > Date.now()) {
          notifications.push({
            id: EVENING_NUDGE_ID,
            title: 'Still locked',
            body: "You've got locking items open tonight — finish them to unlock your apps.",
            schedule: { at },
          });
        }
      }

      // Fires even if the app is closed when the pass runs out, so the
      // re-lock isn't silent.
      if (emergencyPassExpiresAt && emergencyPassExpiresAt > Date.now()) {
        notifications.push({
          id: EMERGENCY_END_ID,
          title: 'Emergency pass ended',
          body: 'Your apps are locked again — finish your locking items to unlock.',
          schedule: { at: new Date(emergencyPassExpiresAt) },
        });
      }

      if (notifications.length) await LocalNotifications.schedule({ notifications });
    } catch {
      /* best effort — in-app blocking still works without reminders */
    }
  }, [enabled, permission]);

  return { enabled, setEnabled, permission, isNative, resync };
}

export type NotificationsController = ReturnType<typeof useNotifications>;
