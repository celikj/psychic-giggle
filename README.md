# TaskLock

TaskLock blocks distracting apps until your tasks are actually done — enforced
with Apple's Screen Time framework, not a timer you can just dismiss.

Mark a to-do or daily routine as **Locking**, and the apps you choose stay
blocked system-wide until it's checked off. Timed routines lock apps from a
specific time (e.g. 9 PM until you've brushed your teeth). An optional
barcode-scan requirement means a routine can't be marked done without proof.

## Features

- Locking to-dos and daily routines, with per-day streaks
- Plain habit tracking (no blocking) for lighter-weight goals
- Focus Sessions and Scheduled Blocks for time-boxed locking
- Strict Mode, and a once-a-day Emergency Pass for real emergencies
- Home screen widget with today's lock status
- Free tier, with a premium subscription for unlimited locking items

## Architecture

- React + TypeScript + Vite + Tailwind, wrapped as a native iOS app with
  [Capacitor](https://capacitorjs.com)
- Native Swift layer: a custom `ScreenTime` Capacitor plugin over Apple's
  Family Controls / DeviceActivity / ManagedSettings frameworks, plus three
  app extensions — a custom Shield UI, a DeviceActivity monitor that
  re-applies blocks even if the app is never opened, and a WidgetKit home
  screen widget — sharing state through an App Group
- RevenueCat for subscriptions, Aptabase for privacy-first analytics
- CI on every push: typecheck, Vitest unit tests, Playwright e2e, and an
  unsigned iOS compile check; cloud-signed TestFlight builds via GitHub
  Actions

## Stack

React · TypeScript · Vite · Tailwind CSS · Capacitor · Swift (Family
Controls, DeviceActivity, ManagedSettings, WidgetKit) · RevenueCat · Aptabase

## App Store

Pending review — link coming soon.
