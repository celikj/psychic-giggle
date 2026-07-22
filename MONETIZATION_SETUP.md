# Monetization setup (RevenueCat + Aptabase)

The app's paywall code is already wired; it stays inert (free tier, telemetry
off) until the keys and store products below exist. Work top to bottom — each
section depends on the one above it.

## 1. App Store Connect (do first — RevenueCat reads from it) — done ✅

- [x] Sign the Paid Applications Agreement.
- [x] Subscription Group with `tasklock_monthly` / `tasklock_annual` created.
- [x] In-App Purchase Key generated and uploaded to RevenueCat.

## 2. RevenueCat — done ✅

- [x] Project + App created, public SDK key added as `REVENUECAT_APPLE_KEY`.
- [x] Products, `premium` entitlement, and default offering configured.
- [x] Verified: a real purchase completes and unlocks premium.

## 3. Free trial (do in App Store Connect — not a code change)

Decision: 7-day free trial on both subscriptions, to reduce the risk of
committing to a purchase and lift conversion off the paywall.

- [ ] App Store Connect → your app → **Subscriptions** → `tasklock_monthly`
      (repeat for `tasklock_annual`) → **Subscription Prices** → the price row
      → **+ Introductory Offer**.
- [ ] Type: **Free Trial**. Duration: **1 Week**. Territories: all (or match
      your existing price territories).
- [ ] Save, and submit the offer for review alongside your next app version
      (introductory offers need Apple's review, same as the subscription
      itself did).
- [ ] RevenueCat reads trial eligibility straight from App Store Connect — no
      separate RC configuration needed. After ~a day for propagation, confirm
      the trial shows up: RevenueCat dashboard → the offering's package →
      should show an introductory price/trial badge.
- [ ] Sandbox-test it in TestFlight with a fresh Sandbox Apple ID (reusing one
      that already "purchased" skips the trial) and confirm the paywall/OS
      purchase sheet shows "7 days free, then $X/period."

## 4. Aptabase (optional, independent of the above)

Switched from TelemetryDeck — same privacy-first positioning, but a free tier
4x the size (200k events/mo vs. 50k) and open-source if you ever want to
self-host for $0. https://aptabase.com

- [ ] Create a project at [aptabase.com](https://aptabase.com), platform
      "Web" (the app runs inside a Capacitor WKWebView, same situation as any
      other JS SDK here — not the native Swift/React Native SDKs).
- [ ] Copy the **App Key** (looks like `A-EU-1234567890` or `A-US-…`). This
      becomes the `APTABASE_APP_KEY` GitHub secret.
- [ ] No entitlement/offering/product setup needed — unlike RevenueCat,
      Aptabase just needs the key to start receiving events.

## 5. GitHub secrets

Settings → Secrets and variables → Actions → New repository secret:

| Secret name             | Value                                       |
| ------------------------ | -------------------------------------------- |
| `REVENUECAT_APPLE_KEY`  | RevenueCat public Apple SDK key (`appl_…`)  |
| `APTABASE_APP_KEY`      | Aptabase App Key (`A-EU-…` / `A-US-…`)      |

These are public client SDK keys (safe to ship in-app); the secret just keeps
them out of git history and lets you rotate without a code change. The iOS
TestFlight workflow injects them into the build as `VITE_*` env vars.

## 6. Ship & test

- [ ] Merge `develop` → `main`.
- [ ] Run the **iOS TestFlight** workflow (next build number).
- [ ] In TestFlight, sign in with a **Sandbox Apple ID** (App Store Connect →
      Users and Access → Sandbox) and confirm the paywall completes a purchase
      and unlocks premium.

> Reminder: subscriptions need Apple's review with the first app submission,
> and products can sit in "Ready to Submit" while you test in sandbox.
