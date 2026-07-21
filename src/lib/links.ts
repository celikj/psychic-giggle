import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

export const PRIVACY_POLICY_URL = 'https://celikj.github.io/tasklock-legal/privacy-policy.html';
/** Apple's standard EULA — the default Terms of Use for App Store apps without custom terms. */
export const TERMS_OF_USE_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

/**
 * Open a URL outside the app shell. In the native app a plain window.open
 * would navigate the WKWebView away from the SPA (no way back); the Browser
 * plugin opens an in-app Safari sheet instead.
 */
export async function openExternal(url: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      await Browser.open({ url });
      return;
    } catch {
      /* fall through to window.open */
    }
  }
  window.open(url, '_blank', 'noopener');
}
