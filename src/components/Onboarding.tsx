import { useState } from 'react';
import { Lock, CheckSquare, Flame, Shield, ChevronRight } from 'lucide-react';

export const ONBOARDED_KEY = 'tl_onboarded';

interface Props {
  isNativeIOS: boolean;
  onDone: () => void;
}

interface Slide {
  icon: React.FC<{ className?: string; style?: React.CSSProperties }>;
  accent: string;
  title: string;
  body: string;
}

export default function Onboarding({ isNativeIOS, onDone }: Props) {
  const slides: Slide[] = [
    {
      icon: Lock,
      accent: '#FF6B35',
      title: 'Welcome to TaskLock',
      body: 'Your tasks, habits, and app blocker in one place. Distracting apps stay locked until your important work is done.',
    },
    {
      icon: CheckSquare,
      accent: '#EF4444',
      title: 'Locking Tasks',
      body: 'Add tasks like any to-do list, and mark the important ones as Locking Tasks. As long as one is unfinished, your apps stay blocked.',
    },
    {
      icon: Flame,
      accent: '#FBBF24',
      title: 'Build Habits',
      body: 'Track daily habits with streaks, best-streak records, and a 7-day view. Pick an emoji, a color, and the days you want to show up.',
    },
    {
      icon: Shield,
      accent: '#34D399',
      title: 'Real App Blocking',
      body: isNativeIOS
        ? 'On the Blocker tab, grant Screen Time access once and choose the apps to lock. Finish your locking tasks and they open — automatically.'
        : 'On iPhone, TaskLock uses Apple Screen Time to block real apps system-wide. In the browser, the Blocker tab shows your lock status.',
    },
  ];

  const [step, setStep] = useState(0);
  const last = step === slides.length - 1;
  const { icon: Icon, accent, title, body } = slides[step];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ background: '#0a0a0f' }}>
      <div className="w-full max-w-md h-full flex flex-col px-8 pt-safe" style={{ paddingTop: 'max(env(safe-area-inset-top), 24px)' }}>
        {/* Skip */}
        <div className="flex justify-end pt-4">
          <button
            onClick={onDone}
            className={`text-sm font-medium text-white/40 hover:text-white/70 px-2 py-1 transition-opacity ${last ? 'opacity-0 pointer-events-none' : ''}`}
          >
            Skip
          </button>
        </div>

        {/* Slide */}
        <div key={step} className="flex-1 flex flex-col items-center justify-center text-center animate-slide-up">
          <div
            className="w-24 h-24 rounded-[28px] flex items-center justify-center mb-8"
            style={{ backgroundColor: accent + '1f', border: `1.5px solid ${accent}55`, boxShadow: `0 12px 40px ${accent}30` }}
          >
            <Icon className="w-12 h-12" style={{ color: accent }} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">{title}</h2>
          <p className="text-white/45 text-sm leading-relaxed max-w-xs">{body}</p>
        </div>

        {/* Dots + actions */}
        <div className="pb-10" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 40px)' }}>
          <div className="flex justify-center gap-2 mb-6">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                aria-label={`Go to step ${i + 1}`}
                className="h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: i === step ? 24 : 6,
                  backgroundColor: i === step ? accent : 'rgba(255,255,255,0.15)',
                }}
              />
            ))}
          </div>
          <button
            onClick={() => (last ? onDone() : setStep(s => s + 1))}
            className="w-full flex items-center justify-center gap-1.5 py-4 rounded-2xl text-white font-semibold text-sm active:scale-95 transition-transform"
            style={{ backgroundColor: accent, boxShadow: `0 8px 24px ${accent}50` }}
          >
            {last ? 'Get Started' : 'Next'}
            {!last && <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
