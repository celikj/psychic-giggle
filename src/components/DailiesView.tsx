import { useState } from 'react';
import { Plus, Flame, X, Lock, Clock, ScanBarcode } from 'lucide-react';
import type { Store } from '../hooks/useStore';
import type { Daily } from '../types';
import BarcodeScanner from './BarcodeScanner';
import ConfirmDeleteButton from './ConfirmDeleteButton';
import EditButton from './EditButton';
import { hapticTick } from '../lib/haptics';
import { DAILY_TEMPLATES } from '../lib/templates';

interface Props { store: Store }

const PRESET_EMOJIS = ['🪥', '🧺', '🍽️', '💊', '🚿', '🐕', '🛏️', '🌱', '📖', '🏃', '🧹', '🎯'];
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export default function DailiesView({ store }: Props) {
  const { dailies, today, toggleDaily, addDaily, editDaily, deleteDaily, getDailyStreak, getLast7Days } = store;

  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState('🎯');
  const [targetDays, setTargetDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [useTime, setUseTime] = useState(false);
  const [time, setTime] = useState('21:00');
  const [isLocking, setIsLocking] = useState(false);
  const [barcode, setBarcode] = useState<string | null>(null);

  // Scanner: 'capture' registers a code in the add form; a Daily verifies one.
  const [scanTarget, setScanTarget] = useState<'capture' | Daily | null>(null);

  const last7 = getLast7Days();
  const todayWeekday = new Date(today + 'T00:00:00').getDay();
  const dueToday = dailies.filter(d => d.targetDays.includes(todayWeekday));
  const otherDays = dailies.filter(d => !d.targetDays.includes(todayWeekday));
  const doneCount = dueToday.filter(d => d.completedDates.includes(today)).length;
  const pct = dueToday.length === 0 ? 0 : Math.round((doneCount / dueToday.length) * 100);

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setEmoji('🎯');
    setTargetDays([0, 1, 2, 3, 4, 5, 6]);
    setUseTime(false);
    setTime('21:00');
    setIsLocking(false);
    setBarcode(null);
    setShowAdd(false);
  };

  const startEdit = (daily: Daily) => {
    setEditingId(daily.id);
    setTitle(daily.title);
    setEmoji(daily.emoji);
    setTargetDays(daily.targetDays);
    setUseTime(!!daily.time);
    setTime(daily.time ?? '21:00');
    setIsLocking(daily.isLocking);
    setBarcode(daily.barcode ?? null);
    setShowAdd(true);
  };

  const handleSubmit = () => {
    if (!title.trim() || targetDays.length === 0) return;
    const payload = {
      title: title.trim(),
      emoji,
      targetDays: [...targetDays].sort(),
      time: useTime ? time : undefined,
      isLocking,
      barcode: barcode ?? undefined,
    };
    if (editingId) {
      editDaily(editingId, payload);
    } else {
      addDaily(payload);
    }
    resetForm();
  };

  const handleCheck = (daily: Daily) => {
    const done = daily.completedDates.includes(today);
    // Unchecking is always free; checking a barcode daily requires the scan.
    if (!done && daily.barcode) {
      setScanTarget(daily);
      return;
    }
    hapticTick();
    toggleDaily(daily.id);
  };

  const toggleDay = (d: number) => {
    setTargetDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  };

  const renderCard = (daily: Daily, i: number, due: boolean) => {
    const done = daily.completedDates.includes(today);
    const streak = getDailyStreak(daily);
    return (
      <div
        key={daily.id}
        className={`bg-[#141417] border border-white/[0.07] rounded-2xl p-4 animate-slide-in ${due ? '' : 'opacity-50'}`}
        style={{ animationDelay: `${i * 30}ms` }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => due && handleCheck(daily)}
            disabled={!due}
            aria-label={
              !due ? `${daily.title} is not due today`
                : done ? `Uncheck "${daily.title}" for today`
                : daily.barcode ? `Scan barcode to check off "${daily.title}"`
                : `Check off "${daily.title}" for today`
            }
            className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200 active:scale-90 ${
              done ? 'bg-[#FF6B35]' : 'bg-white/5 border border-white/10'
            }`}
            style={done ? { boxShadow: '0 4px 12px rgba(255,107,53,0.35)' } : {}}
          >
            {done
              ? <span className="text-base text-white">✓</span>
              : daily.barcode
                ? <ScanBarcode className="w-4 h-4 text-white/50" />
                : <span className="text-base text-white/40">○</span>}
          </button>

          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 bg-white/5 border border-white/10"
          >
            {daily.emoji}
          </div>

          <button onClick={() => startEdit(daily)} aria-label={`Edit daily "${daily.title}"`} className="flex-1 min-w-0 text-left">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-semibold truncate ${done ? 'text-white/40 line-through' : 'text-white'}`}>
                {daily.title}
              </span>
              {streak > 0 && (
                <div className="flex items-center gap-0.5 bg-orange-500/15 border border-orange-500/25 px-1.5 py-0.5 rounded-lg flex-shrink-0">
                  <Flame className="w-3 h-3 text-orange-400" />
                  <span className="text-[10px] font-bold text-orange-400">{streak}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {daily.time && (
                <span className="flex items-center gap-1 text-[10px] font-semibold text-sky-300/80 bg-sky-500/10 border border-sky-500/20 px-1.5 py-0.5 rounded-lg">
                  <Clock className="w-3 h-3" /> {formatTime(daily.time)}
                </span>
              )}
              {daily.isLocking && (
                <span className="flex items-center gap-1 text-[10px] font-semibold text-red-400 bg-red-500/15 border border-red-500/25 px-1.5 py-0.5 rounded-lg">
                  <Lock className="w-3 h-3" /> {daily.time ? `Locks from ${formatTime(daily.time)}` : 'Locks all day'}
                </span>
              )}
              {daily.barcode && (
                <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-300/80 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-lg">
                  <ScanBarcode className="w-3 h-3" /> Scan to check
                </span>
              )}
            </div>
          </button>

          <EditButton label={`Edit daily "${daily.title}"`} onClick={() => startEdit(daily)} />
          <ConfirmDeleteButton
            label={`Delete daily "${daily.title}"`}
            warnLocking={due && daily.isLocking && !done}
            onConfirm={() => deleteDaily(daily.id)}
          />
        </div>

        {/* Last 7 days */}
        <div className="flex gap-1.5 mt-3 pt-3 border-t border-white/5">
          {last7.map(dateStr => {
            const d = new Date(dateStr + 'T00:00:00');
            const scheduled = daily.targetDays.includes(d.getDay());
            const dayDone = daily.completedDates.includes(dateStr);
            const isToday = dateStr === today;
            return (
              <div key={dateStr} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[9px] text-white/20 font-medium">{DAY_LABELS[d.getDay()]}</span>
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: dayDone ? '#FF6B35' : scheduled ? 'rgba(255,255,255,0.06)' : 'transparent',
                    border: scheduled ? 'none' : '1px dashed rgba(255,255,255,0.08)',
                    boxShadow: isToday ? '0 0 0 1.5px rgba(255,255,255,0.25)' : undefined,
                  }}
                >
                  {dayDone && <span className="text-[9px] text-white font-bold">✓</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col pb-24">
      {/* Verify / capture scanner */}
      {scanTarget && (
        <BarcodeScanner
          title={scanTarget === 'capture' ? 'Register a barcode' : `Verify: ${scanTarget.title}`}
          subtitle={scanTarget === 'capture'
            ? 'Scan the barcode on the item tied to this routine — toothpaste, detergent, anything with a code.'
            : 'Scan the registered barcode to prove you\'re there, then it checks off.'}
          expectedCode={scanTarget === 'capture' ? undefined : scanTarget.barcode}
          onResult={code => {
            if (scanTarget === 'capture') {
              setBarcode(code);
            } else {
              hapticTick();
              toggleDaily(scanTarget.id);
            }
            setScanTarget(null);
          }}
          onClose={() => setScanTarget(null)}
        />
      )}

      {/* Header */}
      <div className="px-5 pt-14 pb-4">
        <h1 className="text-3xl font-bold text-white mb-1">Dailies</h1>
        <p className="text-white/30 text-sm">
          {dueToday.length === 0
            ? 'Repeating routines, on the days you choose'
            : `${doneCount} of ${dueToday.length} done today · ${pct}%`}
        </p>
        {dueToday.length > 0 && (
          <div className="mt-4 h-1.5 bg-white/8 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #FF6B35, #FBBF24)' }}
            />
          </div>
        )}
      </div>

      <div className="px-4 space-y-2">
        {dailies.length === 0 && !showAdd && (
          <div className="animate-slide-up">
            <div className="text-center py-8">
              <div className="text-5xl mb-3">🔁</div>
              <p className="text-white/30 text-sm font-medium">No dailies yet</p>
              <p className="text-white/20 text-xs mt-1">
                Routines that repeat — set a time, make them lock your apps, even require a barcode scan
              </p>
            </div>
            <p className="text-[10px] font-semibold text-white/25 uppercase tracking-wider mb-2 px-1">
              Quick start
            </p>
            <div className="space-y-2">
              {DAILY_TEMPLATES.map(t => (
                <button
                  key={t.title}
                  onClick={() => addDaily({ title: t.title, emoji: t.emoji, targetDays: t.targetDays, time: t.time, isLocking: t.isLocking })}
                  className="w-full flex items-center gap-3 bg-[#141417] border border-white/[0.07] rounded-2xl p-3.5 text-left active:scale-[0.98] transition-transform"
                >
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xl flex-shrink-0">
                    {t.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">{t.title}</p>
                    <p className="text-xs text-white/40 mt-0.5">{t.subtitle}</p>
                  </div>
                  <Plus className="w-4 h-4 text-white/30 flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {dueToday.map((d, i) => renderCard(d, i, true))}

        {otherDays.length > 0 && (
          <>
            <p className="text-[10px] font-semibold text-white/25 uppercase tracking-wider pt-3 px-1">
              Not scheduled today
            </p>
            {otherDays.map((d, i) => renderCard(d, i, false))}
          </>
        )}

        {/* Add form */}
        {showAdd && (
          <div className="bg-[#141417] rounded-2xl p-4 border border-[#FF6B35]/30 space-y-4 animate-slide-up">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-white">{editingId ? 'Edit Daily' : 'New Daily'}</span>
              <button onClick={resetForm} aria-label="Cancel" className="p-1 rounded-lg hover:bg-white/10">
                <X className="w-4 h-4 text-white/30" />
              </button>
            </div>

            <div className="flex gap-2">
              <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl flex-shrink-0">
                {emoji}
              </div>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="Daily routine name..."
                className="flex-1 text-white placeholder-white/25 text-sm font-medium outline-none px-2 bg-white/5 rounded-xl border border-white/10"
              />
            </div>

            <div>
              <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-2">Emoji</p>
              <div className="grid grid-cols-6 gap-1.5">
                {PRESET_EMOJIS.map(e => (
                  <button
                    key={e}
                    onClick={() => setEmoji(e)}
                    className={`w-full aspect-square rounded-xl text-xl flex items-center justify-center transition-all ${
                      emoji === e ? 'bg-white/15 scale-110' : 'bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-2">Repeat On</p>
              <div className="flex gap-1.5">
                {DAY_LABELS.map((label, idx) => (
                  <button
                    key={idx}
                    onClick={() => toggleDay(idx)}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                      targetDays.includes(idx) ? 'bg-[#FF6B35] text-white' : 'bg-white/5 text-white/30'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Time */}
            <div className="flex items-center justify-between py-1">
              <div>
                <p className="text-sm font-medium text-white">At a set time</p>
                <p className="text-xs text-white/40">
                  {useTime ? 'Due (and locks) from this time' : 'Due any time of day'}
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                {useTime && (
                  <input
                    type="time"
                    value={time}
                    onChange={e => setTime(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-sm text-white outline-none"
                    style={{ colorScheme: 'dark' }}
                  />
                )}
                <button
                  onClick={() => setUseTime(v => !v)}
                  aria-label="Toggle set time"
                  className={`relative w-12 h-7 rounded-full transition-colors flex-shrink-0 ${useTime ? 'bg-[#FF6B35]' : 'bg-white/15'}`}
                >
                  <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${useTime ? 'left-6' : 'left-1'}`} />
                </button>
              </div>
            </div>

            {/* Locking */}
            <button
              onClick={() => setIsLocking(v => !v)}
              className={`w-full flex items-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all duration-200 ${
                isLocking
                  ? 'bg-red-500/15 border border-red-500/30 text-red-400'
                  : 'bg-white/5 border border-white/8 text-white/40'
              }`}
            >
              <Lock className="w-3.5 h-3.5 flex-shrink-0" />
              {isLocking
                ? useTime
                  ? `Locking — apps block from ${formatTime(time)} until done`
                  : 'Locking — apps block all day until done'
                : 'Make this a locking daily'}
            </button>

            {/* Barcode */}
            {barcode ? (
              <div className="w-full flex items-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold bg-emerald-500/10 border border-emerald-500/25 text-emerald-300">
                <ScanBarcode className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="flex-1 truncate">Barcode registered · …{barcode.slice(-6)}</span>
                <button onClick={() => setBarcode(null)} aria-label="Remove barcode" className="p-1 rounded-lg hover:bg-white/10">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setScanTarget('capture')}
                className="w-full flex items-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold bg-white/5 border border-white/8 text-white/40 transition-all"
              >
                <ScanBarcode className="w-3.5 h-3.5 flex-shrink-0" />
                Require a barcode scan to check off (optional)
              </button>
            )}

            <div className="flex gap-2 pt-1">
              <button onClick={resetForm} className="flex-1 py-3 rounded-xl bg-white/5 text-white/50 text-sm font-semibold">
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!title.trim() || targetDays.length === 0}
                className="flex-1 py-3 rounded-xl bg-[#FF6B35] text-white text-sm font-semibold disabled:opacity-30 active:scale-95 transition-transform"
              >
                {editingId ? 'Save Changes' : 'Add Daily'}
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
            Add Daily
          </button>
        </div>
      )}
    </div>
  );
}
