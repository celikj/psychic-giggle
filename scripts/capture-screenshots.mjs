// Generates App Store screenshots by rendering the real app in Chromium at
// exact device pixel dimensions — no Xcode/Simulator needed, since TaskLock
// is 100% web content with no native chrome. Uses VITE_SCREENSHOT_MODE (see
// src/native/screenTime.ts) to fake an "authorized + apps locked" Screen
// Time status, since the real plugin only exists on-device.
//
// Usage: node scripts/capture-screenshots.mjs

import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const OUT_DIR = 'store-screenshots';
const PORT = 4174;
const BASE_URL = `http://localhost:${PORT}`;

// iPhone only — TaskLock's layout is a fixed phone-width column
// (max-w-md), unoptimized for iPad's wider canvas, so the app is
// iPhone-only (TARGETED_DEVICE_FAMILY "1").
const DEVICES = [
  { name: 'iphone-6.9', width: 440, height: 956, scale: 3 }, // -> 1320x2868px
];

function toLocalDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toLocalDateStr(d);
}

/** A run of consecutive completed dates ending yesterday (not today), so streak flames show without marking today done. */
function streakDates(days) {
  const out = [];
  for (let i = 1; i <= days; i++) out.push(daysAgo(i));
  return out;
}

const today = toLocalDateStr(new Date());

const demoTasks = [
  { id: 't1', title: 'Finish client proposal', completed: false, date: today, priority: 'high', isLocking: true },
  { id: 't2', title: 'Reply to emails', completed: false, date: today, priority: 'medium', isLocking: false },
  { id: 't3', title: 'Book dentist appointment', completed: true, date: today, priority: 'low', isLocking: false },
];

const demoDailies = [
  {
    id: 'd1', title: 'Brush teeth', emoji: '🪥', targetDays: [0, 1, 2, 3, 4, 5, 6], time: '21:00',
    isLocking: true, completedDates: streakDates(12),
  },
  {
    id: 'd2', title: 'Read 10 pages', emoji: '📖', targetDays: [0, 1, 2, 3, 4, 5, 6],
    isLocking: false, completedDates: streakDates(4),
  },
  {
    id: 'd3', title: 'Take vitamins', emoji: '💊', targetDays: [0, 1, 2, 3, 4, 5, 6],
    isLocking: false, completedDates: [today, ...streakDates(6)],
  },
];

const demoHabits = [
  { id: 'h1', title: 'Workout', emoji: '🏃', color: '#EF4444', targetDays: [0, 1, 2, 3, 4, 5, 6], completedDates: streakDates(14) },
  { id: 'h2', title: 'Meditate', emoji: '🧘', color: '#4F9EF8', targetDays: [0, 1, 2, 3, 4, 5, 6], completedDates: streakDates(6) },
  { id: 'h3', title: 'No sugar', emoji: '🍬', color: '#34D399', targetDays: [0, 1, 2, 3, 4, 5, 6], completedDates: streakDates(9) },
];

const seed = {
  tl_onboarded: true,
  tl_starter_done: true,
  tl_screentime_enabled: true,
  tl_tasks: demoTasks,
  tl_dailies: demoDailies,
  tl_habits: demoHabits,
};

async function seedPage(page) {
  await page.addInitScript((seedData) => {
    for (const [key, value] of Object.entries(seedData)) {
      window.localStorage.setItem(`CapacitorStorage.${key}`, JSON.stringify(value));
    }
  }, seed);
}

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(BASE_URL);
      if (res.ok) return;
    } catch {
      /* not up yet */
    }
    await sleep(500);
  }
  throw new Error('preview server never came up');
}

async function capture(browser, device) {
  const dir = `${OUT_DIR}/${device.name}`;
  mkdirSync(dir, { recursive: true });

  const context = await browser.newContext({
    viewport: { width: device.width, height: device.height },
    deviceScaleFactor: device.scale,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await seedPage(page);
  await page.goto(BASE_URL);
  await page.getByRole('button', { name: 'To-Dos' }).waitFor({ timeout: 10_000 });

  const shot = async (label) => {
    await page.waitForTimeout(400); // let enter animations settle
    await page.screenshot({ path: `${dir}/${label}.png` });
    console.log(`  ${device.name}/${label}.png`);
  };

  // 1. Blocker — the core hook
  await page.getByRole('button', { name: 'Blocker' }).click();
  await shot('1-blocker');

  // 2. To-Dos
  await page.getByRole('button', { name: 'To-Dos' }).click();
  await shot('2-todos');

  // 3. Dailies
  await page.getByRole('button', { name: 'Dailies' }).click();
  await shot('3-dailies');

  // 4. Habits
  await page.getByRole('button', { name: 'Habits' }).click();
  await shot('4-habits');

  await context.close();
}

async function main() {
  console.log('Starting preview server (dist-screenshots)...');
  const server = spawn('npx', ['vite', 'preview', '--outDir', 'dist-screenshots', '--port', String(PORT), '--strictPort'], {
    stdio: 'inherit',
    shell: true,
  });

  const cleanup = () => { try { server.kill(); } catch { /* ignore */ } };
  process.on('exit', cleanup);

  try {
    await waitForServer();
    const browser = await chromium.launch(
      process.env.PLAYWRIGHT_CHROMIUM_PATH
        ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
        : {},
    );
    for (const device of DEVICES) {
      console.log(`Capturing ${device.name} (${device.width * device.scale}x${device.height * device.scale}px)...`);
      await capture(browser, device);
    }
    await browser.close();
    console.log(`\nDone. Screenshots in ${OUT_DIR}/`);
  } finally {
    cleanup();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
