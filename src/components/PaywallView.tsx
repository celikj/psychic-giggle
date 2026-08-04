import { useEffect } from 'react';
import { Sparkles, Check, X, Shield, Clock, ShieldAlert, Loader2, Flame } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import type { MonetizationState } from '../hooks/useMonetization';
import { LIMITS } from '../lib/monetization';
import { telemetry } from '../lib/telemetry';
import { openExternal, PRIVACY_POLICY_URL, TERMS_OF_USE_URL } from '../lib/links';
import { offerCopy } from '../lib/subscriptionCopy';

interface Props {
  monetization: MonetizationState;
  onClose: () => void;
  /** What brought the user here — 'settings' means they opened it themselves. */
  reason?: 'daily' | 'habit' | 'locking' | 'settings';
}

export default function PaywallView({ monetization, onClose, reason }: Props) {
  const { packages, purchase, restore, offeringsFailed, offeringsLoading, fetchOfferings } = monetization;

  // Paired with the 'purchase' signal, this is what turns into a conversion
  // rate — the metric that actually matters for a paywall.
  useEffect(() => {
    telemetry.track('paywallShown', { reason: reason ?? 'unknown' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePurchase = async (pkg: any) => {
    const success = await purchase(pkg);
    if (success) {
      onClose();
    }
  };

  const handleRestore = async () => {
    const success = await restore();
    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0a0f] flex flex-col animate-slide-up">
      {/* Close button */}
      <div className="absolute top-12 right-4 z-10">
        <button
          onClick={onClose}
          className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-white/50 hover:bg-white/20 active:scale-95 transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-8">
        <div className="px-6 pt-24 pb-8 text-center relative">
          <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-[#FF6B35]/20 to-transparent pointer-events-none" />
          
          <div className="w-16 h-16 bg-gradient-to-br from-[#FF6B35] to-orange-400 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(255,107,53,0.4)]">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          
          <h1 className="text-3xl font-bold text-white mb-3">TaskLock Premium</h1>
          
          {/* Only when a limit sent them here — opening it from Settings is
              browsing, not being blocked, so it doesn't lead with a red box. */}
          {reason && reason !== 'settings' && (
            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl mb-4 text-left">
              <div className="flex items-center gap-2 mb-2">
                <ShieldAlert className="w-4 h-4 text-red-400" />
                <h3 className="text-white font-bold">Free tier is limited to:</h3>
              </div>
              <ul className="text-white/60 text-xs space-y-1.5 list-disc list-inside">
                <li>Max {LIMITS.FREE_LOCKING_TASKS_PER_DAY} locking To-Dos per day</li>
                <li>Max {LIMITS.FREE_LOCKING_DAILIES} locking Dailies total</li>
              </ul>
            </div>
          )}
          
          <p className="text-white/60 text-sm leading-relaxed max-w-xs mx-auto">
            Break free from limits and unlock your full potential.
          </p>
        </div>

        <div className="px-6 space-y-4 max-w-sm mx-auto">
          <div className="bg-[#141417] border border-white/10 rounded-3xl p-6 space-y-4">
            <Feature icon={<Shield className="w-5 h-5" />} text="Unlimited locking tasks" />
            <Feature icon={<Clock className="w-5 h-5" />} text="Unlimited daily routines" />
            <Feature icon={<Sparkles className="w-5 h-5" />} text="Unlimited habits & streaks" />
            <Feature icon={<Flame className="w-5 h-5" />} text="3 streak freezes a month, not 1" />
            <Feature icon={<Check className="w-5 h-5" />} text="Support indie development" />
          </div>

          <div className="pt-6 space-y-3">
            {packages.length > 0 ? (
              packages.map(pkg => {
                const copy = offerCopy(pkg.product);
                const isAnnual = pkg.packageType === 'ANNUAL';
                return (
                  <button
                    key={pkg.identifier}
                    onClick={() => handlePurchase(pkg)}
                    aria-label={`Subscribe ${copy.planName}: ${copy.terms}`}
                    className={`w-full relative overflow-hidden rounded-2xl p-4 text-left active:scale-[0.98] transition-all border ${
                      isAnnual
                        ? 'bg-gradient-to-br from-[#FF6B35] to-orange-500 border-transparent shadow-[0_8px_24px_rgba(255,107,53,0.3)]'
                        : 'bg-[#141417] border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex justify-between items-center gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-white">{copy.planName}</p>
                          {/* Inline rather than a corner ribbon: as an overlay it
                              sat on top of the price, and the billed amount has
                              to stay the clearest thing on the row. */}
                          {isAnnual && (
                            <span className="text-[9px] font-bold text-white uppercase tracking-wider bg-white/20 px-1.5 py-0.5 rounded-md">
                              Best Value
                            </span>
                          )}
                        </div>
                        {/* Guideline 3.1.2(c): an offer is never stated without
                            the amount billed after it, and always in smaller,
                            dimmer type than the price on the right. */}
                        {copy.offerNote && (
                          <p className={`text-[11px] mt-0.5 ${isAnnual ? 'text-white/75' : 'text-white/35'}`}>
                            {copy.offerNote}
                          </p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-xl text-white leading-none">{copy.priceString}</p>
                        {copy.cadence && (
                          <p className={`text-[11px] mt-1 ${isAnnual ? 'text-white/80' : 'text-white/45'}`}>
                            {copy.cadence}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            ) : monetization.isReady ? (
              <div className="text-center p-4">
                <p className="text-white/50 text-sm">Packages are not available at this moment. Please check your App Store connection.</p>
                {Capacitor.isNativePlatform() && offeringsFailed && (
                  <button
                    onClick={() => fetchOfferings()}
                    disabled={offeringsLoading}
                    className="mt-4 flex items-center justify-center gap-1.5 mx-auto text-[#FF6B35] text-xs font-semibold disabled:opacity-50"
                  >
                    {offeringsLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Try again
                  </button>
                )}
                {/* Fallback for web testing */}
                {!Capacitor.isNativePlatform() && (
                  <button onClick={() => handlePurchase({})} className="mt-4 text-[#FF6B35] underline text-xs">Unlock (Web Mock)</button>
                )}
              </div>
            ) : (
              <div className="text-center p-4 text-white/50 text-sm">
                Loading products...
              </div>
            )}
          </div>
          
          <div className="pt-6 pb-4">
            <button
              onClick={handleRestore}
              className="w-full text-center text-xs font-semibold text-white/30 hover:text-white/50 py-2"
            >
              Restore Purchases
            </button>
            {/* Required on subscription screens (App Review Guideline 3.1.2):
                auto-renewal disclosure + working Privacy Policy and Terms links.
                Spelled out per plan, so the billed amount is stated in full
                prose as well as on the buttons — 3.1.2(c). */}
            <div className="mt-2 px-4 space-y-1.5">
              {packages.length > 0 ? (
                packages.map(pkg => {
                  const copy = offerCopy(pkg.product);
                  return (
                    <p key={pkg.identifier} className="text-center text-[10px] text-white/30 leading-relaxed">
                      <span className="font-semibold text-white/40">{copy.planName}:</span> {copy.terms}
                    </p>
                  );
                })
              ) : (
                <p className="text-center text-[10px] text-white/25 leading-relaxed">
                  Subscriptions renew automatically until cancelled. Manage or cancel
                  anytime in your App Store account settings.
                </p>
              )}
            </div>
            <div className="flex items-center justify-center gap-4 mt-2">
              <button
                onClick={() => openExternal(PRIVACY_POLICY_URL)}
                className="text-[10px] font-semibold text-white/30 hover:text-white/50 underline py-1"
              >
                Privacy Policy
              </button>
              <button
                onClick={() => openExternal(TERMS_OF_USE_URL)}
                className="text-[10px] font-semibold text-white/30 hover:text-white/50 underline py-1"
              >
                Terms of Use
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Feature({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[#FF6B35]">
        {icon}
      </div>
      <span className="text-sm font-medium text-white/90">{text}</span>
    </div>
  );
}
