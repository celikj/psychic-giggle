# App Store review notes

Two things App Review's automated checks rejected the first submission for, what
was actually wrong, and how to clear each one.

## 1. Terms of Use (EULA) link missing from the metadata

> The submission offers auto-renewable subscriptions but does not include a
> functional link to the Terms of Use (EULA) in the app's metadata.

This one is **metadata only — nothing in this repo needs to change.** The app
itself already satisfies guideline 3.1.2: the paywall
(`src/components/PaywallView.tsx`) and Settings (`src/components/SettingsView.tsx`)
both link Apple's standard EULA and the privacy policy from
`src/lib/links.ts`, next to the auto-renewal disclosure. The reviewer's checker
looks at App Store Connect, not the binary.

TaskLock uses Apple's standard EULA, so take the App Description route:

1. App Store Connect → **Apps → TaskLock → the version pending review**.
2. In **Description**, append a line (the URL must be plain text — the
   Description field doesn't render links, and the checker wants a full URL):

   ```
   Terms of Use (EULA): https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
   Privacy Policy: https://celikj.github.io/tasklock-legal/privacy-policy.html
   ```

3. While you're in there, confirm the Description also states, for each
   auto-renewable product: title, subscription length, and price. Guideline
   3.1.2 wants those in the metadata as well as on the paywall.
4. Fill in the **Privacy Policy URL** field on the same page if it's empty.
5. Save, then reply in Resolution Center that the Terms of Use link is now in
   the App Description.

If you ever switch to custom terms instead, put them in **App Information →
License Agreement → Edit → Custom License Agreement**, and this Description line
becomes optional. `TERMS_OF_USE_URL` in `src/lib/links.ts` has to point at the
same document either way.

## 2. Family Controls entitlement missing from the submitted binary

> An automated analysis indicates the app uses one or more Screen Time APIs but
> the app has not been submitted with the Family Controls entitlement.

The entitlement request being approved is only step one — the rejection is about
the *binary that was uploaded*, and there was a real bug behind it.

### What was wrong

`ios/App/Shared/TaskLockShared.swift` was compiled into all three of the app,
the `TaskMonitor` extension **and the `TaskLockWidget` extension**, and it
imported `FamilyControls` / `ManagedSettings` under `#if canImport(...)`. On the
device SDK that condition is true, so the widget's binary linked two Screen Time
frameworks — while `TaskLockWidget.entitlements` (correctly) declared no
Family Controls entitlement, because the widget doesn't do any blocking.

Apple's analysis runs per binary. The app and the monitor extension were fine;
the widget was a Screen Time API user with no entitlement, which is exactly what
the automated scan flags.

The Screen Time helpers now live in `ios/App/Shared/TaskLockShield.swift`, which
only the app and `TaskMonitor` targets compile. `TaskLockShared.swift` — the
part the widget needs — is free of Screen Time imports and must stay that way.

### What to do now

1. In [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/identifiers/list),
   confirm **Family Controls** is enabled under Capabilities for both App IDs
   that need it:
   - `com.celikj.tasklock` (the app)
   - `com.celikj.tasklock.TaskMonitor` (DeviceActivity monitor)
   - `com.celikj.tasklock.ShieldConfig` (shield UI — links ManagedSettings)

   `com.celikj.tasklock.TaskLockWidget` does **not** need it, and shouldn't have
   it. Automatic signing cannot enable a restricted capability for you; if it
   isn't ticked in the portal, the profile won't grant it.
2. Run the **iOS TestFlight** workflow with a bumped build number. It now fails
   before upload if any signed binary links a Screen Time framework without the
   entitlement.
3. Attach the new build to the version and reply in Resolution Center saying the
   build now ships the Family Controls entitlement.

### The two checks guarding this

| Check | Runs | Catches |
| --- | --- | --- |
| `npm run check:entitlements` | every CI run, no Xcode needed | a target compiling Screen Time code without the entitlement — the bug above |
| `scripts/verify-ipa-entitlements.sh <ipa>` | in the TestFlight workflow, before upload | the entitlement being dropped at signing time because a profile doesn't grant it |

The second one exists because a missing capability on the App ID doesn't fail
the build: `xcodebuild -exportArchive` re-signs with what the profile allows and
strips the rest, so the upload succeeds and App Review is the first to notice.
Run it locally against an export with:

```sh
scripts/verify-ipa-entitlements.sh ~/Library/Developer/Xcode/Archives/.../App.ipa
```
