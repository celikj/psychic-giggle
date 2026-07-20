export interface FreezeInventory {
  used: number;
  total: number;       // free: 1/month, premium: 3/month
  remaining: number;
}

export function computeFreezeInventory(
  isPremium: boolean,
  freezesUsedThisMonth: number,
): FreezeInventory {
  const total = isPremium ? 3 : 1;
  const remaining = Math.max(0, total - freezesUsedThisMonth);
  return { used: freezesUsedThisMonth, total, remaining };
}

export function canApplyFreeze(inventory: FreezeInventory): boolean {
  return inventory.remaining > 0;
}
