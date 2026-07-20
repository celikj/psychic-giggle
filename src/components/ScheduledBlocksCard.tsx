import { useState } from 'react';
import { Calendar, Plus, Trash2, Smartphone, ChevronRight } from 'lucide-react';
import type { Store } from '../hooks/useStore';
import type { ScreenTimeController } from '../hooks/useScreenTime';
import { computeActiveSchedules } from '../lib/focusSessions';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function ScheduledBlocksCard({ store, st }: { store: Store; st: ScreenTimeController }) {
  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);

  const toggleDay = (d: number) => {
    if (selectedDays.includes(d)) {
      setSelectedDays(prev => prev.filter(x => x !== d));
    } else {
      setSelectedDays(prev => [...prev, d].sort());
    }
  };

  const handleAdd = () => {
    store.addSchedule({
      id: crypto.randomUUID(),
      label,
      startTime,
      endTime,
      days: selectedDays,
      enabled: true,
    });
    setShowForm(false);
    setLabel('');
    setStartTime('09:00');
    setEndTime('17:00');
    setSelectedDays([1, 2, 3, 4, 5]);
  };

  const activeSchedules = computeActiveSchedules(store.scheduledBlocks);

  return (
    <div className="px-4 mt-6">
      <div className="rounded-2xl border border-white/[0.07] bg-[#141417] p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center flex-shrink-0">
            <Calendar className="w-5 h-5 text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">Scheduled Blocks</p>
            <p className="text-xs text-white/40">Lock distractions during fixed hours</p>
          </div>
        </div>

        {st.isNativeIOS && st.status.authorization === 'approved' && (
          <button
            onClick={() => st.chooseApps('tasks')}
            className={`mt-4 w-full flex items-center justify-between py-3.5 px-4 rounded-xl active:scale-95 transition-transform bg-white/5 border border-white/10`}
          >
            <span className="flex items-center gap-2.5 min-w-0">
              <Smartphone className="w-4 h-4 flex-shrink-0 text-white/50" />
              <span className="text-sm font-semibold text-white truncate">
                Uses main app blocker list
              </span>
            </span>
            <span className="text-xs text-white/50 flex items-center gap-1 flex-shrink-0">
              Change <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </button>
        )}

        <div className="mt-4 space-y-3">
          {store.scheduledBlocks.map(block => {
            const isActive = activeSchedules.some(s => s.id === block.id);
            return (
              <div key={block.id} className="flex items-center gap-3 bg-white/[0.02] border border-white/5 rounded-xl p-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-white truncate">{block.label || 'Block'}</p>
                    {isActive && (
                      <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded uppercase">Active</span>
                    )}
                  </div>
                  <p className="text-xs text-white/40 mt-0.5">
                    {block.startTime} - {block.endTime} • {block.days.length === 7 ? 'Every day' : block.days.map(d => DAYS[d]).join(', ')}
                  </p>
                </div>
                
                <button
                  onClick={() => store.toggleSchedule(block.id)}
                  className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 ${block.enabled ? 'bg-blue-500' : 'bg-white/15'}`}
                >
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${block.enabled ? 'left-5' : 'left-1'}`} />
                </button>
                <button
                  onClick={() => store.deleteSchedule(block.id)}
                  className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-white/5"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>

        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 text-sm font-semibold transition-colors border border-white/10 border-dashed"
          >
            <Plus className="w-4 h-4" /> Add Schedule
          </button>
        ) : (
          <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
            <input
              type="text"
              placeholder="Label (e.g. Work hours)"
              value={label}
              onChange={e => setLabel(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50"
            />
            
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-white/40 ml-1 mb-1 block">Start Time</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50 [color-scheme:dark]"
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-white/40 ml-1 mb-1 block">End Time</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50 [color-scheme:dark]"
                />
              </div>
            </div>

            <div className="flex gap-1 justify-between">
              {DAYS.map((d, i) => (
                <button
                  key={d}
                  onClick={() => toggleDay(i)}
                  className={`w-8 h-8 rounded-full text-xs font-semibold flex items-center justify-center transition-colors ${
                    selectedDays.includes(i) ? 'bg-blue-500 text-white' : 'bg-black/20 text-white/40 border border-white/5'
                  }`}
                >
                  {d[0]}
                </button>
              ))}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 rounded-lg bg-white/5 text-white text-sm font-semibold active:scale-95 transition-transform"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={selectedDays.length === 0}
                className="flex-1 py-2.5 rounded-lg bg-blue-500 text-white text-sm font-semibold active:scale-95 transition-transform disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
