import { useState, type ReactNode } from 'react';
import { PlayCircle, Bell, Download, Upload, Loader2, ShieldCheck } from 'lucide-react';
import type { NotificationsController } from '../hooks/useNotifications';
import { shareBackup, pickAndRestoreBackup } from '../lib/backup';
import pkgJson from '../../package.json';

interface Props {
  notif: NotificationsController;
  onShowIntro: () => void;
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider px-1 pt-3 pb-1 first:pt-0">
      {children}
    </p>
  );
}

function RowIcon({ children }: { children: ReactNode }) {
  return (
    <div className="w-10 h-10 rounded-xl bg-[#FF6B35]/15 border border-[#FF6B35]/25 flex items-center justify-center flex-shrink-0">
      {children}
    </div>
  );
}

function Row({
  icon, title, subtitle, onClick, busy, disabled, label,
}: {
  icon: ReactNode; title: string; subtitle: string; onClick: () => void; busy?: boolean; disabled?: boolean; label?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || busy}
      aria-label={label ?? title}
      className="w-full flex items-center gap-3 bg-[#141417] border border-white/[0.07] rounded-2xl p-4 text-left disabled:opacity-40 active:scale-[0.98] transition-transform"
    >
      <RowIcon>{icon}</RowIcon>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="text-xs text-white/40 mt-0.5">{subtitle}</p>
      </div>
      {busy && <Loader2 className="w-4 h-4 text-white/40 animate-spin flex-shrink-0" />}
    </button>
  );
}

function ToggleRow({
  icon, title, subtitle, checked, onChange, disabled,
}: {
  icon: ReactNode; title: string; subtitle: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean;
}) {
  return (
    <div className="w-full flex items-center gap-3 bg-[#141417] border border-white/[0.07] rounded-2xl p-4">
      <RowIcon>{icon}</RowIcon>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="text-xs text-white/40 mt-0.5">{subtitle}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        disabled={disabled}
        aria-label={`Toggle ${title.toLowerCase()}`}
        className={`relative w-12 h-7 rounded-full transition-colors flex-shrink-0 disabled:opacity-30 ${checked ? 'bg-[#FF6B35]' : 'bg-white/15'}`}
      >
        <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${checked ? 'left-6' : 'left-1'}`} />
      </button>
    </div>
  );
}

export default function SettingsView({ notif, onShowIntro }: Props) {
  const [busy, setBusy] = useState<'export' | 'import' | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleExport = async () => {
    setBusy('export');
    setMessage(null);
    try {
      await shareBackup();
    } catch {
      setMessage('Could not export your data. Try again.');
    } finally {
      setBusy(null);
    }
  };

  const handleImport = async () => {
    if (!window.confirm('Importing a backup replaces all current tasks, dailies, and habits on this device. Continue?')) return;
    setBusy('import');
    setMessage(null);
    try {
      await pickAndRestoreBackup();
      window.location.reload();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not import that file.');
      setBusy(null);
    }
  };

  const notifSubtitle = !notif.isNative
    ? 'Available in the iPhone app'
    : notif.permission === 'denied'
      ? 'Blocked — enable in Settings › Notifications'
      : notif.enabled
        ? 'Heads-up before timed lockouts, and a nudge if still open by evening'
        : 'Off';

  return (
    <div className="flex flex-col pb-24">
      <div className="px-5 pt-14 pb-4">
        <h1 className="text-3xl font-bold text-white mb-1">Settings</h1>
        <p className="text-white/30 text-sm">Your data, your device</p>
      </div>

      <div className="px-4 space-y-2">
        <SectionLabel>Getting Started</SectionLabel>
        <Row
          icon={<PlayCircle className="w-5 h-5 text-[#FF6B35]" />}
          title="Replay the intro"
          subtitle="See the welcome walkthrough again"
          label="Replay the intro"
          onClick={onShowIntro}
        />

        <SectionLabel>Notifications</SectionLabel>
        <ToggleRow
          icon={<Bell className="w-5 h-5 text-[#FF6B35]" />}
          title="Reminders"
          subtitle={notifSubtitle}
          checked={notif.enabled}
          disabled={!notif.isNative || notif.permission === 'denied'}
          onChange={notif.setEnabled}
        />

        <SectionLabel>Backup</SectionLabel>
        <Row
          icon={<Download className="w-5 h-5 text-[#FF6B35]" />}
          title="Export data"
          subtitle="Save a JSON backup of everything"
          onClick={handleExport}
          busy={busy === 'export'}
        />
        <Row
          icon={<Upload className="w-5 h-5 text-[#FF6B35]" />}
          title="Import data"
          subtitle="Restore tasks, dailies, and habits from a backup"
          onClick={handleImport}
          busy={busy === 'import'}
        />
        {message && <p className="text-xs text-red-400 px-2">{message}</p>}

        <SectionLabel>About</SectionLabel>
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-4 h-4 text-green-400 flex-shrink-0" />
            <p className="text-xs font-semibold text-white/70">Everything stays on this device</p>
          </div>
          <p className="text-xs text-white/40 leading-relaxed">
            Tasks, dailies, habits, and streaks are stored only on your device. Nothing is uploaded, tracked, or shared.
            Exporting a backup is the only way your data ever leaves it — and only when you choose to.
          </p>
        </div>

        <div className="flex items-center justify-between px-2 py-3 text-xs text-white/25">
          <span>TaskLock</span>
          <span>v{pkgJson.version}</span>
        </div>
      </div>
    </div>
  );
}
