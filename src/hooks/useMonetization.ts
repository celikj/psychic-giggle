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

/**
 * Shaped like RevenueCat's packages, with the fields the paywall reads: an
 * annual plan carrying a free trial and a monthly one without, so both
 * branches of the offer copy are exercised off-device. Web/CI only — never
 * reachable on a real device, where the SDK supplies the real thing.
 */
const WEB_MOCK_PACKAGES = [
  {
    identifier: '$rc_annual',
    packageType: 'ANNUAL',
    product: {
      identifier: 'tasklock_premium_annual',
      title: 'TaskLock Premium',
      description: 'Unlimited locking tasks and routines',
      priceString: '$29.99',
      price: 29.99,
      subscriptionPeriod: 'P1Y',
      introPrice: {
        price: 0,
        priceString: '$0.00',
        cycles: 1,
        periodUnit: 'DAY',
        periodNumberOfUnits: 7,
      },
    },
  },
  {
    identifier: '$rc_monthly',
    packageType: 'MONTHLY',
    product: {
      identifier: 'tasklock_premium_monthly',
      title: 'TaskLock Premium',
      description: 'Unlimited locking tasks and routines',
      priceString: '$4.99',
      price: 4.99,
      subscriptionPeriod: 'P1M',
      introPrice: null,
    },
  },
] as unknown as PurchasesPackage[];

export interface MonetizationState {
  isPremium: boolean;
  /** Convenience mirror of isPremium for gate checks: 'free' | 'premium'. */
  tier: 'free' | 'premium';
  isReady: boolean;
  packages: PurchasesPackage[];
  /** True once a getOfferings() call has come back with zero packages — lets the paywall offer a retry instead of a dead end. */
  offeringsFailed: boolean;
  /**
   * Why the products couldn't be loaded, in the store's own words. An empty
   * paywall is unshippable — App Review sees "no products" as a broken
   * purchase flow — and the causes (no current offering, products not
   * fetchable from App Store Connect, a bad SDK key) are indistinguishable
   * from the device without this.
   */
  offeringsError: string | null;
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
  const [offeringsError, setOfferingsError] = useState<string | null>(null);
  const [offeringsLoading, setOfferingsLoading] = useState(false);
  const configuredRef = useRef(false);

  const fetchOfferings = useCallback(async () => {
    if (!configuredRef.current) return;
    setOfferingsLoading(true);

    // StoreKit product loading is racy right after launch — a cold start can
    // hand back an empty offering that a moment later resolves fine. One shot
    // turned that into a permanently empty paywall.
    let reason = '';
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const { current } = await Purchases.getOfferings();
        const available = current?.availablePackages ?? [];
        if (available.length > 0) {
          setPackages(available);
          setOfferingsFailed(false);
          setOfferingsError(null);
          setOfferingsLoading(false);
          return;
        }
        // Distinguishing these two is the difference between "fix the
        // dashboard" and "fix App Store Connect".
        reason = current
          ? `Offering "${current.identifier}" is configured but returned no purchasable products — check the products are attached to it and fetchable from App Store Connect.`
          : 'RevenueCat has no current offering configured for this app.';
      } catch (e: any) {
        reason = e?.message ? String(e.message) : String(e);
      }
      if (attempt < 3) {
        await new Promise(resolve => setTimeout(resolve, attempt * 1500));
      }
    }

    console.error('RevenueCat offerings unavailable:', reason);
    telemetry.track('offeringsUnavailable', { reason: reason.slice(0, 120) });
    setOfferingsFailed(true);
    setOfferingsError(reason);
    setOfferingsLoading(false);
  }, []);

  useEffect(() => {
    // RevenueCat is only available on native platforms
    if (!Capacitor.isNativePlatform()) {
      setIsPremium(false); // Web defaults to free for testing/showcase
      // Stand-in products so the paywall renders its real layout off-device.
      // The purchase-flow disclosures are what App Review looks at under
      // guideline 3.1.2(c), and without these the web build only ever shows
      // the "no products" fallback — leaving that screen untestable.
      setPackages(WEB_MOCK_PACKAGES);
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
    offeringsError,
    offeringsLoading,
    fetchOfferings,
    purchase,
    restore,
  };
}
