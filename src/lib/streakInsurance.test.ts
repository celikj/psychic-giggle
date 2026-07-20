import { describe, it, expect } from 'vitest';
import { computeFreezeInventory, canApplyFreeze } from './streakInsurance';

describe('streakInsurance', () => {
  describe('computeFreezeInventory', () => {
    it('free tier gets 1 freeze', () => {
      const inv = computeFreezeInventory(false, 0);
      expect(inv.total).toBe(1);
      expect(inv.remaining).toBe(1);
      expect(inv.used).toBe(0);
    });

    it('premium tier gets 3 freezes', () => {
      const inv = computeFreezeInventory(true, 1);
      expect(inv.total).toBe(3);
      expect(inv.remaining).toBe(2);
      expect(inv.used).toBe(1);
    });

    it('remaining never goes below zero', () => {
      const inv = computeFreezeInventory(false, 5);
      expect(inv.total).toBe(1);
      expect(inv.remaining).toBe(0);
      expect(inv.used).toBe(5);
    });
  });

  describe('canApplyFreeze', () => {
    it('is true when remaining > 0', () => {
      expect(canApplyFreeze({ total: 3, used: 1, remaining: 2 })).toBe(true);
    });

    it('is false when remaining is 0', () => {
      expect(canApplyFreeze({ total: 1, used: 1, remaining: 0 })).toBe(false);
    });
  });
});
