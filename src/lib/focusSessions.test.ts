import { describe, it, expect } from 'vitest';
import { computeActiveSchedules, isFocusActive, createFocusSession } from './focusSessions';

describe('focusSessions', () => {
  describe('isFocusActive', () => {
    it('is true if session ends in the future and is not completed', () => {
      const now = new Date('2026-07-20T10:00:00');
      const session = createFocusSession(25, now);
      expect(isFocusActive(session, now)).toBe(true);
      expect(isFocusActive(session, new Date('2026-07-20T10:24:00'))).toBe(true);
      expect(isFocusActive(session, new Date('2026-07-20T10:26:00'))).toBe(false);
    });
  });

  describe('computeActiveSchedules', () => {
    it('matches schedule within same day', () => {
      const schedule = { id: '1', label: 'Work', startTime: '09:00', endTime: '17:00', days: [1, 2, 3, 4, 5], enabled: true };
      
      // Monday 10:00 (inside)
      const inside = new Date('2026-07-20T10:00:00'); // 2026-07-20 is Monday
      expect(computeActiveSchedules([schedule], inside).length).toBe(1);

      // Monday 08:00 (before)
      const before = new Date('2026-07-20T08:00:00');
      expect(computeActiveSchedules([schedule], before).length).toBe(0);

      // Sunday 10:00 (wrong day)
      const sunday = new Date('2026-07-19T10:00:00');
      expect(computeActiveSchedules([schedule], sunday).length).toBe(0);
    });

    it('matches schedule crossing midnight', () => {
      // 10 PM to 6 AM on Monday means:
      // Active on Monday night at 11 PM
      // Active on Monday morning at 5 AM
      const schedule = { id: '2', label: 'Sleep', startTime: '22:00', endTime: '06:00', days: [1], enabled: true };

      // Monday 11 PM
      const night = new Date('2026-07-20T23:00:00');
      expect(computeActiveSchedules([schedule], night).length).toBe(1);

      // Monday 5 AM
      const morning = new Date('2026-07-20T05:00:00');
      expect(computeActiveSchedules([schedule], morning).length).toBe(1);

      // Monday 12 PM (noon)
      const noon = new Date('2026-07-20T12:00:00');
      expect(computeActiveSchedules([schedule], noon).length).toBe(0);
    });
  });
});
