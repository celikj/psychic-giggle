import { useState, useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { Purchases, LOG_LEVEL, type CustomerInfo, type PurchasesPackage } from '@revenuecat/purchases-capacitor';
import { telemetry } from '../lib/telemetry';

// Injected at build time from the VITE_REVENUECAT_APPLE_KEY env var (set from
// a GitHub Actions secret in the release build). RevenueCat's Apple key is a
// PUBLIC SDK key — safe to ship in the app; only the RevenueCat *secret* key
// must never be embedded. Empty when unset: purchases are disabled and the
// app runs as free tier (dev/web/CI).
const RC_APPLE_API_KEY = import.meta.env.VITE_REVENUECAT_APPLE_KEY ?? '';

export interface MonetizationState {
  isPremium: boolean;
  /** Convenience mirror of isPremium for gate checks: 'free' | 'premium'. */
  tier: 'free' | 'premium';
  isReady: boolean;
  packages: PurchasesPackage[];
  /** True once a getOfferings() call has come back with zero packages — lets the paywall offer a retry instead of a dead end. */
  offeringsFailed: boolean;
  offeringsLoading: boolean;
  fetchOfferings: () => Promise<void>;
  purchase: (pkg: PurchasesPackage) => Promise<boolean>;
  restore: () => Promise<boolean>;
}

export function useMonetization(): MonetizationState {
  const [isPremium, setIsPremium] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [offeringsFailed, setOfferingsFailed] = useState(false);
  const [offeringsLoading, setOfferingsLoading] = useState(false);
  const configuredRef = useRef(false);

  const fetchOfferings = useCallback(async () => {
    if (!configuredRef.current) return;
    setOfferingsLoading(true);
    try {
      const offerings = await Purchases.getOfferings();
      if (offerings.current && offerings.current.availablePackages.length !== 0) {
        setPackages(offerings.current.availablePackages);
        setOfferingsFailed(false);
      } else {
        setOfferingsFailed(true);
      }
    } catch (e) {
      console.error('Error fetching RevenueCat offerings:', e);
      setOfferingsFailed(true);
    } finally {
      setOfferingsLoading(false);
    }
  }, []);

  useEffect(() => {
    // RevenueCat is only available on native platforms
    if (!Capacitor.isNativePlatform()) {
      setIsPremium(false); // Web defaults to free for testing/showcase
      setIsReady(true);
      return;
    }

    // No RevenueCat key configured (dev/web/CI, or key not yet set) — run as
    // free tier without touching the SDK.
    if (!RC_APPLE_API_KEY || RC_APPLE_API_KEY.includes('YOUR')) {
      setIsPremium(false);
      setIsReady(true);
      return;
    }

    const init = async () => {
      try {
        await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });

        if (Capacitor.getPlatform() === 'ios') {
          await Purchases.configure({ apiKey: RC_APPLE_API_KEY });
        }
        configuredRef.current = true;

        const customerInfo = await Purchases.getCustomerInfo();
        checkPremiumStatus(customerInfo.customerInfo);

        await fetchOfferings();
      } catch (e) {
        console.error('Error initializing RevenueCat:', e);
      } finally {
        setIsReady(true);
      }
    };

    init();
  }, [fetchOfferings]);

  const checkPremiumStatus = (customerInfo: CustomerInfo) => {
    // 'premium' is the default entitlement identifier in RevenueCat, adjust if yours is different
    const premiumActive = typeof customerInfo.entitlements.active['premium'] !== 'undefined';
    setIsPremium(premiumActive);
  };

  const purchase = useCallback(async (pkg: PurchasesPackage | any): Promise<boolean> => {
    if (!Capacitor.isNativePlatform() || !pkg.identifier) {
      // Mock purchase on web for testing, or if fallback UI passed an empty package
      setIsPremium(true);
      telemetry.track('purchase', { type: pkg.packageType || 'MOCK' });
      return true;
    }
    
    try {
      const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
      checkPremiumStatus(customerInfo);
      const isNowPremium = typeof customerInfo.entitlements.active['premium'] !== 'undefined';
      if (isNowPremium) {
        telemetry.track('purchase', { type: pkg.packageType || 'NATIVE' });
      }
      return isNowPremium;
    } catch (e: any) {
      if (!e.userCancelled) {
        window.alert(`Purchase failed: ${e.message}`);
      }
      return false;
    }
  }, []);

  const restore = useCallback(async (): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) {
      setIsPremium(true);
      return true;
    }

    try {
      const { customerInfo } = await Purchases.restorePurchases();
      checkPremiumStatus(customerInfo);
      const isNowPremium = typeof customerInfo.entitlements.active['premium'] !== 'undefined';
      if (!isNowPremium) {
        window.alert('No active subscriptions found.');
      }
      return isNowPremium;
    } catch (e: any) {
      window.alert(`Restore failed: ${e.message}`);
      return false;
    }
  }, []);

  return {
    isPremium,
    tier: isPremium ? 'premium' : 'free',
    isReady,
    packages,
    offeringsFailed,
    offeringsLoading,
    fetchOfferings,
    purchase,
    restore,
  };
}
