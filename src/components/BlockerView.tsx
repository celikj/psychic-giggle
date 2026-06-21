import { useState, useEffect, useRef } from 'react';
import { Lock, Unlock, Plus, Trash2, Globe, X, ExternalLink } from 'lucide-react';
import type { Store } from '../hooks/useStore';

interface Props { store: Store }

export default function BlockerView({ store }: Props) {
  const { blockedApps, allLockingDone, lockingLeft, todayTasks, completedToday, addBlockedApp, removeBlockedApp } = store;

  const [lockedApp, setLockedApp] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🌐');
  const [url, setUrl] = useState('');
  const [celebrated, setCelebrated] = useState(false);
  const prevDone = useRef(allLockingDone);

  useEffect(() => {
    if (!prevDone.current && allLockingDone) {
      setCelebrated(true);
      setTimeout(() => setCelebrated(false), 3000);
    }
    prevDone.current = allLockingDone;
  }, [allLockingDone]);

  const lockingTasks = todayTasks.filter(t => t.isLocking);
  const lockingDone = lockingTasks.filter(t => t.completed).length;
  const lockingPct = lockingTasks.length === 0 ? 100 : Math.round((lockingDone / lockingTasks.length) * 100);

  const handleAppClick = (appId: string, appUrl: string) => {
    if (allLockingDone) {
      window.open(appUrl, '_blank', 'noopener,noreferrer');
    } else {
      setLockedApp(appId);
    }
  };

  const handleAddApp = () => {
    if (!name.trim() || !url.trim()) return;
    const normalized = url.startsWith('http') ? url : `https://${url}`;
    addBlockedApp(name.trim(), icon, normalized);
    setName('');
    setIcon('🌐');
    setUrl('');
    setShowAdd(false);
  };

  const PRESET_ICONS = ['📸', '🐦', '▶️', '🎵', '🟠', '💼', '🎮', '📰', '🛒', '📧', '🌐', '💬'];

  return (
    <div className="flex flex-col pb-24">
      {/* Celebration overlay */}
      {celebrated && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-green-500/20 border border-green-400/40 backdrop-blur-xl rounded-3xl px-10 py-8 text-center animate-celebrate">
            <div className="text-6xl mb-3">🎉</div>
            <p className="text-white font-bold text-xl">Apps Unlocked!</p>
            <p className="text-green-300/70 text-sm mt-1">All locking tasks done</p>
          </div>
        </div>
      )}

      {/* Locked app modal */}
      {lockedApp && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
          onClick={() => setLockedApp(null)}
        >
          <div
            className="w-full max-w-md bg-[#1a1a20] rounded-t-3xl border border-white/10 p-8 pb-12 text-center animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-16 h-16 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center mx-auto mb-4 pulse-red">
              <Lock className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">App Locked</h2>
            <p className="text-white/50 text-sm mb-6">
              Complete <span className="text-white font-semibold">{lockingLeft} more locking task{lockingLeft !== 1 ? 's' : ''}</span> to unlock your apps.
            </p>
            {/* Progress */}
            <div className="bg-white/5 rounded-2xl p-4 mb-6">
              <div className="flex justify-between text-xs text-white/40 mb-2">
                <span>Locking tasks</span>
                <span>{lockingDone} / {lockingTasks.length}</span>
              </div>
              <div className="h-2 bg-white/8 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#FF6B35] transition-all duration-700"
                  style={{ width: `${lockingPct}%` }}
                />
              </div>
            </div>
            <button
              onClick={() => setLockedApp(null)}
              className="w-full py-4 rounded-2xl bg-[#FF6B35] text-white font-semibold active:scale-95 transition-transform"
            >
              Back to Tasks
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="px-5 pt-14 pb-6">
        <div className="flex items-center gap-3 mb-2">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
              allLockingDone
                ? 'bg-green-500/15 border border-green-500/30 pulse-green'
                : 'bg-red-500/15 border border-red-500/30 pulse-red'
            }`}
          >
            {allLockingDone
              ? <Unlock className="w-6 h-6 text-green-400" />
              : <Lock className="w-6 h-6 text-red-400" />
            }
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">
              {allLockingDone ? 'Apps Unlocked' : 'Apps Locked'}
            </h1>
            <p className="text-sm text-white/40">
              {allLockingDone
                ? 'Great job! All your apps are accessible.'
                : `Complete ${lockingLeft} more task${lockingLeft !== 1 ? 's' : ''} to unlock`}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        {!allLockingDone && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-white/30 mb-2">
              <span>Progress toward unlock</span>
              <span>{lockingPct}%</span>
            </div>
            <div className="h-2 bg-white/8 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${lockingPct}%`,
                  background: lockingPct === 100 ? '#34D399' : 'linear-gradient(90deg, #FF6B35, #FBBF24)',
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-white/20 mt-1.5">
              <span>{completedToday} / {todayTasks.length} tasks done today</span>
              <span>{lockingDone} / {lockingTasks.length} locking</span>
            </div>
          </div>
        )}
      </div>

      {/* App list */}
      <div className="px-4 space-y-2">
        <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest px-1 mb-3">
          Blocked Apps ({blockedApps.length})
        </p>

        {blockedApps.length === 0 && !showAdd && (
          <div className="text-center py-12 animate-slide-up">
            <div className="text-5xl mb-3">🛡️</div>
            <p className="text-white/30 text-sm font-medium">No apps blocked yet</p>
            <p className="text-white/20 text-xs mt-1">Add distracting apps to block them</p>
          </div>
        )}

        {blockedApps.map((app, i) => (
          <div
            key={app.id}
            className={`flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 animate-slide-in ${
              allLockingDone
                ? 'bg-[#141417] border-white/[0.07]'
                : 'bg-[#0f0f12] border-white/[0.04] opacity-75'
            }`}
            style={{ animationDelay: `${i * 40}ms` }}
          >
            {/* App icon */}
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 border transition-all ${
                allLockingDone ? 'border-white/10 bg-white/5' : 'border-white/5 bg-white/[0.02]'
              }`}
            >
              {app.icon}
            </div>

            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${allLockingDone ? 'text-white' : 'text-white/50'}`}>
                {app.name}
              </p>
              <p className="text-xs text-white/25 truncate mt-0.5">{app.url}</p>
            </div>

            {/* Status badge */}
            <div className={`flex items-center gap-1 px-2.5 py-1 rounded-xl border text-xs font-semibold flex-shrink-0 ${
              allLockingDone
                ? 'bg-green-500/10 border-green-500/20 text-green-400'
                : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}>
              {allLockingDone
                ? <><Unlock className="w-3 h-3" /> Open</>
                : <><Lock className="w-3 h-3" /> Locked</>
              }
            </div>

            {/* Open / locked button */}
            <button
              onClick={() => handleAppClick(app.id, app.url)}
              className={`p-2 rounded-xl transition-all active:scale-90 ${
                allLockingDone
                  ? 'bg-white/10 hover:bg-white/15 text-white'
                  : 'bg-white/5 text-white/20'
              }`}
            >
              {allLockingDone ? <ExternalLink className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            </button>

            {/* Delete */}
            <button
              onClick={() => removeBlockedApp(app.id)}
              className="p-1.5 rounded-xl hover:bg-white/10 transition-colors"
            >
              <Trash2 className="w-4 h-4 text-white/15 hover:text-red-400 transition-colors" />
            </button>
          </div>
        ))}

        {/* Add app form */}
        {showAdd && (
          <div className="bg-[#141417] rounded-2xl p-4 border border-[#FF6B35]/30 space-y-4 animate-slide-up">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-white">Add App to Block</span>
              <button onClick={() => setShowAdd(false)} className="p-1 rounded-lg hover:bg-white/10">
                <X className="w-4 h-4 text-white/30" />
              </button>
            </div>

            <div className="flex gap-2">
              <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl flex-shrink-0">
                {icon}
              </div>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="App name (e.g. Instagram)"
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 text-white placeholder-white/25 text-sm font-medium outline-none"
              />
            </div>

            {/* Icon picker */}
            <div>
              <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-2">Icon</p>
              <div className="grid grid-cols-6 gap-1.5">
                {PRESET_ICONS.map(e => (
                  <button
                    key={e}
                    onClick={() => setIcon(e)}
                    className={`w-full aspect-square rounded-xl text-xl flex items-center justify-center transition-all ${
                      icon === e ? 'bg-white/15 scale-110' : 'bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            {/* URL input */}
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-3">
              <Globe className="w-4 h-4 text-white/30 flex-shrink-0" />
              <input
                type="text"
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddApp()}
                placeholder="URL (e.g. instagram.com)"
                className="flex-1 bg-transparent text-white placeholder-white/25 text-sm font-medium outline-none"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowAdd(false)}
                className="flex-1 py-3 rounded-xl bg-white/5 text-white/50 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleAddApp}
                disabled={!name.trim() || !url.trim()}
                className="flex-1 py-3 rounded-xl bg-[#FF6B35] text-white text-sm font-semibold disabled:opacity-30 active:scale-95 transition-transform"
              >
                Block App
              </button>
            </div>
          </div>
        )}
      </div>

      {/* FAB */}
      {!showAdd && (
        <div className="px-4 mt-4">
          <button
            onClick={() => setShowAdd(true)}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-[#FF6B35] text-white font-semibold text-sm active:scale-95 transition-transform"
            style={{ boxShadow: '0 8px 24px rgba(255,107,53,0.35)' }}
          >
            <Plus className="w-5 h-5" />
            Block an App
          </button>
        </div>
      )}
    </div>
  );
}
