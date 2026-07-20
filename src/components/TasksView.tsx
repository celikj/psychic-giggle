import { useState, useRef, useEffect } from 'react';
import { Plus, Lock, CheckCircle2, Circle, X, GripVertical, Trash2, CalendarCheck, Crown } from 'lucide-react';
import type { Store } from '../hooks/useStore';
import type { Priority, Task } from '../types';
import type { MonetizationState } from '../hooks/useMonetization';
import { canAddLockingTask, canMakeTaskLocking } from '../lib/monetization';
import CalendarStrip from './CalendarStrip';
import ConfirmDeleteButton, { confirmDelete } from './ConfirmDeleteButton';
import EditButton from './EditButton';
import SwipeableRow from './SwipeableRow';
import { hapticTick } from '../lib/haptics';

interface Props {
  store: Store;
  monetization: MonetizationState;
  onShowPaywall: () => void;
}

const PRIORITY_COLOR: Record<Priority, string> = {
  low: '#6B7280',
  medium: '#F59E0B',
  high: '#EF4444',
};

export default function TasksView({ store, monetization, onShowPaywall }: Props) {
  const {
    todayTasks, completedToday, selectedDate, setSelectedDate, today,
    allLockingDone, lockingLeft, addTask, editTask, toggleTask, deleteTask, getCompletedDates,
    overdueTasks, moveTaskToToday, moveAllOverdueToToday, reorderTasks,
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
    
    if (newLocking) {
      if (editingId) {
        if (!canMakeTaskLocking(store.tasks, editingId, store.selectedDate, monetization.isPremium)) {
          onShowPaywall();
          return;
        }
      } else {
        if (!canAddLockingTask(store.tasks, store.selectedDate, monetization.isPremium)) {
          onShowPaywall();
          return;
        }
      }
    }

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

  // Manual order: the stored array order is the user's order (drag to change),
  // with completed tasks sinking to the bottom. Priority stays visible as the
  // colored grip but no longer forces a sort.
  const incomplete = todayTasks.filter(t => !t.completed);
  const done = todayTasks.filter(t => t.completed);
  const sorted = [...incomplete, ...done];

  // ---- Drag-to-reorder (via the grip handle, incomplete tasks only) ----
  const [drag, setDrag] = useState<{ id: string; from: number; to: number; dy: number; height: number } | null>(null);
  const dragRef = useRef<typeof drag>(null);
  const setDragBoth = (d: typeof drag) => { dragRef.current = d; setDrag(d); };

  const handleDragStart = (e: React.PointerEvent, id: string, index: number) => {
    e.preventDefault();
    const handle = e.currentTarget as HTMLElement;
    const row = handle.closest('[data-task-row]') as HTMLElement | null;
    const height = (row?.offsetHeight ?? 64) + 8; // + space-y-2 gap
    const startY = e.clientY;
    const baseIds = incomplete.map(t => t.id);
    handle.setPointerCapture(e.pointerId);
    setDragBoth({ id, from: index, to: index, dy: 0, height });

    const onMove = (ev: PointerEvent) => {
      const dy = ev.clientY - startY;
      const cur = dragRef.current;
      if (!cur) return;
      const to = Math.min(baseIds.length - 1, Math.max(0, cur.from + Math.round(dy / height)));
      setDragBoth({ ...cur, dy, to });
    };
    const finish = () => {
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', finish);
      handle.removeEventListener('pointercancel', finish);
      const cur = dragRef.current;
      if (cur && cur.to !== cur.from) {
        const ids = [...baseIds];
        const [moved] = ids.splice(cur.from, 1);
        ids.splice(cur.to, 0, moved);
        hapticTick();
        reorderTasks(ids);
      }
      setDragBoth(null);
    };
    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', finish);
    handle.addEventListener('pointercancel', finish);
  };

  /** Visual displacement while dragging: the grabbed row follows the pointer, rows between origin and target shift out of the way. */
  const dragStyle = (index: number): React.CSSProperties => {
    if (!drag) return {};
    if (index === drag.from) {
      return { transform: `translateY(${drag.dy}px)`, zIndex: 20, position: 'relative', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' };
    }
    if (drag.from < drag.to && index > drag.from && index <= drag.to) {
      return { transform: `translateY(-${drag.height}px)`, transition: 'transform 0.15s ease' };
    }
    if (drag.from > drag.to && index >= drag.to && index < drag.from) {
      return { transform: `translateY(${drag.height}px)`, transition: 'transform 0.15s ease' };
    }
    return { transition: 'transform 0.15s ease' };
  };

  const completedDates = getCompletedDates();
  const taskDates = new Set(store.tasks.map(t => t.date));

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
        taskDates={taskDates}
      />

      {/* Task list */}
      <div className="px-4 mt-2 space-y-2">
        {/* Overdue: incomplete to-dos from past days would otherwise silently vanish */}
        {selectedDate === today && overdueTasks.length > 0 && (
          <div className="pb-1">
            <div className="flex items-center justify-between px-1 mb-2">
              <p className="text-[10px] font-semibold text-amber-400/80 uppercase tracking-wider">
                Overdue · {overdueTasks.length}
              </p>
              {overdueTasks.length > 1 && (
                <button onClick={moveAllOverdueToToday} className="text-[11px] font-semibold text-[#FF6B35]">
                  Move all to today
                </button>
              )}
            </div>
            <div className="space-y-2">
              {overdueTasks.map(task => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 p-3.5 rounded-2xl border border-amber-500/15 bg-amber-500/[0.04]"
                >
                  <div className="w-1 h-6 rounded-full flex-shrink-0" style={{ backgroundColor: PRIORITY_COLOR[task.priority] }} />
                  <div className="flex-1 min-w-0">
                    <span className="truncate block text-sm font-medium text-white/80">{task.title}</span>
                    <span className="text-[10px] text-amber-400/60 font-medium">
                      {new Date(task.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <button
                    onClick={() => moveTaskToToday(task.id)}
                    aria-label={`Move "${task.title}" to today`}
                    className="flex items-center gap-1 text-[11px] font-semibold text-[#FF6B35] bg-[#FF6B35]/10 border border-[#FF6B35]/25 rounded-lg px-2 py-1 active:scale-95 transition-transform flex-shrink-0"
                  >
                    <CalendarCheck className="w-3.5 h-3.5" /> Today
                  </button>
                  <ConfirmDeleteButton
                    label={`Delete overdue task "${task.title}"`}
                    onConfirm={() => deleteTask(task.id)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {sorted.length === 0 && !showAdd && !(selectedDate === today && overdueTasks.length > 0) && (
          <div className="text-center py-14 animate-slide-up">
            <div className="text-5xl mb-3">📋</div>
            <p className="text-white/30 text-sm font-medium">No tasks yet</p>
            <p className="text-white/20 text-xs mt-1">Tap + to add your first task</p>
          </div>
        )}

        {sorted.map((task, i) => (
          <div key={task.id} style={dragStyle(i)}>
            <SwipeableRow
              disabled={!!drag}
              onSwipeRight={() => { hapticTick(); toggleTask(task.id); }}
              onSwipeLeft={() => confirmDelete(
                task.isLocking && !task.completed,
                () => deleteTask(task.id),
                task.isLocking && !task.completed && store.strictState.isActive ? true : undefined,
              )}
              rightHint={<CheckCircle2 className="w-5 h-5 text-green-400" />}
              leftHint={<Trash2 className="w-5 h-5 text-red-400" />}
            >
              <div
                data-task-row
                className={`flex items-center gap-2.5 p-4 rounded-2xl border transition-colors duration-300 animate-slide-in ${
                  task.completed
                    ? 'bg-white/[0.02] border-white/5 opacity-50'
                    : 'bg-[#141417] border-white/[0.07]'
                }`}
                style={{ animationDelay: `${i * 30}ms` }}
              >
                {/* Grip: drag to reorder (incomplete only), tinted by priority */}
                {task.completed ? (
                  <div className="w-4 flex-shrink-0" />
                ) : (
                  <button
                    onPointerDown={e => handleDragStart(e, task.id, i)}
                    aria-label={`Reorder "${task.title}"`}
                    className="flex-shrink-0 -ml-1 py-2 cursor-grab active:cursor-grabbing"
                    style={{ touchAction: 'none' }}
                  >
                    <GripVertical className="w-4 h-4" style={{ color: PRIORITY_COLOR[task.priority] }} />
                  </button>
                )}

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

                <EditButton label={`Edit task "${task.title}"`} onClick={() => startEdit(task)} />
                <ConfirmDeleteButton
                  label={`Delete "${task.title}"`}
                  warnLocking={task.isLocking && !task.completed}
                  strictBlocked={task.isLocking && !task.completed && store.strictState.isActive}
                  onConfirm={() => deleteTask(task.id)}
                />
              </div>
            </SwipeableRow>
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
              onClick={() => {
                // When editing an existing locking task and strict is active, prevent un-marking isLocking
                if (editingId && newLocking && store.strictState.isActive) {
                  const existingTask = store.tasks.find(t => t.id === editingId);
                  if (existingTask?.isLocking && !existingTask.completed) {
                    window.alert('Strict Mode is active \u2014 you can\'t remove the locking flag until your tasks are done.');
                    return;
                  }
                }
                setNewLocking(v => !v);
              }}
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
