export type Locale = 'en' | 'tr';

export const translations = {
  en: {
    // Nav
    tasks: 'Tasks',
    dailies: 'Dailies',
    habits: 'Habits',
    blocker: 'Blocker',
    settings: 'Settings',

    // Tasks View
    appsUnlocked: 'Apps Unlocked',
    leftToUnlock: 'left to unlock',
    tasksComplete: 'tasks complete',
    addTask: 'Add task',
    editTask: 'Edit Task',
    newTask: 'New Task',
    taskTitle: 'Task title...',
    priority: 'Priority',
    low: 'Low',
    med: 'Med',
    high: 'High',
    locksApps: 'Locks apps until done',
    save: 'Save',
    overdue: 'Overdue',
    moveAllToToday: 'Move all to today',
    moveToToday: 'Move to today',

    // Dailies View
    dailiesTitle: 'Dailies',
    dailiesSubtitle: 'Routines and gates',
    addDaily: 'Add daily',
    editDaily: 'Edit Daily',
    newDaily: 'New Daily',
    dailyTitle: 'Daily title...',
    repeat: 'Repeat',
    everyday: 'Everyday',
    weekdays: 'Weekdays',
    weekends: 'Weekends',
    when: 'When',
    anyTime: 'Any time',
    morning: 'Morning (Before 12 PM)',
    evening: 'Evening (After 6 PM)',

    // Habits View
    habitsTitle: 'Habits',
    habitsSubtitle: 'Build good behaviors',
    addHabit: 'Add habit',
    editHabit: 'Edit Habit',
    newHabit: 'New Habit',
    habitTitle: 'Habit title...',

    // Blocker View
    blockerTitle: 'Blocker',
    blockerSubtitle: 'Focus on what matters',
    focusSession: 'Focus Session',
    scheduledBlocks: 'Scheduled Blocks',

    // Settings
    settingsTitle: 'Settings',
    settingsSubtitle: 'Your data, your device',
    language: 'Language',
    autoBackup: 'Auto Backup',
  },
  tr: {
    // Nav
    tasks: 'Görevler',
    dailies: 'Günlükler',
    habits: 'Alışkanlıklar',
    blocker: 'Engelleyici',
    settings: 'Ayarlar',

    // Tasks View
    appsUnlocked: 'Uygulamalar Açık',
    leftToUnlock: 'kaldı',
    tasksComplete: 'görev tamamlandı',
    addTask: 'Görev ekle',
    editTask: 'Görevi Düzenle',
    newTask: 'Yeni Görev',
    taskTitle: 'Görev adı...',
    priority: 'Öncelik',
    low: 'Düşük',
    med: 'Orta',
    high: 'Yüksek',
    locksApps: 'Bitene kadar uygulamaları kilitler',
    save: 'Kaydet',
    overdue: 'Gecikmiş',
    moveAllToToday: 'Hepsini bugüne taşı',
    moveToToday: 'Bugüne taşı',

    // Dailies View
    dailiesTitle: 'Günlükler',
    dailiesSubtitle: 'Rutinler',
    addDaily: 'Günlük ekle',
    editDaily: 'Günlüğü Düzenle',
    newDaily: 'Yeni Günlük',
    dailyTitle: 'Günlük adı...',
    repeat: 'Tekrar',
    everyday: 'Her gün',
    weekdays: 'Hafta içi',
    weekends: 'Hafta sonu',
    when: 'Zaman',
    anyTime: 'Herhangi bir zaman',
    morning: 'Sabah (12:00 öncesi)',
    evening: 'Akşam (18:00 sonrası)',

    // Habits View
    habitsTitle: 'Alışkanlıklar',
    habitsSubtitle: 'İyi davranışlar edin',
    addHabit: 'Alışkanlık ekle',
    editHabit: 'Alışkanlığı Düzenle',
    newHabit: 'Yeni Alışkanlık',
    habitTitle: 'Alışkanlık adı...',

    // Blocker View
    blockerTitle: 'Engelleyici',
    blockerSubtitle: 'Önemli olana odaklan',
    focusSession: 'Odak Sesi',
    scheduledBlocks: 'Zamanlanmış Bloklar',

    // Settings
    settingsTitle: 'Ayarlar',
    settingsSubtitle: 'Verileriniz, cihazınız',
    language: 'Dil',
    autoBackup: 'Oto Yedek',
  }
};

type StringKey = keyof typeof translations.en;

export function t(locale: Locale, key: StringKey): string {
  return translations[locale][key] || translations.en[key] || key;
}

export function getDeviceLocale(): Locale {
  if (typeof navigator === 'undefined') return 'en';
  return navigator.language.startsWith('tr') ? 'tr' : 'en';
}
