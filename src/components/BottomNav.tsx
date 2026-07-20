import { CheckSquare, Repeat, Target, Shield, Settings } from 'lucide-react';
import { t, type Locale } from '../lib/i18n';

type Tab = 'tasks' | 'dailies' | 'habits' | 'blocker' | 'settings';

interface Props {
  activeTab: Tab;
  setActiveTab: (t: Tab) => void;
  allLockingDone: boolean;
  lockingLeft: number;
  locale: Locale;
}

export default function BottomNav({ activeTab, setActiveTab, allLockingDone, lockingLeft, locale }: Props) {
  const tabs = [
    { id: 'tasks',    label: t(locale, 'tasks'),    Icon: CheckSquare },
    { id: 'dailies',  label: t(locale, 'dailies'),  Icon: Repeat },
    { id: 'habits',   label: t(locale, 'habits'),   Icon: Target },
    { id: 'blocker',  label: t(locale, 'blocker'),  Icon: Shield },
    { id: 'settings', label: t(locale, 'settings'), Icon: Settings },
  ] as const;

  return (
    <div
      className="flex-shrink-0 w-full flex items-center justify-around px-1 border-t border-white/5"
      style={{ background: 'rgba(10,10,15,0.95)', backdropFilter: 'blur(20px)', paddingBottom: 'max(env(safe-area-inset-bottom), 16px)', paddingTop: '12px' }}
    >
      {tabs.map(({ id, label, Icon }) => {
        const isActive = activeTab === id;
        const showBadge = id === 'blocker' && !allLockingDone && lockingLeft > 0;
        return (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex flex-col items-center gap-1 relative px-2 transition-all duration-200 ${
              isActive ? 'opacity-100' : 'opacity-40 hover:opacity-60'
            }`}
          >
            <div className="relative">
              <Icon className={`w-6 h-6 transition-colors ${
                isActive ? (id === 'blocker' ? (allLockingDone ? 'text-green-400' : 'text-red-400') : 'text-[#FF6B35]') : 'text-white'
              }`} />
              {showBadge && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                  {lockingLeft}
                </span>
              )}
            </div>
            <span className={`text-[10px] font-semibold ${
              isActive ? (id === 'blocker' ? (allLockingDone ? 'text-green-400' : 'text-red-400') : 'text-[#FF6B35]') : 'text-white'
            }`}>
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
