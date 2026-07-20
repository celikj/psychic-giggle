
export interface FocusSession {
  id: string;
  duration: number;      // minutes
  startedAt: string;     // ISO timestamp
  endsAt: string;        // ISO timestamp
  completed: boolean;
}

export interface ScheduledBlock {
  id: string;
  label: string;         // e.g., "Work hours"
  startTime: string;     // "HH:MM"
  endTime: string;       // "HH:MM"
  days: number[];        // weekday indices 0-6
  enabled: boolean;
}

export function createFocusSession(durationMins: number, now: Date = new Date()): FocusSession {
  const startedAt = now.toISOString();
  const ends = new Date(now.getTime() + durationMins * 60000);
  return {
    id: crypto.randomUUID(),
    duration: durationMins,
    startedAt,
    endsAt: ends.toISOString(),
    completed: false,
  };
}

export function isFocusActive(session: FocusSession | null, now: Date = new Date()): boolean {
  if (!session || session.completed) return false;
  return new Date(session.endsAt).getTime() > now.getTime();
}

export function focusTimeRemaining(session: FocusSession | null, now: Date = new Date()): number {
  if (!session || session.completed) return 0;
  const ms = new Date(session.endsAt).getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / 1000));
}

export function isInScheduledBlock(blocks: ScheduledBlock[], now: Date = new Date()): boolean {
  return computeActiveSchedules(blocks, now).length > 0;
}

export function computeActiveSchedules(blocks: ScheduledBlock[], now: Date = new Date()): ScheduledBlock[] {
  const currentDay = now.getDay();
  const h = now.getHours();
  const m = now.getMinutes();
  const currentMinutes = h * 60 + m;

  return blocks.filter(b => {
    if (!b.enabled) return false;
    if (!b.days.includes(currentDay)) return false;

    const [sh, sm] = b.startTime.split(':').map(Number);
    const startMins = sh * 60 + sm;
    
    const [eh, em] = b.endTime.split(':').map(Number);
    const endMins = eh * 60 + em;

    if (startMins <= endMins) {
      return currentMinutes >= startMins && currentMinutes < endMins;
    } else {
      // Crosses midnight (e.g. 22:00 to 06:00)
      // On the current day, it's active if it's after start OR before end
      return currentMinutes >= startMins || currentMinutes < endMins;
    }
  });
}
