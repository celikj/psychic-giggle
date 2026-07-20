import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';
import type { Task, Habit, Daily } from '../types';

export interface BackupData {
  version: 1;
  exportedAt: string;
  tasks: Task[];
  habits: Habit[];
  dailies: Daily[];
}

const KEYS = { tasks: 'tl_tasks', habits: 'tl_habits', dailies: 'tl_dailies' } as const;

async function readArray<T>(key: string): Promise<T[]> {
  const { value } = await Preferences.get({ key });
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function buildBackup(): Promise<BackupData> {
  const [tasks, habits, dailies] = await Promise.all([
    readArray<Task>(KEYS.tasks),
    readArray<Habit>(KEYS.habits),
    readArray<Daily>(KEYS.dailies),
  ]);
  return { version: 1, exportedAt: new Date().toISOString(), tasks, habits, dailies };
}

function isBackupData(data: unknown): data is BackupData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return Array.isArray(d.tasks) && Array.isArray(d.habits) && Array.isArray(d.dailies);
}

/** Writes a backup straight to Preferences. Callers must reload the app afterward — the running useStore state won't pick this up on its own. */
export async function restoreBackup(data: unknown): Promise<void> {
  if (!isBackupData(data)) {
    throw new Error("That file doesn't look like a TaskLock backup.");
  }
  await Promise.all([
    Preferences.set({ key: KEYS.tasks, value: JSON.stringify(data.tasks) }),
    Preferences.set({ key: KEYS.habits, value: JSON.stringify(data.habits) }),
    Preferences.set({ key: KEYS.dailies, value: JSON.stringify(data.dailies) }),
  ]);
}

function backupFilename(data: BackupData): string {
  return `tasklock-backup-${data.exportedAt.slice(0, 10)}.json`;
}

/** Native: writes to the cache dir and opens the share sheet (Files, AirDrop, Mail…). Web: triggers a normal download. */
export async function shareBackup(): Promise<void> {
  const data = await buildBackup();
  const json = JSON.stringify(data, null, 2);
  const filename = backupFilename(data);

  if (Capacitor.isNativePlatform()) {
    const [{ Filesystem, Directory, Encoding }, { Share }] = await Promise.all([
      import('@capacitor/filesystem'),
      import('@capacitor/share'),
    ]);
    await Filesystem.writeFile({ path: filename, data: json, directory: Directory.Cache, encoding: Encoding.UTF8 });
    const { uri } = await Filesystem.getUri({ path: filename, directory: Directory.Cache });
    await Share.share({ title: 'TaskLock Backup', url: uri });
    return;
  }

  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Opens the system file picker, reads the chosen JSON file, and restores it to Preferences. Resolves once written — the caller should reload the app. */
export function pickAndRestoreBackup(): Promise<void> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) { reject(new Error('No file selected.')); return; }
      try {
        const text = await file.text();
        await restoreBackup(JSON.parse(text));
        resolve();
      } catch (e) {
        reject(e instanceof Error ? e : new Error('Could not read that file.'));
      }
    };
    input.click();
  });
}

const AUTO_BACKUP_FILENAME = 'tasklock_auto_backup.json';

/** Writes JSON to app's Documents/ directory (iCloud-backed) */
export async function autoBackupToDocuments(data: BackupData): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
    await Filesystem.writeFile({
      path: AUTO_BACKUP_FILENAME,
      data: JSON.stringify(data),
      directory: Directory.Documents,
      encoding: Encoding.UTF8
    });
  } catch (err) {
    console.error('Failed to auto-backup:', err);
  }
}

/** Checks if a backup file exists in Documents/ but store is empty */
export async function checkForExistingBackup(): Promise<BackupData | null> {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
    const result = await Filesystem.readFile({
      path: AUTO_BACKUP_FILENAME,
      directory: Directory.Documents,
      encoding: Encoding.UTF8
    });
    
    // Result data can be string or Blob
    const dataStr = typeof result.data === 'string' ? result.data : await result.data.text();
    const parsed = JSON.parse(dataStr);
    
    if (isBackupData(parsed)) {
      return parsed as BackupData;
    }
    return null;
  } catch (err) {
    // Expected on first launch
    return null;
  }
}
