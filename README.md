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

## Signing an IPA for a device

The **Sign IPA** workflow (`.github/workflows/sign-ipa.yml`) re-signs any
`.ipa` and publishes it for over-the-air install, so a device can be
provisioned with no Mac, Xcode or iTunes involved.

It needs no signing secrets and creates no certificates. The app is wrapped in
an `.xcarchive` and handed to `xcodebuild -exportArchive` with automatic
signing — the same mechanism the TestFlight workflow uses on the real app.
Xcode fetches a **cloud-managed** certificate, whose private key Apple holds
rather than the build machine, so any runner can retrieve it. The App Store
Connect API key already in the repo (`APPSTORE_KEY_ID`, `APPSTORE_ISSUER_ID`,
`APPSTORE_PRIVATE_KEY`, `APPLE_TEAM_ID`) is all the authentication involved.

An earlier version had fastlane issue a certificate on each run instead. That
cannot work: a fresh runner can never reuse an existing certificate, because
the private key died with the machine that made it, and Apple caps how many
can exist — so it failed permanently after two runs, and revoking certificates
only ever bought one more.

Run it from **Actions → Sign IPA → Run workflow**:

| Input | Meaning |
| --- | --- |
| `ipa_url` | Direct download URL of the IPA. Blank uses `app.ipa` from the repo root. |
| `bundle_id` | What to sign under. Blank derives `com.<owner>.<app name>`. |
| `udid` | A device UDID to register first. Blank uses whatever devices the account already has. |

The bundle id is rewritten before signing, because bundle ids are globally
unique across all Apple developers — a third-party app's own id belongs to
whoever built it and can't be registered here.

**A device UDID can't be automated.** No API can discover a phone's UDID; it
is read off the device once and passed via `udid`, after which the device
stays registered.

The job summary prints an `itms-services://` link — open it in Safari on a
registered device, then trust the certificate under Settings → General → VPN
& Device Management.

The IPA and its manifest publish as **public** release assets, because iOS
fetches both itself with no credentials. Delete the release once installed.
