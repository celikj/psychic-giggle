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

## Rotating the signing secrets

The **Sign IPA** workflow (`.github/workflows/sign-ipa.yml`) re-signs an `.ipa`
with a certificate held in repo secrets, so a device can be provisioned without
a Mac. It reads three secrets, none of which the TestFlight workflow uses —
that one signs through the App Store Connect API key instead:

| Secret | Contents |
| --- | --- |
| `IOS_SIGNING_P12_BASE64` | base64 of a `.p12` holding the certificate **and its private key** |
| `IOS_SIGNING_P12_PASSWORD` | the password the `.p12` was exported with |
| `IOS_PROVISIONING_PROFILE_BASE64` | base64 of the matching `.mobileprovision` |

Certificates last a year and profiles expire with them, so this needs redoing
annually. No Mac required at any point.

**1. Make a key and a certificate request.** Any machine with `openssl` (Git
for Windows ships one; `a-Shell` on iOS also works):

```sh
openssl genrsa -out ios.key 2048
openssl req -new -key ios.key -out ios.csr -subj "/emailAddress=you@example.com/CN=Your Name/C=TR"
```

**2. Turn it into a certificate.** At
[developer.apple.com](https://developer.apple.com/account/resources/certificates/list)
→ **+** → *Apple Development* → upload `ios.csr` → download `ios.cer`. Then:

```sh
openssl x509 -in ios.cer -inform DER -out ios.pem -outform PEM
openssl pkcs12 -export -inkey ios.key -in ios.pem -out ios.p12
```

The export password you choose here is `IOS_SIGNING_P12_PASSWORD`.

**3. Make a provisioning profile.** Still in the portal: register the target
device's UDID under **Devices**, create an App ID (a wildcard `*` one covers
any app), then create an *iOS App Development* profile tying the certificate,
App ID and devices together, and download it. **Only devices listed in this
profile can install the result** — that is the usual reason an OTA install
silently fails.

**4. Load the secrets.**

```sh
base64 -w0 ios.p12                  # → IOS_SIGNING_P12_BASE64
base64 -w0 profile.mobileprovision  # → IOS_PROVISIONING_PROFILE_BASE64
```

macOS and Git Bash have no `-w0`; use `base64 -i ios.p12` there. Paste each
into **Settings → Secrets and variables → Actions**. Delete `ios.key` and
`ios.p12` afterwards — anyone holding them can sign as you.

**5. Enable Pages once.** Settings → Pages → *Deploy from a branch* →
`gh-pages`. The workflow writes `manifest.plist` there; without Pages the
`itms-services://` link in the job summary has nothing to fetch.

Revoking a leaked certificate is done in the same portal page as step 2;
anything signed with it stops launching once revoked.
