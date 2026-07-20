import TelemetryDeck from '@telemetrydeck/sdk';

// Injected at build time from the VITE_TELEMETRYDECK_APP_ID env var (set from
// a GitHub Actions secret in the release build). Empty when unset — telemetry
// then stays disabled, which is the correct behaviour for dev/web/CI builds.
const TELEMETRY_APP_ID = import.meta.env.VITE_TELEMETRYDECK_APP_ID ?? '';
const IS_DEV = import.meta.env.DEV;

let td: TelemetryDeck | null = null;
let initialized = false;

export const telemetry = {
  init() {
    if (initialized) return;
    if (!TELEMETRY_APP_ID || TELEMETRY_APP_ID.includes('YOUR')) {
      // No App ID configured (dev/web/CI) — telemetry stays off.
      return;
    }
    
    td = new TelemetryDeck({
      appID: TELEMETRY_APP_ID,
      clientUser: 'anonymous',
      testMode: IS_DEV,
    });
    
    initialized = true;
  },

  track(eventName: string, payload?: Record<string, string>) {
    if (!initialized || !td) return;
    
    try {
      td.signal(eventName, payload);
    } catch (e) {
      console.error('Failed to send telemetry signal', e);
    }
  }
};
