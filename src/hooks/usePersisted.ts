import { useState, useEffect, useRef } from 'react';
import { Preferences } from '@capacitor/preferences';

/**
 * Like useState, but backed by Capacitor Preferences instead of React state
 * alone. On iOS this is UserDefaults — unlike WKWebView's localStorage it is
 * not subject to system storage-pressure eviction, so tasks/streaks survive
 * long-term the way they would in any other native app.
 *
 * The initial read is async; writes are held back until it resolves so a
 * slow load can never clobber previously saved data with the default value.
 * Returns [value, setValue, hydrated] — callers that gate rendering on real
 * data (vs. the empty default) should wait for `hydrated`.
 */
export function usePersisted<T>(key: string, initialValue: T): [T, (v: T | ((p: T) => T)) => void, boolean] {
  const [value, setValue] = useState<T>(initialValue);
  const [hydrated, setHydrated] = useState(false);
  const hydratedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { value: raw } = await Preferences.get({ key });
        if (!cancelled && raw !== null) {
          const parsed = JSON.parse(raw) as T;
          // Guard against corrupted storage: an array slot must hold an array.
          if (!Array.isArray(initialValue) || Array.isArray(parsed)) {
            setValue(parsed);
          }
        }
      } catch {
        /* corrupted or unavailable — keep default */
      } finally {
        if (!cancelled) {
          hydratedRef.current = true;
          setHydrated(true);
        }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    Preferences.set({ key, value: JSON.stringify(value) }).catch(() => { /* best effort */ });
  }, [key, value]);

  return [value, setValue, hydrated];
}
