import { useState } from 'react';
import { Plus, Trash2, Flame, X } from 'lucide-react';
import type { Store } from '../hooks/useStore';
import type { Habit } from '../types';

interface Props { store: Store }

const PRESET_COLORS = ['#FF6B35', '#4F9EF8', '#A78BFA', '#34D399', '#F472B6', '#FBBF24', '#F87171'];
const PRESET_EMOJIS = ['💪', '📚', '🧘', '📵', '🏃', '💧', '🛌', '✍️', '🎯', '🥗', '🧹', '🎸'];
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function HabitsView({ store }: Props) {
  const { habits, today, toggleHabit, addHabit, deleteHabit, getStreak, getLast7Days } = store;

  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState('🎯');
  const [color, setColor] = useState('#FF6B35');
  const [targetDays, setTargetDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);

  const last7 = getLast7Days();

  const totalDone = habits.filter(h => h.completedDates.includes(today)).length;
  const overallPct = habits.length === 0 ? 0 : Math.round((totalDone / habits.length) * 100);

  const handleAdd = () => {
    if (!title.trim()) return;
    addHabit(title.trim(), emoji, color, targetDays);
    setTitle('');
    setEmoji('🎯');
    setColor('#FF6B35');
    setTargetDays([0, 1, 2, 3, 4, 5, 6]);
    setShowAdd(false);
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
          <div className="text-center py-14 animate-slide-up">
            <div className="text-5xl mb-3">🌱</div>
            <p className="text-white/30 text-sm font-medium">No habits yet</p>
            <p className="text-white/20 text-xs mt-1">Build consistent routines</p>
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

                {/* Info */}
                <div className="flex-1 min-w-0">
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
                </div>

                {/* Check button */}
                <button
                  onClick={() => toggleHabit(habit.id)}
                  aria-label={doneToday ? `Uncheck "${habit.title}" for today` : `Check off "${habit.title}" for today`}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200 active:scale-90 ${
                    doneToday ? 'scale-105' : 'bg-white/5 border border-white/10'
                  }`}
                  style={doneToday ? { backgroundColor: habit.color, boxShadow: `0 4px 12px ${habit.color}55` } : {}}
                >
                  <span className="text-base">{doneToday ? '✓' : '○'}</span>
                </button>

                {/* Delete */}
                <button
                  onClick={() => deleteHabit(habit.id)}
                  aria-label={`Delete habit "${habit.title}"`}
                  className="p-1.5 rounded-xl hover:bg-white/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4 text-white/15 hover:text-red-400 transition-colors" />
                </button>
              </div>

              {/* Last 7 days */}
              <div className="flex gap-1.5 mt-3 pt-3 border-t border-white/5">
                {last7.map(dateStr => {
                  const done = habit.completedDates.includes(dateStr);
                  const isToday2 = dateStr === today;
                  const d = new Date(dateStr + 'T00:00:00');
                  return (
                    <div key={dateStr} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[9px] text-white/20 font-medium">
                        {DAY_LABELS[d.getDay()]}
                      </span>
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center transition-all"
                        style={{
                          backgroundColor: done ? habit.color : 'rgba(255,255,255,0.06)',
                          boxShadow: isToday2
                            ? `0 0 0 1.5px ${done ? habit.color : 'rgba(255,255,255,0.25)'}`
                            : undefined,
                        }}
                      >
                        {done && <span className="text-[9px] text-white font-bold">✓</span>}
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
              <span className="text-sm font-semibold text-white">New Habit</span>
              <button onClick={() => setShowAdd(false)} className="p-1 rounded-lg hover:bg-white/10">
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
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
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
                onClick={() => setShowAdd(false)}
                className="flex-1 py-3 rounded-xl bg-white/5 text-white/50 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={!title.trim()}
                className="flex-1 py-3 rounded-xl text-white text-sm font-semibold disabled:opacity-30 active:scale-95 transition-transform"
                style={{ backgroundColor: color }}
              >
                Add Habit
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
    </div>
  );
}
