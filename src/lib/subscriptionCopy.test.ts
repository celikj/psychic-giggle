import { describe, it, expect } from 'vitest';
import { offerCopy, parsePeriod } from './subscriptionCopy';

describe('parsePeriod', () => {
  it('reads the ISO 8601 durations StoreKit returns', () => {
    expect(parsePeriod('P1Y')).toEqual({ count: 1, unit: 'YEAR' });
    expect(parsePeriod('P1M')).toEqual({ count: 1, unit: 'MONTH' });
    expect(parsePeriod('P3M')).toEqual({ count: 3, unit: 'MONTH' });
    expect(parsePeriod('P1W')).toEqual({ count: 1, unit: 'WEEK' });
    expect(parsePeriod('P7D')).toEqual({ count: 7, unit: 'DAY' });
  });

  it('returns null rather than guessing', () => {
    expect(parsePeriod(null)).toBeNull();
    expect(parsePeriod(undefined)).toBeNull();
    expect(parsePeriod('')).toBeNull();
    expect(parsePeriod('1 year')).toBeNull();
  });
});

describe('offerCopy', () => {
  it('names the plan and cadence from the period, not the store listing', () => {
    const copy = offerCopy({ priceString: '$29.99', subscriptionPeriod: 'P1Y', title: '7 DAYS FREE!' });
    expect(copy.planName).toBe('Annual');
    expect(copy.cadence).toBe('per year');
    expect(copy.priceString).toBe('$29.99');
    expect(copy.offerNote).toBeNull();
  });

  it('handles multi-unit periods', () => {
    const copy = offerCopy({ priceString: '$9.99', subscriptionPeriod: 'P3M' });
    expect(copy.planName).toBe('Every 3 months');
    expect(copy.cadence).toBe('per 3 months');
  });

  // The rejection: a trial must never appear without the amount billed after it.
  it('states the billed amount alongside a free trial', () => {
    const copy = offerCopy({
      priceString: '$29.99',
      subscriptionPeriod: 'P1Y',
      introPrice: { price: 0, priceString: '$0.00', cycles: 1, periodUnit: 'DAY', periodNumberOfUnits: 7 },
    });
    expect(copy.offerNote).toBe('7 days free, then $29.99 per year');
    expect(copy.terms).toContain('Free for 7 days, then $29.99 per year');
    expect(copy.terms).toContain('cancel at least 24 hours before the trial ends');
  });

  it('states the billed amount alongside discounted introductory pricing', () => {
    const copy = offerCopy({
      priceString: '$4.99',
      subscriptionPeriod: 'P1M',
      introPrice: { price: 0.99, priceString: '$0.99', cycles: 3, periodUnit: 'MONTH', periodNumberOfUnits: 1 },
    });
    expect(copy.offerNote).toBe('$0.99 for 3 months, then $4.99 per month');
    expect(copy.terms).toContain('$0.99 for the first 3 months, then $4.99 per month');
  });

  it('singularises a one-unit intro period', () => {
    const copy = offerCopy({
      priceString: '$4.99',
      subscriptionPeriod: 'P1M',
      introPrice: { price: 0, priceString: '$0.00', cycles: 1, periodUnit: 'MONTH', periodNumberOfUnits: 1 },
    });
    expect(copy.offerNote).toBe('1 month free, then $4.99 per month');
  });

  it('never advertises an offer the store did not report', () => {
    const copy = offerCopy({ priceString: '$4.99', subscriptionPeriod: 'P1M', introPrice: null });
    expect(copy.offerNote).toBeNull();
    expect(copy.terms).toBe(
      '$4.99 per month. Renews automatically until cancelled — manage or cancel anytime in your App Store settings.'
    );
  });

  it('degrades safely when the store gives no period', () => {
    const copy = offerCopy({ priceString: '$4.99', subscriptionPeriod: null, title: 'TaskLock Premium' });
    expect(copy.planName).toBe('TaskLock Premium');
    expect(copy.cadence).toBe('');
    expect(copy.terms).toContain('$4.99. Renews automatically');
  });
});
