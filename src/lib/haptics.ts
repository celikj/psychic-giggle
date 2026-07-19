import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();

/** Light tap for a check-off / toggle. */
export async function hapticTick(): Promise<void> {
  if (!isNative) return;
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch { /* haptics unavailable — silent no-op */ }
}

/** Slightly heavier tap for a destructive action. */
export async function hapticDelete(): Promise<void> {
  if (!isNative) return;
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: ImpactStyle.Medium });
  } catch { /* silent no-op */ }
}

/** Success buzz for the unlock celebration. */
export async function hapticSuccess(): Promise<void> {
  if (!isNative) return;
  try {
    const { Haptics, NotificationType } = await import('@capacitor/haptics');
    await Haptics.notification({ type: NotificationType.Success });
  } catch { /* silent no-op */ }
}

/** Warning buzz for a rejected barcode scan. */
export async function hapticWarning(): Promise<void> {
  if (!isNative) return;
  try {
    const { Haptics, NotificationType } = await import('@capacitor/haptics');
    await Haptics.notification({ type: NotificationType.Warning });
  } catch { /* silent no-op */ }
}
