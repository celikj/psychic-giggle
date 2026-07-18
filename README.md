# 🔒 TaskLock

Lock distracting apps until your tasks are done. A task manager, habit tracker, and app blocker in one — a polished web clone of the TaskLock concept.

## Features

- **Tasks** — priorities (low/medium/high), a calendar strip, and a progress ring. Mark any task as a **Locking Task** to gate your apps behind it.
- **Habits** — streaks, best-streak tracking, a last-7-days dot grid, custom emoji/colors, and target days.
- **App Blocker** — distracting sites stay locked until every locking task for today is done. Finishing the last one triggers an unlock celebration.
- Everything persists locally in your browser. Nothing is uploaded.

## Run it

### Option 1 — Standalone HTML (no install)
Download **`TaskLock.html`** from the [Releases](../../releases) page and double-click it. The whole app is inlined into that one file.

### Option 2 — Desktop executable
Download the binary for your platform from [Releases](../../releases):

| Platform | File |
|----------|------|
| 🪟 Windows (x64) | `tasklock-win-x64.exe` |
| 🍎 macOS (Apple Silicon) | `tasklock-macos-arm64` |
| 🍎 macOS (Intel) | `tasklock-macos-x64` |
| 🐧 Linux (x64) | `tasklock-linux-x64` |
| 🐧 Linux (arm64) | `tasklock-linux-arm64` |

It starts a tiny local server and opens TaskLock in your browser. On macOS/Linux run `chmod +x tasklock-*` first.

### Option 3 — iPhone / iPad (native iOS app)
TaskLock ships as a real native iOS app via [Capacitor](https://capacitorjs.com).

**Without a Mac** — download `TaskLock-unsigned.ipa` from [Releases](../../releases) and install it with [AltStore](https://altstore.io) or [Sideloadly](https://sideloadly.io) using a free Apple ID (works from Windows too). Free-Apple-ID sideloads expire after 7 days and need a refresh.

**With a Mac** — open the Xcode project and run it on your device:
```bash
npm install
npm run build
npx cap sync ios
npx cap open ios     # opens ios/App/App.xcodeproj in Xcode
```
In Xcode: select your iPhone, set a Team under *Signing & Capabilities* (a free personal team works), then press ▶︎ Run. Bundle id is `com.tasklock.app`.

> Note: the in-app "App Blocker" demonstrates the flow, but actually blocking *other* iOS apps requires Apple's Screen Time / Family Controls entitlement, which is a separate native integration.

### Option 4 — From source (web)

```bash
npm install
npm run dev        # development server
```

## Build

```bash
npm run build         # static site -> dist/
npm run build:single  # self-contained single-file -> dist-single/index.html
npm run build:exe     # native executable for the current OS -> release/ (uses Bun)
```

## Releases

Pushing a `v*` tag (or running the **Release** workflow manually) builds the
executables for all platforms and the standalone HTML, then publishes them to a
GitHub Release. See [`.github/workflows/release.yml`](.github/workflows/release.yml).

## Stack

React + TypeScript + Vite + Tailwind CSS. Executables are produced by inlining
the single-file build into a launcher and cross-compiling with `bun build --compile`.
