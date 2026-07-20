import { useEffect, useRef } from 'react';
import { toLocalDateStr } from '../lib/date';

interface Props {
  selectedDate: string;
  onSelectDate: (d: string) => void;
  today: string;
  completedDates: Set<string>;
  /** Dates that have at least one task scheduled, done or not. */
  taskDates: Set<string>;
}

const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// Soften the cells that are mid-scroll at the edges so a half-visible day
// reads as "more to scroll", not as a broken layout.
const EDGE_FADE =
  'linear-gradient(to right, transparent, black 24px, black calc(100% - 24px), transparent)';

export default function CalendarStrip({ selectedDate, onSelectDate, today, completedDates, taskDates }: Props) {
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const firstScroll = useRef(true);

  // Anchor on the store's `today` (not new Date()) so the strip always agrees
  // with the rest of the app about which day is today, including right after
  // a midnight rollover.
  const anchor = new Date(today + 'T00:00:00');
  const dates: Date[] = [];
  for (let i = -7; i <= 14; i++) {
    const d = new Date(anchor);
    d.setDate(d.getDate() + i);
    dates.push(d);
  }

  useEffect(() => {
    const btn = buttonRefs.current.get(selectedDate);
    if (btn) {
      // Jump instantly on first paint — animating the initial centering makes
      // the whole strip visibly slide on app open.
      btn.scrollIntoView({
        behavior: firstScroll.current ? 'auto' : 'smooth',
        inline: 'center',
        block: 'nearest',
      });
      firstScroll.current = false;
    }
  }, [selectedDate]);

  const selected = new Date(selectedDate + 'T00:00:00');
  const monthLabel = selected.toLocaleDateString(
    'en-US',
    selected.getFullYear() === anchor.getFullYear()
      ? { month: 'long' }
      : { month: 'long', year: 'numeric' },
  );

  return (
    <div>
      {/* Month context + a way back once you've wandered off today */}
      <div className="flex items-center justify-between px-5 pt-1 h-7">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-white/30">
          {monthLabel}
        </span>
        {selectedDate !== today && (
          <button
            onClick={() => onSelectDate(today)}
            className="text-[11px] font-semibold text-[#FF6B35] bg-[#FF6B35]/10 border border-[#FF6B35]/25 rounded-full px-3 py-1 active:scale-95 transition-transform animate-slide-in"
          >
            Back to today
          </button>
        )}
      </div>

      <div
        className="flex gap-1.5 overflow-x-auto px-4 py-2 snap-x scroll-px-4"
        style={{ scrollbarWidth: 'none', maskImage: EDGE_FADE, WebkitMaskImage: EDGE_FADE }}
      >
        {dates.map(date => {
          const ds = toLocalDateStr(date);
          const isSelected = ds === selectedDate;
          const isToday = ds === today;
          const isDone = completedDates.has(ds);
          const hasTasks = taskDates.has(ds);
          const isFuture = ds > today;

          return (
            <button
              key={ds}
              ref={el => { if (el) buttonRefs.current.set(ds, el); else buttonRefs.current.delete(ds); }}
              onClick={() => onSelectDate(ds)}
              aria-label={date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              aria-current={isToday ? 'date' : undefined}
              className={`flex-shrink-0 snap-start flex flex-col items-center gap-1 w-11 py-2.5 rounded-2xl transition-all duration-200 ${
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
                isSelected ? 'text-white'
                  : isToday ? 'text-[#FF6B35]'
                  : isFuture ? 'text-white/40'
                  : 'text-white'
              }`}>
                {date.getDate()}
              </span>
              {/* Done > has-tasks > nothing; keeps days with work findable at a glance */}
              <div className={`w-1.5 h-1.5 rounded-full transition-colors ${
                isDone ? 'bg-green-400'
                  : hasTasks ? (isSelected ? 'bg-white/70' : 'bg-white/25')
                  : 'bg-transparent'
              }`} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
