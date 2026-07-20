import { Sparkles, Check, X, Shield, Clock, ShieldAlert } from 'lucide-react';
import type { MonetizationState } from '../hooks/useMonetization';
import { LIMITS } from '../lib/monetization';

interface Props {
  monetization: MonetizationState;
  onClose: () => void;
  reason?: 'daily' | 'habit' | 'locking';
}

export default function PaywallView({ monetization, onClose, reason }: Props) {
  const { packages, purchase, restore } = monetization;

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
          
          {reason && (
            <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-full mb-4">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              <span className="text-xs font-semibold text-red-400">
                {reason === 'daily' && `Free tier is limited to ${LIMITS.FREE_DAILIES} dailies`}
                {reason === 'habit' && `Free tier is limited to ${LIMITS.FREE_HABITS} habits`}
                {reason === 'locking' && `Free tier is limited to ${LIMITS.FREE_LOCKING_TASKS_PER_DAY} locking task per day`}
              </span>
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
            <Feature icon={<Check className="w-5 h-5" />} text="Support indie development" />
          </div>

          <div className="pt-6 space-y-3">
            {packages.length > 0 ? (
              packages.map(pkg => (
                <button
                  key={pkg.identifier}
                  onClick={() => handlePurchase(pkg)}
                  className={`w-full relative overflow-hidden rounded-2xl p-4 text-left active:scale-[0.98] transition-all border ${
                    pkg.packageType === 'ANNUAL'
                      ? 'bg-gradient-to-br from-[#FF6B35] to-orange-500 border-transparent shadow-[0_8px_24px_rgba(255,107,53,0.3)]'
                      : 'bg-[#141417] border-white/10 hover:border-white/20'
                  }`}
                >
                  {pkg.packageType === 'ANNUAL' && (
                    <div className="absolute top-0 right-0 bg-white/20 px-3 py-1 rounded-bl-xl rounded-tr-xl">
                      <span className="text-[10px] font-bold text-white uppercase tracking-wider">Best Value</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <div>
                      <p className={`font-semibold ${pkg.packageType === 'ANNUAL' ? 'text-white' : 'text-white'}`}>
                        {pkg.product.title}
                      </p>
                      <p className={`text-xs mt-0.5 ${pkg.packageType === 'ANNUAL' ? 'text-white/80' : 'text-white/40'}`}>
                        {pkg.product.description}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold text-lg ${pkg.packageType === 'ANNUAL' ? 'text-white' : 'text-white'}`}>
                        {pkg.product.priceString}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="space-y-3">
                {/* Fallback mock UI for web / offline */}
                <button
                  onClick={() => handlePurchase({})}
                  className="w-full bg-gradient-to-br from-[#FF6B35] to-orange-500 rounded-2xl p-4 active:scale-[0.98] transition-all shadow-[0_8px_24px_rgba(255,107,53,0.3)] text-left flex justify-between items-center"
                >
                  <div>
                    <p className="font-semibold text-white">Annual Premium</p>
                    <p className="text-xs text-white/80 mt-0.5">7-day free trial</p>
                  </div>
                  <p className="font-bold text-lg text-white">$29.99/yr</p>
                </button>
                <button
                  onClick={() => handlePurchase({})}
                  className="w-full bg-[#141417] border border-white/10 rounded-2xl p-4 active:scale-[0.98] transition-all text-left flex justify-between items-center"
                >
                  <div>
                    <p className="font-semibold text-white">Monthly Premium</p>
                  </div>
                  <p className="font-bold text-lg text-white">$4.99/mo</p>
                </button>
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
