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

It adds no secrets. The App Store Connect API key already used for TestFlight
(`APPSTORE_KEY_ID`, `APPSTORE_ISSUER_ID`, `APPSTORE_PRIVATE_KEY`,
`APPLE_TEAM_ID`) is enough: fastlane generates a keypair on the runner, has
Apple issue a development certificate against it, registers the App ID, and
builds a provisioning profile. The certificate never leaves the job, and the
keychain holding it is deleted in an `always()` step.

Run it from **Actions → Sign IPA → Run workflow**:

| Input | Meaning |
| --- | --- |
| `ipa_url` | Direct download URL of the IPA. Blank uses `app.ipa` from the repo root. |
| `bundle_id` | What to sign under. Blank derives `com.<owner>.<app name>`. |
| `udid` | A device UDID to register first. Blank uses whatever devices the account already has. |

The bundle id is rewritten before signing because bundle ids are globally
unique across all Apple developers — a third-party app's own id belongs to
whoever built it and can't be registered here.

**A device UDID is the one thing that can't be automated.** No API can
discover a phone's UDID; it has to be read off the device once and passed in
via `udid`. After that the device stays registered and the input can be left
blank. A profile with no devices installs nowhere, so the workflow fails
early and says so rather than letting the install fail silently on the phone.

The job summary prints an `itms-services://` link — open it in Safari on a
registered device, then trust the certificate under Settings → General → VPN
& Device Management.

The IPA and its manifest are published as **public** release assets, because
iOS fetches both itself with no credentials. Delete the release once the app
is installed.

Apple caps how many development certificates can exist at once, and each run
issues a new one. If a run fails on that limit, revoke the unused ones in
[Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/certificates/list) —
that is also where a leaked certificate is revoked, and anything signed with
it stops launching immediately.
