/**
 * Purchase-flow copy, derived from StoreKit's own price data.
 *
 * App Review guideline 3.1.2(c) requires the amount that will actually be
 * billed to be at least as clear and conspicuous as any free trial or
 * introductory price. TaskLock was rejected under it, so none of this text
 * comes from the App Store Connect display name or description any more —
 * those are free-form and can end up leading with "Free". Everything the
 * paywall shows is built here from the structured numbers, so a trial can
 * never be stated without the price that follows it.
 */

/** The slice of RevenueCat's PurchasesIntroPrice this module needs. */
export interface IntroOffer {
  /** 0 for a free trial; non-zero for discounted introductory pricing. */
  price: number;
  priceString: string;
  /** Billing periods the offer covers, e.g. 3 months at the intro price. */
  cycles: number;
  /** DAY | WEEK | MONTH | YEAR */
  periodUnit: string;
  periodNumberOfUnits: number;
}

/** The slice of RevenueCat's PurchasesStoreProduct this module needs. */
export interface ProductLike {
  priceString: string;
  /** ISO 8601 duration, e.g. P1M, P1Y, P3M. Null on some stores. */
  subscriptionPeriod?: string | null;
  introPrice?: IntroOffer | null;
  /** Only used as a last resort when the period is unknown. */
  title?: string;
}

export interface OfferCopy {
  /** Plan name, e.g. "Annual". Never carries offer wording. */
  planName: string;
  /** The billed amount — the most prominent thing in the row. */
  priceString: string;
  /** Billing cadence shown under the price, e.g. "per year". */
  cadence: string;
  /**
   * Offer line, only when there is one. Always names the billed amount so it
   * can never advertise a trial on its own, e.g.
   * "7 days free, then $29.99 per year".
   */
  offerNote: string | null;
  /** Full-sentence disclosure for the terms block. */
  terms: string;
}

const UNIT_NAMES: Record<string, string> = {
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month',
  YEAR: 'year',
};

/** 7, "DAY" -> "7 days"; 1, "MONTH" -> "1 month". */
function countedUnits(count: number, unit: string): string {
  const name = UNIT_NAMES[unit?.toUpperCase()] ?? unit?.toLowerCase() ?? 'period';
  return `${count} ${name}${count === 1 ? '' : 's'}`;
}

/** "P1M" -> { count: 1, unit: 'MONTH' }; null for anything unparseable. */
export function parsePeriod(iso: string | null | undefined): { count: number; unit: string } | null {
  if (!iso) return null;
  const m = /^P(\d+)([DWMY])$/.exec(iso.trim().toUpperCase());
  if (!m) return null;
  const unit = { D: 'DAY', W: 'WEEK', M: 'MONTH', Y: 'YEAR' }[m[2]];
  return unit ? { count: Number(m[1]), unit } : null;
}

/** "per year" for P1Y, "per 3 months" for P3M. */
function cadenceFor(period: { count: number; unit: string } | null): string {
  if (!period) return '';
  const name = UNIT_NAMES[period.unit] ?? 'period';
  return period.count === 1 ? `per ${name}` : `per ${period.count} ${name}s`;
}

/** "Annual" for P1Y, "Monthly" for P1M, "Every 3 months" for P3M. */
function planNameFor(period: { count: number; unit: string } | null, fallback?: string): string {
  if (!period) return fallback?.trim() || 'Subscription';
  if (period.count === 1) {
    switch (period.unit) {
      case 'YEAR': return 'Annual';
      case 'MONTH': return 'Monthly';
      case 'WEEK': return 'Weekly';
      case 'DAY': return 'Daily';
    }
  }
  return `Every ${countedUnits(period.count, period.unit)}`;
}

/**
 * Everything the paywall needs to describe one package, with the billed
 * amount present in every line that mentions an offer.
 */
export function offerCopy(product: ProductLike): OfferCopy {
  const period = parsePeriod(product.subscriptionPeriod);
  const cadence = cadenceFor(period);
  const planName = planNameFor(period, product.title);
  // "$29.99 per year" — or just "$29.99" when the store didn't give a period.
  const billed = cadence ? `${product.priceString} ${cadence}` : product.priceString;

  const intro = product.introPrice;
  if (!intro || intro.periodNumberOfUnits <= 0) {
    return {
      planName,
      priceString: product.priceString,
      cadence,
      offerNote: null,
      terms: `${billed}. Renews automatically until cancelled — manage or cancel anytime in your App Store settings.`,
    };
  }

  const introSpan = countedUnits(intro.periodNumberOfUnits, intro.periodUnit);

  if (intro.price === 0) {
    return {
      planName,
      priceString: product.priceString,
      cadence,
      offerNote: `${introSpan} free, then ${billed}`,
      terms: `Free for ${introSpan}, then ${billed}. The subscription renews automatically until cancelled — cancel at least 24 hours before the trial ends to avoid being charged. Manage or cancel anytime in your App Store settings.`,
    };
  }

  // Discounted introductory pricing rather than a free trial.
  const introSpanTotal = intro.cycles > 1
    ? countedUnits(intro.periodNumberOfUnits * intro.cycles, intro.periodUnit)
    : introSpan;
  return {
    planName,
    priceString: product.priceString,
    cadence,
    offerNote: `${intro.priceString} for ${introSpanTotal}, then ${billed}`,
    terms: `${intro.priceString} for the first ${introSpanTotal}, then ${billed}. Renews automatically until cancelled — manage or cancel anytime in your App Store settings.`,
  };
}
