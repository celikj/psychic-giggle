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

Run it from **Actions → Sign IPA → Run workflow**:

| Input | Meaning |
| --- | --- |
| `ipa_url` | Direct download URL of the IPA. Blank uses `app.ipa` from the repo root. |
| `bundle_id` | What to sign under. Blank derives `com.<owner>.<app name>`. |
| `udid` | A device UDID to register first. Blank uses whatever devices the account already has. |

The App ID and the provisioning profile are created automatically through the
App Store Connect API key this repo already holds for TestFlight
(`APPSTORE_KEY_ID`, `APPSTORE_ISSUER_ID`, `APPSTORE_PRIVATE_KEY`,
`APPLE_TEAM_ID`). Neither is capped, so neither needs any attention.

### Store the certificate

The **certificate** is the part that does need setting up once, in two
secrets:

| Secret | Contents |
| --- | --- |
| `IOS_SIGNING_P12_BASE64` | base64 of a `.p12` holding the certificate **and its private key** |
| `IOS_SIGNING_P12_PASSWORD` | the password the `.p12` was exported with |

Without them the workflow asks Apple for a new certificate on every run, and
that does not survive contact with reality: a fresh runner can never reuse an
existing certificate, because the private key died with the machine that
created it. Apple caps how many development certificates can exist at once,
so minting one per run exhausts the cap within a couple of runs and then
fails permanently — no amount of revoking keeps up.

Creating the `.p12` takes about five minutes and needs no Mac. On Windows,
Git Bash has the `openssl` used below.

**1. Make a key and a certificate request:**

```sh
openssl genrsa -out ios.key 2048
openssl req -new -key ios.key -out ios.csr -subj "/emailAddress=you@example.com/CN=Your Name/C=TR"
```

**2. Turn it into a certificate.** At
[developer.apple.com](https://developer.apple.com/account/resources/certificates/list)
→ **+** → *Apple Development* → upload `ios.csr` → download `ios.cer`. Revoke
an unused development certificate first if the account is at its cap.

```sh
openssl x509 -in ios.cer -inform DER -out ios.pem -outform PEM
openssl pkcs12 -export -inkey ios.key -in ios.pem -out ios.p12
```

The export password you choose is `IOS_SIGNING_P12_PASSWORD`.

**3. Load the secrets:**

```sh
base64 -w0 ios.p12    # → IOS_SIGNING_P12_BASE64
```

Git Bash and macOS have no `-w0`; use `base64 -i ios.p12` there. Paste into
**Settings → Secrets and variables → Actions**, then delete `ios.key` and
`ios.p12` — anyone holding them can sign as you.

This certificate lasts a year. Rotating it is the same three steps, and a
leaked one is revoked on the same portal page — anything signed with it stops
launching immediately.

### Installing

**A device UDID can't be automated.** No API can discover a phone's UDID; it
is read off the device once and passed via `udid`, after which the device
stays registered. A profile with no devices installs nowhere, so the workflow
fails early rather than letting the install fail silently on the phone.

The job summary prints an `itms-services://` link — open it in Safari on a
registered device, then trust the certificate under Settings → General → VPN
& Device Management.

The IPA and its manifest publish as **public** release assets, because iOS
fetches both itself with no credentials. Delete the release once installed.
