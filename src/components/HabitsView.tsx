import { useState } from 'react';
import { Plus, Flame, X, Crown } from 'lucide-react';
import type { Store } from '../hooks/useStore';
import type { Habit } from '../types';
import type { MonetizationState } from '../hooks/useMonetization';
import ConfirmDeleteButton from './ConfirmDeleteButton';
import EditButton from './EditButton';
import ItemStatsModal from './ItemStatsModal';
import { hapticTick } from '../lib/haptics';
import { HABIT_TEMPLATES } from '../lib/templates';

interface Props {
  store: Store;
  monetization: MonetizationState;
  onShowPaywall: () => void;
}

const PRESET_COLORS = ['#FF6B35', '#4F9EF8', '#A78BFA', '#34D399', '#F472B6', '#FBBF24', '#F87171'];
const PRESET_EMOJIS = ['💪', '📚', '🧘', '📵', '🏃', '💧', '🛌', '✍️', '🎯', '🥗', '🧹', '🎸'];
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function HabitsView({ store, monetization, onShowPaywall }: Props) {
  const { habits, today, toggleHabit, addHabit, editHabit, deleteHabit, getStreak, getLast7Days } = store;

  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [statsItem, setStatsItem] = useState<Habit | null>(null);
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState('🎯');
  const [color, setColor] = useState('#FF6B35');
  const [targetDays, setTargetDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);

  const last7 = getLast7Days();

  const totalDone = habits.filter(h => h.completedDates.includes(today)).length;
  const overallPct = habits.length === 0 ? 0 : Math.round((totalDone / habits.length) * 100);

  const resetForm = () => {
    setShowAdd(false);
    setEditingId(null);
    setTitle('');
    setEmoji('🎯');
    setColor('#FF6B35');
    setTargetDays([0, 1, 2, 3, 4, 5, 6]);
  };

  const startEdit = (habit: Habit) => {
    setEditingId(habit.id);
    setTitle(habit.title);
    setEmoji(habit.emoji);
    setColor(habit.color);
    setTargetDays(habit.targetDays);
    setShowAdd(true);
  };

  const handleSubmit = () => {
    if (!title.trim() || targetDays.length === 0) return;
    if (editingId) {
      editHabit(editingId, { title: title.trim(), emoji, color, targetDays: [...targetDays].sort() });
    } else {
      addHabit(title.trim(), emoji, color, targetDays);
    }
    resetForm();
  };

  const toggleDay = (d: number) => {
    setTargetDays(prev =>
      prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]
    );
  };

  const getLongestStreak = (habit: Habit): number => {
    let max = 0, cur = 0;
    const sorted = [...habit.completedDates].sort();
    for (let i = 0; i < sorted.length; i++) {
      if (i === 0) { cur = 1; }
      else {
        const prev = new Date(sorted[i - 1]);
        const curr = new Date(sorted[i]);
        const diff = (curr.getTime() - prev.getTime()) / 86400000;
        cur = diff === 1 ? cur + 1 : 1;
      }
      max = Math.max(max, cur);
    }
    return max;
  };

  return (
    <div className="flex flex-col pb-24">
      {/* Header */}
      <div className="px-5 pt-14 pb-4">
        <h1 className="text-3xl font-bold text-white mb-1">Habits</h1>
        <p className="text-white/30 text-sm">
          {totalDone} of {habits.length} done today · {overallPct}%
        </p>

        {/* Streak bar */}
        <div className="mt-4 h-1.5 bg-white/8 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${overallPct}%`, background: 'linear-gradient(90deg, #FF6B35, #FBBF24)' }}
          />
        </div>
      </div>

      {/* Habit cards */}
      <div className="px-4 space-y-2">
        {habits.length === 0 && !showAdd && (
          <div className="animate-slide-up">
            <div className="text-center py-8">
              <div className="text-5xl mb-3">🌱</div>
              <p className="text-white/30 text-sm font-medium">No habits yet</p>
              <p className="text-white/20 text-xs mt-1">Build consistent routines</p>
            </div>
            <p className="text-[10px] font-semibold text-white/25 uppercase tracking-wider mb-2 px-1">
              Quick start
            </p>
            <div className="space-y-2">
              {HABIT_TEMPLATES.map(t => (
                <button
                  key={t.title}
                  onClick={() => addHabit(t.title, t.emoji, t.color, t.targetDays)}
                  className="w-full flex items-center gap-3 bg-[#141417] border border-white/[0.07] rounded-2xl p-3.5 text-left active:scale-[0.98] transition-transform"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                    style={{ backgroundColor: t.color + '22', border: `1.5px solid ${t.color}44` }}
                  >
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

        {habits.map((habit, i) => {
          const doneToday = habit.completedDates.includes(today);
          const streak = getStreak(habit);
          const longest = getLongestStreak(habit);

          return (
            <div
              key={habit.id}
              className="bg-[#141417] border border-white/[0.07] rounded-2xl p-4 animate-slide-in"
              style={{ animationDelay: `${i * 30}ms` }}
            >
              <div className="flex items-center gap-3">
                {/* Emoji circle */}
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ backgroundColor: habit.color + '22', border: `1.5px solid ${habit.color}44` }}
                >
                  {habit.emoji}
                </div>

                {/* Info — tap to edit */}
                <button onClick={() => startEdit(habit)} aria-label={`Edit habit "${habit.title}"`} className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white truncate">{habit.title}</span>
                    {streak > 0 && (
                      <div className="flex items-center gap-0.5 bg-orange-500/15 border border-orange-500/25 px-1.5 py-0.5 rounded-lg flex-shrink-0">
                        <Flame className="w-3 h-3 text-orange-400" />
                        <span className="text-[10px] font-bold text-orange-400">{streak}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-white/30 mt-0.5">
                    Best streak: {longest} day{longest !== 1 ? 's' : ''}
                  </p>
                </button>

                {/* Check button */}
                <button
                  onClick={() => { hapticTick(); toggleHabit(habit.id); }}
                  aria-label={doneToday ? `Uncheck "${habit.title}" for today` : `Check off "${habit.title}" for today`}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200 active:scale-90 ${
                    doneToday ? 'scale-105' : 'bg-white/5 border border-white/10'
                  }`}
                  style={doneToday ? { backgroundColor: habit.color, boxShadow: `0 4px 12px ${habit.color}55` } : {}}
                >
                  <span className="text-base">{doneToday ? '✓' : '○'}</span>
                </button>

                <button
                  onClick={() => setStatsItem(habit)}
                  aria-label={`View stats for "${habit.title}"`}
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-white/40 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>
                </button>

                <EditButton label={`Edit habit "${habit.title}"`} onClick={() => startEdit(habit)} />
                <ConfirmDeleteButton
                  label={`Delete habit "${habit.title}"`}
                  onConfirm={() => deleteHabit(habit.id)}
                />
              </div>

              <div className="flex gap-1.5 mt-3 pt-3 border-t border-white/5">
                {last7.map(dateStr => {
                  const done = habit.completedDates.includes(dateStr);
                  const frozen = habit.frozenDates?.includes(dateStr) && !done;
                  const isToday2 = dateStr === today;
                  const d = new Date(dateStr + 'T00:00:00');
                  
                  // Base color
                  let bgColor = 'rgba(255,255,255,0.06)';
                  if (done) bgColor = habit.color;
                  if (frozen) bgColor = 'rgba(56, 189, 248, 0.2)'; // Tailwind sky-400 with opacity
                  
                  return (
                    <div key={dateStr} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[9px] text-white/20 font-medium">
                        {DAY_LABELS[d.getDay()]}
                      </span>
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center transition-all"
                        style={{
                          backgroundColor: bgColor,
                          boxShadow: isToday2
                            ? `0 0 0 1.5px ${done ? habit.color : (frozen ? '#38bdf8' : 'rgba(255,255,255,0.25)')}`
                            : undefined,
                        }}
                      >
                        {done && <span className="text-[9px] text-white font-bold">✓</span>}
                        {frozen && <span className="text-[9px] text-sky-400 font-bold">❄</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Add habit form */}
        {showAdd && (
          <div className="bg-[#141417] rounded-2xl p-4 border border-[#FF6B35]/30 space-y-4 animate-slide-up">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-white">{editingId ? 'Edit Habit' : 'New Habit'}</span>
              <button onClick={resetForm} aria-label="Cancel" className="p-1 rounded-lg hover:bg-white/10">
                <X className="w-4 h-4 text-white/30" />
              </button>
            </div>

            {/* Emoji + title */}
            <div className="flex gap-2">
              <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl flex-shrink-0">
                {emoji}
              </div>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="Habit name..."
                className="flex-1 bg-transparent text-white placeholder-white/25 text-sm font-medium outline-none px-2 bg-white/5 rounded-xl border border-white/10"
              />
            </div>

            {/* Emoji picker */}
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

            {/* Color picker */}
            <div>
              <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-2">Color</p>
              <div className="flex gap-2">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded-xl flex-shrink-0 transition-all ${
                      color === c ? 'scale-125 ring-2 ring-white/60 ring-offset-1 ring-offset-[#141417]' : ''
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            {/* Days picker */}
            <div>
              <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-2">Target Days</p>
              <div className="flex gap-1.5">
                {DAY_LABELS.map((label, idx) => (
                  <button
                    key={idx}
                    onClick={() => toggleDay(idx)}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                      targetDays.includes(idx) ? 'text-white' : 'bg-white/5 text-white/30'
                    }`}
                    style={targetDays.includes(idx) ? { backgroundColor: color } : {}}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={resetForm}
                className="flex-1 py-3 rounded-xl bg-white/5 text-white/50 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!title.trim() || targetDays.length === 0}
                className="flex-1 py-3 rounded-xl text-white text-sm font-semibold disabled:opacity-30 active:scale-95 transition-transform"
                style={{ backgroundColor: color }}
              >
                {editingId ? 'Save Changes' : 'Add Habit'}
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
            Add Habit
          </button>
        </div>
      )}

      {statsItem && (
        <ItemStatsModal
          item={statsItem}
          today={today}
          onClose={() => setStatsItem(null)}
          isPremium={monetization.tier === 'premium'}
          onShowPaywall={onShowPaywall}
        />
      )}
    </div>
  );
}
