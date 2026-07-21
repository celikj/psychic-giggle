import { init, trackEvent } from '@aptabase/web';
import pkgJson from '../../package.json';

// Injected at build time from the VITE_APTABASE_APP_KEY env var (set from a
// GitHub Actions secret in the release build). Empty when unset — telemetry
// then stays disabled, which is the correct behaviour for dev/web/CI builds.
const APTABASE_APP_KEY = import.meta.env.VITE_APTABASE_APP_KEY ?? '';

let initialized = false;

export const telemetry = {
  init() {
    if (initialized) return;
    if (!APTABASE_APP_KEY || APTABASE_APP_KEY.includes('YOUR')) {
      // No App Key configured (dev/web/CI) — telemetry stays off.
      return;
    }

    try {
      // Aptabase manages its own anonymous session identity — no per-device
      // id to generate or persist ourselves, unlike the previous SDK.
      init(APTABASE_APP_KEY, { appVersion: pkgJson.version });
      initialized = true;
      // The SDK never sends anything on its own — without an explicit first
      // event, sessions/DAU would show zero activity.
      this.track('appLaunched');
    } catch {
      /* SDK failed to initialize — stay off */
    }
  },

  track(eventName: string, payload?: Record<string, string>) {
    if (!initialized) return;

    try {
      trackEvent(eventName, payload);
    } catch (e) {
      console.error('Failed to send telemetry event', e);
    }
  }
};
