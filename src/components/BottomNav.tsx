import { CheckSquare, CalendarClock, Repeat2, ShieldOff, Settings } from 'lucide-react';

type Tab = 'tasks' | 'dailies' | 'habits' | 'blocker' | 'settings';

interface Props {
  activeTab: Tab;
  setActiveTab: (t: Tab) => void;
  allLockingDone: boolean;
  lockingLeft: number;
}

const tabs: { id: Tab; label: string; Icon: React.FC<{ className?: string }> }[] = [
  { id: 'tasks',    label: 'To-Dos',   Icon: CheckSquare },
  { id: 'dailies',  label: 'Dailies',  Icon: CalendarClock },
  { id: 'habits',   label: 'Habits',   Icon: Repeat2 },
  { id: 'blocker',  label: 'Blocker',  Icon: ShieldOff },
  { id: 'settings', label: 'Settings', Icon: Settings },
];

export default function BottomNav({ activeTab, setActiveTab, allLockingDone, lockingLeft }: Props) {
  return (
    <div
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md flex items-center justify-around px-1 pb-safe border-t border-white/5"
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
