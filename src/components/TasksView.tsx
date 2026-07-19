import { useState, useRef, useEffect } from 'react';
import { Plus, Lock, CheckCircle2, Circle, X } from 'lucide-react';
import type { Store } from '../hooks/useStore';
import type { Priority, Task } from '../types';
import CalendarStrip from './CalendarStrip';
import ConfirmDeleteButton from './ConfirmDeleteButton';
import { hapticTick } from '../lib/haptics';

interface Props {
  store: Store;
}

const PRIORITY_COLOR: Record<Priority, string> = {
  low: '#6B7280',
  medium: '#F59E0B',
  high: '#EF4444',
};

export default function TasksView({ store }: Props) {
  const {
    todayTasks, completedToday, selectedDate, setSelectedDate, today,
    allLockingDone, lockingLeft, addTask, editTask, toggleTask, deleteTask, getCompletedDates,
  } = store;

  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<Priority>('medium');
  const [newLocking, setNewLocking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showAdd) setTimeout(() => inputRef.current?.focus(), 50);
  }, [showAdd]);

  const resetForm = () => {
    setShowAdd(false);
    setEditingId(null);
    setNewTitle('');
    setNewPriority('medium');
    setNewLocking(false);
  };

  const startEdit = (task: Task) => {
    setEditingId(task.id);
    setNewTitle(task.title);
    setNewPriority(task.priority);
    setNewLocking(task.isLocking);
    setShowAdd(true);
  };

  const handleSubmit = () => {
    if (!newTitle.trim()) return;
    if (editingId) {
      editTask(editingId, { title: newTitle.trim(), priority: newPriority, isLocking: newLocking });
    } else {
      addTask(newTitle.trim(), newPriority, newLocking);
    }
    resetForm();
  };

  const pct = todayTasks.length === 0 ? 0 : Math.round((completedToday / todayTasks.length) * 100);
  const circumference = 2 * Math.PI * 16;
  const strokeDash = (pct / 100) * circumference;

  const sorted = [...todayTasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    const rank: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
    return rank[a.priority] - rank[b.priority];
  });

  const completedDates = getCompletedDates();

  const formatHeaderDate = () => {
    if (selectedDate === today) return 'Today';
    const d = new Date(selectedDate + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex flex-col pb-24">
      {/* Header */}
      <div className="px-5 pt-14 pb-2">
        <div className="flex items-start justify-between mb-1">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-2 h-2 rounded-full ${allLockingDone ? 'bg-green-400' : 'bg-red-400'}`} />
              <span className="text-xs font-semibold uppercase tracking-widest text-white/40">
                {allLockingDone
                  ? 'Apps Unlocked'
                  : `${lockingLeft} left to unlock`}
              </span>
            </div>
            <h1 className="text-3xl font-bold text-white">{formatHeaderDate()}</h1>
            <p className="text-white/30 text-sm mt-0.5">
              {completedToday} / {todayTasks.length} tasks complete
            </p>
          </div>

          {/* Ring progress */}
          <div className="relative w-14 h-14 flex-shrink-0 mt-1">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 40 40">
              <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
              <circle
                cx="20" cy="20" r="16" fill="none"
                stroke={allLockingDone ? '#34D399' : '#FF6B35'}
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${strokeDash} ${circumference}`}
                style={{ transition: 'stroke-dasharray 0.6s ease, stroke 0.4s ease' }}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
              {pct}%
            </span>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <CalendarStrip
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        today={today}
        completedDates={completedDates}
      />

      {/* Task list */}
      <div className="px-4 mt-2 space-y-2">
        {sorted.length === 0 && !showAdd && (
          <div className="text-center py-14 animate-slide-up">
            <div className="text-5xl mb-3">📋</div>
            <p className="text-white/30 text-sm font-medium">No tasks yet</p>
            <p className="text-white/20 text-xs mt-1">Tap + to add your first task</p>
          </div>
        )}

        {sorted.map((task, i) => (
          <div
            key={task.id}
            className={`flex items-center gap-3 p-4 rounded-2xl border transition-all duration-300 animate-slide-in ${
              task.completed
                ? 'bg-white/[0.02] border-white/5 opacity-50'
                : 'bg-[#141417] border-white/[0.07] active:scale-[0.98]'
            }`}
            style={{ animationDelay: `${i * 30}ms` }}
          >
            {/* Priority bar */}
            <div
              className="w-1 h-7 rounded-full flex-shrink-0 transition-all duration-300"
              style={{ backgroundColor: task.completed ? 'transparent' : PRIORITY_COLOR[task.priority] }}
            />

            {/* Checkbox */}
            <button
              onClick={() => { hapticTick(); toggleTask(task.id); }}
              aria-label={task.completed ? `Mark "${task.title}" as not done` : `Mark "${task.title}" as done`}
              className="flex-shrink-0 transition-transform active:scale-90"
            >
              {task.completed
                ? <CheckCircle2 className="w-5 h-5 text-green-400" />
                : <Circle className="w-5 h-5 text-white/25" />
              }
            </button>

            {/* Title — tap to edit */}
            <button
              onClick={() => startEdit(task)}
              aria-label={`Edit "${task.title}"`}
              className={`flex-1 text-left text-sm font-medium leading-snug min-w-0 ${
                task.completed ? 'text-white/30 line-through' : 'text-white'
              }`}
            >
              <span className="truncate block">{task.title}</span>
            </button>

            {/* Lock tag */}
            {task.isLocking && !task.completed && (
              <div className="flex items-center gap-1 bg-red-500/15 border border-red-500/25 px-2 py-0.5 rounded-lg flex-shrink-0">
                <Lock className="w-3 h-3 text-red-400" />
                <span className="text-[10px] font-semibold text-red-400">Lock</span>
              </div>
            )}

            {/* Delete */}
            <ConfirmDeleteButton
              label={`Delete "${task.title}"`}
              warnLocking={task.isLocking && !task.completed}
              onConfirm={() => deleteTask(task.id)}
            />
          </div>
        ))}

        {/* Add / edit task inline */}
        {showAdd && (
          <div className="bg-[#141417] rounded-2xl p-4 border border-[#FF6B35]/30 space-y-3 animate-slide-up">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">
                {editingId ? 'Edit Task' : 'New Task'}
              </span>
              <button onClick={resetForm} aria-label="Cancel" className="p-1 rounded-lg hover:bg-white/10">
                <X className="w-4 h-4 text-white/30" />
              </button>
            </div>

            <input
              ref={inputRef}
              type="text"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); if (e.key === 'Escape') resetForm(); }}
              placeholder="What needs to be done?"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-white/25 text-sm font-medium outline-none"
            />

            {/* Priority */}
            <div className="flex gap-2">
              {(['low', 'medium', 'high'] as Priority[]).map(p => (
                <button
                  key={p}
                  onClick={() => setNewPriority(p)}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold capitalize transition-all duration-200 ${
                    newPriority === p ? 'text-white scale-105' : 'bg-white/5 text-white/35'
                  }`}
                  style={newPriority === p ? { backgroundColor: PRIORITY_COLOR[p] } : {}}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Locking toggle */}
            <button
              onClick={() => setNewLocking(v => !v)}
              className={`w-full flex items-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all duration-200 ${
                newLocking
                  ? 'bg-red-500/15 border border-red-500/30 text-red-400'
                  : 'bg-white/5 border border-white/8 text-white/40'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              {newLocking ? 'Locking task — blocks apps until done' : 'Make this a locking task'}
            </button>

            <div className="flex gap-2 pt-1">
              <button
                onClick={resetForm}
                className="flex-1 py-3 rounded-xl bg-white/5 text-white/50 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!newTitle.trim()}
                className="flex-1 py-3 rounded-xl bg-[#FF6B35] text-white text-sm font-semibold disabled:opacity-30 active:scale-95 transition-transform"
              >
                {editingId ? 'Save Changes' : 'Add Task'}
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
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-[#FF6B35] text-white font-semibold text-sm active:scale-95 transition-transform shadow-lg"
            style={{ boxShadow: '0 8px 24px rgba(255,107,53,0.35)' }}
          >
            <Plus className="w-5 h-5" />
            Add Task
          </button>
        </div>
      )}
    </div>
  );
}
