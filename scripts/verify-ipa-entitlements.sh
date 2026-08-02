#!/usr/bin/env bash
# Verifies a signed .ipa the way App Review's automated analysis does: every
# binary that links a Screen Time framework must carry the Family Controls
# entitlement. macOS only (needs codesign/otool) — run it on the export before
# uploading.
#
#   scripts/verify-ipa-entitlements.sh path/to/App.ipa
#
# The static check (scripts/check-screentime-entitlements.mjs) catches the
# project-level mistake. This one catches the signing-level one: entitlements a
# provisioning profile doesn't grant get dropped during export, so a build can
# ship without Family Controls even though the entitlements file declares it.
# That produces a binary Apple flags but Xcode never complains about.

set -euo pipefail

ENTITLEMENT="com.apple.developer.family-controls"
SCREEN_TIME_RE="FamilyControls|ManagedSettings|ManagedSettingsUI|DeviceActivity"

IPA="${1:-}"
if [ -z "$IPA" ] || [ ! -f "$IPA" ]; then
  echo "usage: $0 path/to/App.ipa" >&2
  exit 2
fi

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
unzip -q "$IPA" -d "$WORK"

APP="$(find "$WORK/Payload" -maxdepth 1 -name '*.app' | head -1)"
if [ -z "$APP" ]; then
  echo "No .app found inside $IPA" >&2
  exit 1
fi

failures=0

check_bundle() {
  local bundle="$1"
  local name
  name="$(basename "$bundle")"

  local exe
  exe="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleExecutable' "$bundle/Info.plist" 2>/dev/null || true)"
  if [ -z "$exe" ] || [ ! -f "$bundle/$exe" ]; then
    echo "  ? $name: no executable found, skipping"
    return
  fi

  local frameworks
  frameworks="$(otool -L "$bundle/$exe" | grep -oE "$SCREEN_TIME_RE" | sort -u | tr '\n' ' ' || true)"

  local ents
  ents="$(codesign -d --entitlements :- --xml "$bundle" 2>/dev/null || true)"
  [ -n "$ents" ] || ents="$(codesign -d --entitlements :- "$bundle" 2>/dev/null | tr -d '\0' || true)"

  local has_entitlement=no
  printf '%s' "$ents" > "$WORK/ents.plist"
  if /usr/libexec/PlistBuddy -c "Print :$ENTITLEMENT" "$WORK/ents.plist" 2>/dev/null | grep -qi true; then
    has_entitlement=yes
  elif printf '%s' "$ents" | grep -A1 "$ENTITLEMENT" | grep -q '<true/>'; then
    has_entitlement=yes
  fi

  if [ -n "${frameworks// /}" ]; then
    if [ "$has_entitlement" = yes ]; then
      echo "  ✓ $name links ${frameworks%% } and is signed with $ENTITLEMENT"
    else
      echo "  ✗ $name links ${frameworks%% } but the SIGNED binary has no $ENTITLEMENT"
      echo "      Enable Family Controls on the App ID for this bundle in Certificates,"
      echo "      Identifiers & Profiles, regenerate the profile, and re-archive."
      failures=$((failures + 1))
    fi
  else
    echo "  · $name links no Screen Time framework$([ "$has_entitlement" = yes ] && echo " (but carries $ENTITLEMENT)")"
  fi
}

echo "Checking signed entitlements in $(basename "$IPA"):"
check_bundle "$APP"
for appex in "$APP"/PlugIns/*.appex; do
  [ -d "$appex" ] && check_bundle "$appex"
done

if [ "$failures" -gt 0 ]; then
  echo
  echo "$failures binary/binaries would be rejected by App Review for using Screen Time" >&2
  echo "APIs without the Family Controls entitlement. Not uploading." >&2
  exit 1
fi

echo
echo "✓ Signed entitlements match the Screen Time frameworks each binary links."
