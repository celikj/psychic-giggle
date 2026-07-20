import { useState, useMemo } from 'react';
import { X, ChevronLeft, ChevronRight, Target, Flame, Calendar, Trophy } from 'lucide-react';
import type { Daily, Habit } from '../types';
import MonthlyCalendarHeatmap from './MonthlyCalendarHeatmap';
import { computeItemMonthlyStats } from '../lib/monthlyStats';

interface Props {
  item: Daily | Habit;
  today: string;
  onClose: () => void;
  isPremium: boolean;
  onShowPaywall: () => void;
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function ItemStatsModal({ item, today, onClose, isPremium, onShowPaywall }: Props) {
  const [currentMonth, setCurrentMonth] = useState(today.substring(0, 7)); // "YYYY-MM"

  const stats = useMemo(() => {
    return computeItemMonthlyStats(item, currentMonth);
  }, [item, currentMonth]);

  const handlePrevMonth = () => {
    if (!isPremium) {
      onShowPaywall();
      return;
    }
    const [y, m] = currentMonth.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [y, m] = currentMonth.split('-').map(Number);
    const d = new Date(y, m, 1);
    const nextMonthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    
    // Don't allow navigating past current real month
    if (nextMonthStr > today.substring(0, 7)) return;
    
    setCurrentMonth(nextMonthStr);
  };

  const isCurrentMonth = currentMonth === today.substring(0, 7);

  // Month formatting (e.g. "July 2026")
  const [year, month] = currentMonth.split('-').map(Number);
  const monthName = new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div 
        className="bg-[#141417] w-full max-w-md rounded-t-3xl overflow-hidden animate-in slide-in-from-bottom flex flex-col"
        style={{ maxHeight: '90vh' }}
      >
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-2xl">{item.emoji || '🎯'}</span>
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-white truncate">{item.title}</h3>
              <p className="text-xs text-white/40">Detailed Statistics</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 pb-safe">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-6">
            <button 
              onClick={handlePrevMonth}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 active:scale-95 transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm font-bold text-white">{monthName}</span>
            <button 
              onClick={handleNextMonth}
              disabled={isCurrentMonth}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 active:scale-95 transition-all disabled:opacity-30"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Grid Heatmap */}
          <div className="mb-8 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
            <MonthlyCalendarHeatmap stats={stats} />
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-orange-400" />
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Completion</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {Math.round(stats.completionRate * 100)}<span className="text-sm text-white/40">%</span>
              </p>
              <p className="text-xs text-white/30 mt-1">{stats.totalCompleted} of {stats.totalDue} days</p>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <Flame className="w-4 h-4 text-red-400" />
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Best Streak</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {stats.bestStreak}
              </p>
              <p className="text-xs text-white/30 mt-1">In this month</p>
            </div>

            <div className="col-span-2 p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Trophy className="w-4 h-4 text-yellow-400" />
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Best Weekday</span>
                </div>
                <p className="text-lg font-bold text-white">
                  {WEEKDAYS[stats.bestWeekday]}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
