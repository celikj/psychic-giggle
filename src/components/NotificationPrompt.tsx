import { Bell } from 'lucide-react';
import type { NotificationsController } from '../hooks/useNotifications';

interface Props {
  /** The timed locking daily that just triggered this prompt. */
  daily: { title: string; time: string };
  notif: NotificationsController;
  onDone: () => void;
}

function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

/**
 * Asks for notification permission at the one moment it's obviously useful —
 * right after creating a timed locking daily — instead of a Settings toggle
 * nobody finds. Shown at most once (caller gates that), so this isn't a
 * recurring interruption.
 */
export default function NotificationPrompt({ daily, notif, onDone }: Props) {
  const handleEnable = async () => {
    await notif.setEnabled(true);
    onDone();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 animate-slide-up" onClick={onDone}>
      <div
        className="w-full max-w-md bg-[#141417] rounded-t-3xl p-6 border-t border-white/10"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 24px)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-10 rounded-2xl bg-[#FF6B35]/15 border border-[#FF6B35]/25 flex items-center justify-center mb-4">
          <Bell className="w-5 h-5 text-[#FF6B35]" />
        </div>
        <h2 className="text-lg font-bold text-white mb-1.5">Get a heads-up?</h2>
        <p className="text-sm text-white/50 leading-relaxed mb-6">
          "{daily.title}" locks your apps at {formatTime(daily.time)}. TaskLock can
          nudge you 15 minutes before, so it isn't a surprise.
        </p>
        <div className="flex gap-2">
          <button
            onClick={onDone}
            className="flex-1 py-3 rounded-xl bg-white/5 text-white/50 text-sm font-semibold"
          >
            Not now
          </button>
          <button
            onClick={handleEnable}
            className="flex-1 py-3 rounded-xl bg-[#FF6B35] text-white text-sm font-semibold active:scale-95 transition-transform"
          >
            Remind me
          </button>
        </div>
      </div>
    </div>
  );
}
