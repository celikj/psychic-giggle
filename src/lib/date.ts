/**
 * Date strings throughout the app are local-timezone `YYYY-MM-DD`.
 * `toISOString()` is UTC and shifts the date for anyone east of Greenwich
 * between midnight and their UTC offset — never use it for day keys.
 */
export function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const localToday = (): string => toLocalDateStr(new Date());
