# Monetization setup (RevenueCat + TelemetryDeck)

The app's paywall code is already wired; it stays inert (free tier, telemetry
off) until the keys and store products below exist. Work top to bottom — each
section depends on the one above it.

## 1. App Store Connect (do first — RevenueCat reads from it)

- [ ] **Sign the Paid Applications Agreement.** App Store Connect → Business →
      Agreements. In-app purchases fail silently without it.
- [ ] App record exists already: bundle id `com.celikj.tasklock`.
- [ ] Create a **Subscription Group** with two auto-renewable subscriptions,
      e.g. `tasklock_monthly` ($4.99/mo) and `tasklock_annual` ($29.99/yr).
      Add localized name/description and pricing for each.
- [ ] Generate an **In-App Purchase Key** (Users and Access → Integrations →
      In-App Purchase). RevenueCat uses it to validate receipts. Download the
      `.p8` (one-time download) and note the Key ID + Issuer ID.

## 2. RevenueCat

- [ ] Create a **Project**.
- [ ] Add an **App** → App Store → bundle id `com.celikj.tasklock`, and upload
      the In-App Purchase key from step 1.
- [ ] Copy the app's **public SDK key** (starts with `appl_`). This becomes the
      `REVENUECAT_APPLE_KEY` GitHub secret.
- [ ] **Products:** import the two subscriptions from App Store Connect.
- [ ] **Entitlement:** create one with the identifier **`premium`** (exact —
      the app checks `customerInfo.entitlements.active['premium']`). Attach
      both products to it.
- [ ] **Offering:** create/keep a `default` offering with a monthly and an
      annual **package** pointing at the two products. The paywall renders
      `offerings.current.availablePackages`.

## 3. TelemetryDeck (optional, independent of the above)

- [ ] Create an app in the TelemetryDeck dashboard; copy its **App ID** (UUID).
      This becomes the `TELEMETRYDECK_APP_ID` GitHub secret.

## 4. GitHub secrets

Settings → Secrets and variables → Actions → New repository secret:

| Secret name             | Value                                             |
| ----------------------- | ------------------------------------------------- |
| `REVENUECAT_APPLE_KEY`  | RevenueCat public Apple SDK key (`appl_…`)         |
| `TELEMETRYDECK_APP_ID`  | TelemetryDeck App ID (UUID)                        |

These are public client SDK keys (safe to ship in-app); the secret just keeps
them out of git history and lets you rotate without a code change. The iOS
TestFlight workflow injects them into the build as `VITE_*` env vars.

## 5. Ship & test

- [ ] Merge `develop` → `main`.
- [ ] Run the **iOS TestFlight** workflow (next build number).
- [ ] In TestFlight, sign in with a **Sandbox Apple ID** (App Store Connect →
      Users and Access → Sandbox) and confirm the paywall completes a purchase
      and unlocks premium.

> Reminder: subscriptions need Apple's review with the first app submission,
> and products can sit in "Ready to Submit" while you test in sandbox.
