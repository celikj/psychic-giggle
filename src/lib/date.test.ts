import { describe, it, expect } from 'vitest';
import { toLocalDateStr, localToday } from './date';

describe('toLocalDateStr', () => {
  it('formats a local date with zero-padded month and day', () => {
    expect(toLocalDateStr(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(toLocalDateStr(new Date(2026, 11, 31))).toBe('2026-12-31');
  });

  it('uses the local wall-clock date, not the UTC date — the historical bug this guards against', () => {
    const originalTZ = process.env.TZ;
    process.env.TZ = 'Pacific/Kiritimati'; // UTC+14, one of the furthest-ahead zones
    try {
      // 23:30 UTC on the 15th is already 13:30 on the 16th in this zone.
      const instant = new Date(Date.UTC(2026, 0, 15, 23, 30));
      expect(toLocalDateStr(instant)).toBe('2026-01-16');
      // toISOString (UTC) says the 15th — exactly the bug that shifted
      // "today" for locking tasks in timezones ahead of UTC.
      expect(instant.toISOString().slice(0, 10)).toBe('2026-01-15');
    } finally {
      process.env.TZ = originalTZ;
    }
  });
});

describe('localToday', () => {
  it('matches toLocalDateStr(new Date())', () => {
    expect(localToday()).toBe(toLocalDateStr(new Date()));
  });
});
