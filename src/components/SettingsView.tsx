import { useState, type ReactNode } from 'react';
import { PlayCircle, Bell, Download, Upload, Loader2, ShieldCheck, Flame, CheckCircle2, CalendarDays, Cloud, Globe } from 'lucide-react';
import type { NotificationsController } from '../hooks/useNotifications';
import type { Store } from '../hooks/useStore';
import type { MonetizationState } from '../hooks/useMonetization';
import { shareBackup, pickAndRestoreBackup } from '../lib/backup';
import { t } from '../lib/i18n';
import pkgJson from '../../package.json';

interface Props {
  store: Store;
  notif: NotificationsController;
  monetization: MonetizationState;
  onShowIntro: () => void;
  onShowPaywall?: () => void;
}

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** Last-7-days completions bar chart + headline numbers. */
function WeeklyStatsCard({ store }: { store: Store }) {
  const stats = store.getWeeklyStats();
  const max = Math.max(1, ...stats.days.map(d => d.total));

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#141417] p-4">
      <div className="flex items-end gap-2 h-24" role="img" aria-label={`Completions per day this week: ${stats.days.map(d => d.total).join(', ')}`}>
        {stats.days.map(d => {
          const isToday = d.date === store.today;
          const weekday = new Date(d.date + 'T00:00:00').getDay();
          return (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
              {d.total > 0 && (
                <span className={`text-[9px] font-bold ${isToday ? 'text-[#FF6B35]' : 'text-white/40'}`}>{d.total}</span>
              )}
              <div
                className="w-full rounded-md transition-all duration-500"
                style={{
                  height: d.total === 0 ? '3px' : `${Math.max(8, (d.total / max) * 100)}%`,
                  background: d.total === 0
                    ? 'rgba(255,255,255,0.08)'
                    : isToday
                      ? 'linear-gradient(180deg, #FF6B35, #FBBF24)'
                      : 'rgba(255,107,53,0.45)',
                }}
              />
              <span className={`text-[9px] font-semibold ${isToday ? 'text-[#FF6B35]' : 'text-white/25'}`}>
                {DAY_LETTERS[weekday]}
              </span>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-white/5">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
            <span className="text-lg font-bold text-white">{stats.totalCompletions}</span>
          </div>
          <p className="text-[10px] text-white/30 font-medium mt-0.5">Done this week</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-lg font-bold text-white">{stats.bestStreak}</span>
          </div>
          <p className="text-[10px] text-white/30 font-medium mt-0.5">Best streak</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <CalendarDays className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-lg font-bold text-white">{stats.activeDays}<span className="text-white/30 text-xs font-semibold">/7</span></span>
          </div>
          <p className="text-[10px] text-white/30 font-medium mt-0.5">Active days</p>
        </div>
      </div>
    </div>
  );
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

export default function SettingsView({ store, notif, monetization, onShowIntro }: Props) {
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
        <h1 className="text-3xl font-bold text-white mb-1">{t(store.locale, 'settingsTitle')}</h1>
        <p className="text-white/30 text-sm">{t(store.locale, 'settingsSubtitle')}</p>
      </div>

      <div className="px-4 space-y-2">
        <SectionLabel>This Week</SectionLabel>
        <WeeklyStatsCard store={store} />

        <SectionLabel>Streak Insurance</SectionLabel>
        <div className="rounded-2xl border border-white/[0.07] bg-[#141417] p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <RowIcon><Flame className="w-5 h-5 text-orange-400" /></RowIcon>
            <div>
              <p className="text-sm font-semibold text-white">Streak Freezes</p>
              <p className="text-xs text-white/40 mt-0.5">Automatically rescues a missed day</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-white">
              {Math.max(0, (monetization.tier === 'premium' ? 3 : 1) - store.freezesUsed)}
              <span className="text-white/40 font-medium"> / {monetization.tier === 'premium' ? 3 : 1}</span>
            </p>
            <p className="text-[10px] text-white/40 mt-0.5 uppercase tracking-wider">Remaining</p>
          </div>
        </div>

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

        <SectionLabel>Localization</SectionLabel>
        <div className="rounded-2xl border border-white/[0.07] bg-[#141417] p-4 flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <RowIcon><Globe className="w-5 h-5 text-indigo-400" /></RowIcon>
            <p className="text-sm font-semibold text-white">{t(store.locale, 'language')}</p>
          </div>
          <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl">
            <button 
              onClick={() => store.setLocale('en')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${store.locale === 'en' ? 'bg-indigo-500 text-white' : 'text-white/40 hover:text-white'}`}
            >
              EN
            </button>
            <button 
              onClick={() => store.setLocale('tr')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${store.locale === 'tr' ? 'bg-indigo-500 text-white' : 'text-white/40 hover:text-white'}`}
            >
              TR
            </button>
          </div>
        </div>

        <SectionLabel>Backup</SectionLabel>
        
        {/* Auto Backup Info */}
        <div className="rounded-2xl border border-white/[0.07] bg-[#141417] p-4 flex items-center gap-3 mb-2">
          <RowIcon><Cloud className="w-5 h-5 text-sky-400" /></RowIcon>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">Auto Backup</p>
            <p className="text-xs text-white/40 mt-0.5 truncate">
              {store.lastBackup 
                ? `Last saved: ${new Date(store.lastBackup).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}`
                : 'Waiting for first save...'}
            </p>
          </div>
          <div className="text-[10px] font-bold text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded uppercase tracking-wider">iCloud</div>
        </div>

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
