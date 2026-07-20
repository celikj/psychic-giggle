import TelemetryDeck from '@telemetrydeck/sdk';

// Replace with actual App ID from TelemetryDeck Dashboard
const TELEMETRY_APP_ID = 'YOUR-TELEMETRYDECK-APP-ID';
const IS_DEV = import.meta.env.DEV;

let td: TelemetryDeck | null = null;
let initialized = false;

export const telemetry = {
  init() {
    if (initialized) return;
    if (!TELEMETRY_APP_ID || TELEMETRY_APP_ID.includes('YOUR')) {
      console.warn('TelemetryDeck App ID not set. Telemetry is disabled.');
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
