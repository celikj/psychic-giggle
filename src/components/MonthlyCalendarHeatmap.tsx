import { useMemo } from 'react';
import type { DayStat, MonthlyStats } from '../lib/monthlyStats';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

interface Props {
  stats: MonthlyStats;
  onDayClick?: (date: string) => void;
}

export default function MonthlyCalendarHeatmap({ stats, onDayClick }: Props) {
  // Pad the start of the month with empty cells so days align with correct weekday
  const paddedDays = useMemo(() => {
    if (stats.days.length === 0) return [];
    
    // First day of month
    const firstDateStr = stats.days[0].date;
    const [y, m, d] = firstDateStr.split('-').map(Number);
    const firstDate = new Date(y, m - 1, d);
    const offset = firstDate.getDay(); // 0 (Sun) to 6 (Sat)
    
    const arr: Array<DayStat | null> = Array(offset).fill(null);
    return arr.concat(stats.days);
  }, [stats.days]);

  return (
    <div className="w-full">
      <div className="grid grid-cols-7 gap-1 mb-2">
        {WEEKDAYS.map((w, i) => (
          <div key={i} className="text-center text-[10px] font-bold text-white/30 uppercase">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {paddedDays.map((day, i) => {
          if (!day) {
            return <div key={`empty-${i}`} className="aspect-square rounded-sm bg-transparent" />;
          }

          let bgColor = 'bg-white/5'; // Not completed
          if (day.completed) {
            bgColor = 'bg-[#FF6B35]'; // Bright orange
          } else if (day.frozen) {
            bgColor = 'bg-[#FF6B35]/40 border border-[#FF6B35]/50 flex items-center justify-center'; // Faded
          }

          return (
            <button
              key={day.date}
              onClick={() => onDayClick?.(day.date)}
              className={`aspect-square rounded-[4px] transition-transform active:scale-90 ${bgColor}`}
              title={day.date}
            >
              {day.frozen && !day.completed && <span className="text-[10px] text-white/80">❄</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
