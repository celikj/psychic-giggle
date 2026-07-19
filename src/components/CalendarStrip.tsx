import { useEffect, useRef } from 'react';
import { toLocalDateStr } from '../lib/date';

interface Props {
  selectedDate: string;
  onSelectDate: (d: string) => void;
  today: string;
  completedDates: Set<string>;
}

const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function CalendarStrip({ selectedDate, onSelectDate, today, completedDates }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const dates: Date[] = [];
  for (let i = -4; i <= 14; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    dates.push(d);
  }

  useEffect(() => {
    const btn = buttonRefs.current.get(selectedDate);
    if (btn) btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [selectedDate]);

  return (
    <div
      ref={containerRef}
      className="flex gap-1.5 overflow-x-auto px-4 py-2"
      style={{ scrollbarWidth: 'none' }}
    >
      {dates.map(date => {
        const ds = toLocalDateStr(date);
        const isSelected = ds === selectedDate;
        const isToday = ds === today;
        const isDone = completedDates.has(ds);
        const isFuture = ds > today;

        return (
          <button
            key={ds}
            ref={el => { if (el) buttonRefs.current.set(ds, el); else buttonRefs.current.delete(ds); }}
            onClick={() => onSelectDate(ds)}
            className={`flex-shrink-0 flex flex-col items-center gap-1 w-11 py-2.5 rounded-2xl transition-all duration-200 ${
              isSelected
                ? 'bg-[#FF6B35] scale-105 shadow-lg'
                : isToday
                ? 'bg-white/10 ring-1 ring-white/20'
                : 'hover:bg-white/5 active:bg-white/10'
            }`}
          >
            <span className={`text-[10px] font-semibold uppercase tracking-wide ${
              isSelected ? 'text-white/70' : 'text-white/30'
            }`}>
              {DAY_NAMES[date.getDay()]}
            </span>
            <span className={`text-sm font-bold leading-none ${
              isSelected ? 'text-white' : isFuture ? 'text-white/40' : 'text-white'
            }`}>
              {date.getDate()}
            </span>
            <div className={`w-1.5 h-1.5 rounded-full transition-colors ${
              isDone ? 'bg-green-400' : isSelected ? 'bg-white/30' : 'bg-transparent'
            }`} />
          </button>
        );
      })}
    </div>
  );
}
