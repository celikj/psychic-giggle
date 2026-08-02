#!/usr/bin/env node
// Guards against the App Review rejection "the app uses one or more Screen Time
// APIs but has not been submitted with the Family Controls entitlement".
//
// Apple's automated analysis works per binary: any target that links
// FamilyControls, ManagedSettings(UI) or DeviceActivity must carry
// com.apple.developer.family-controls in its entitlements. It's easy to trip
// this without noticing — a shared Swift file added to one more target (the
// widget, say) is enough to make that extension a Screen Time API user.
//
// So: for every target in the Xcode project, cross-check the sources it
// compiles against the entitlements file it signs with, and fail if a target
// imports a Screen Time framework without the entitlement.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const iosRoot = join(repoRoot, 'ios', 'App');
const pbxprojPath = join(iosRoot, 'App.xcodeproj', 'project.pbxproj');

const ENTITLEMENT = 'com.apple.developer.family-controls';
const SCREEN_TIME_FRAMEWORKS = [
  'FamilyControls',
  'ManagedSettings',
  'ManagedSettingsUI',
  'DeviceActivity',
];

const pbxproj = readFileSync(pbxprojPath, 'utf8');

/** id -> fileRef id, for every `X /* name in Sources *\/ = { ... fileRef = Y ... }` line. */
const buildFileToFileRef = new Map();
for (const m of pbxproj.matchAll(
  /^\t\t([0-9A-F]{24}) \/\* .+? \*\/ = \{isa = PBXBuildFile;.*?fileRef = ([0-9A-F]{24})/gm
)) {
  buildFileToFileRef.set(m[1], m[2]);
}

/** fileRef id -> path as written in the project (relative to its group). */
const fileRefToPath = new Map();
for (const m of pbxproj.matchAll(
  /^\t\t([0-9A-F]{24}) \/\* .+? \*\/ = \{isa = PBXFileReference;.*?path = "?([^";]+)"?;/gm
)) {
  fileRefToPath.set(m[1], m[2]);
}

/** Sources phase id -> [build file id]. */
const sourcesPhaseFiles = new Map();
for (const m of pbxproj.matchAll(
  /^\t\t([0-9A-F]{24}) \/\* Sources \*\/ = \{\n\t\t\tisa = PBXSourcesBuildPhase;[\s\S]*?files = \(\n([\s\S]*?)\t\t\t\);/gm
)) {
  const ids = [...m[2].matchAll(/([0-9A-F]{24}) \/\*/g)].map((x) => x[1]);
  sourcesPhaseFiles.set(m[1], ids);
}

/** Build configuration id -> CODE_SIGN_ENTITLEMENTS (may be undefined). */
const configEntitlements = new Map();
for (const m of pbxproj.matchAll(
  /^\t\t([0-9A-F]{24}) \/\* (\w+) \*\/ = \{\n\t\t\tisa = XCBuildConfiguration;[\s\S]*?\n\t\t\tname = \w+;/gm
)) {
  const ent = m[0].match(/CODE_SIGN_ENTITLEMENTS = "?([^";]+)"?;/);
  configEntitlements.set(m[1], { name: m[2], entitlements: ent ? ent[1] : null });
}

/** Configuration list id -> [configuration id]. */
const configListMembers = new Map();
for (const m of pbxproj.matchAll(
  /^\t\t([0-9A-F]{24}) \/\* Build configuration list.*?\*\/ = \{\n\t\t\tisa = XCConfigurationList;\n\t\t\tbuildConfigurations = \(\n([\s\S]*?)\t\t\t\);/gm
)) {
  configListMembers.set(m[1], [...m[2].matchAll(/([0-9A-F]{24}) \/\*/g)].map((x) => x[1]));
}

/** Every .swift file under ios/App, indexed by basename, to resolve group-relative paths. */
const swiftFilesByName = new Map();
(function walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'App.xcodeproj' || entry === 'Pods' || entry === '.build') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full);
    else if (entry.endsWith('.swift')) {
      if (!swiftFilesByName.has(entry)) swiftFilesByName.set(entry, []);
      swiftFilesByName.get(entry).push(full);
    }
  }
})(iosRoot);

const targets = [...pbxproj.matchAll(
  /^\t\t([0-9A-F]{24}) \/\* (.+?) \*\/ = \{\n\t\t\tisa = PBXNativeTarget;[\s\S]*?\n\t\t\tname = (.+?);/gm
)].map((m) => {
  const block = m[0];
  const listId = block.match(/buildConfigurationList = ([0-9A-F]{24})/)?.[1];
  const phaseIds = [...(block.match(/buildPhases = \(\n([\s\S]*?)\t\t\t\);/)?.[1] ?? '')
    .matchAll(/([0-9A-F]{24}) \/\*/g)].map((x) => x[1]);
  return { name: m[3].replace(/"/g, ''), listId, phaseIds };
});

if (targets.length === 0) {
  console.error(`No targets parsed out of ${pbxprojPath} — the check would pass vacuously.`);
  process.exit(1);
}

const problems = [];
const report = [];

for (const target of targets) {
  // Sources this target compiles, resolved to real files on disk.
  const sources = [];
  for (const phaseId of target.phaseIds) {
    for (const buildFileId of sourcesPhaseFiles.get(phaseId) ?? []) {
      const refPath = fileRefToPath.get(buildFileToFileRef.get(buildFileId));
      if (!refPath || !refPath.endsWith('.swift')) continue;
      const matches = swiftFilesByName.get(basename(refPath)) ?? [];
      if (matches.length === 1) sources.push(matches[0]);
      else if (matches.length > 1) {
        problems.push(
          `${target.name}: ambiguous source ${refPath} (${matches.length} files with that name) — ` +
            `this check resolves sources by basename and can't tell them apart.`
        );
      } else {
        problems.push(`${target.name}: source ${refPath} referenced by the project but missing on disk.`);
      }
    }
  }

  // Which Screen Time frameworks those sources import.
  const imports = new Set();
  for (const file of sources) {
    const text = readFileSync(file, 'utf8');
    for (const fw of SCREEN_TIME_FRAMEWORKS) {
      if (new RegExp(`^\\s*import\\s+${fw}\\s*$`, 'm').test(text)) imports.add(fw);
    }
  }

  // The entitlements each configuration signs with.
  const configs = (configListMembers.get(target.listId) ?? [])
    .map((id) => configEntitlements.get(id))
    .filter(Boolean);

  for (const config of configs) {
    const hasEntitlement =
      config.entitlements &&
      readFileSync(join(iosRoot, config.entitlements), 'utf8').includes(ENTITLEMENT);

    if (imports.size > 0 && !hasEntitlement) {
      problems.push(
        `${target.name} (${config.name}) imports ${[...imports].join(', ')} but ` +
          (config.entitlements
            ? `${config.entitlements} does not declare ${ENTITLEMENT}.`
            : 'has no CODE_SIGN_ENTITLEMENTS file.')
      );
    }
    if (imports.size === 0 && hasEntitlement) {
      problems.push(
        `${target.name} (${config.name}) declares ${ENTITLEMENT} in ${config.entitlements} but ` +
          `imports no Screen Time framework — drop the entitlement so the App ID doesn't ` +
          `need a capability it never uses.`
      );
    }
  }

  const first = configs[0];
  report.push(
    `  ${target.name.padEnd(16)} ${imports.size ? [...imports].join(', ') : '(no Screen Time frameworks)'}` +
      ` -> ${first?.entitlements ?? 'no entitlements file'}`
  );
}

console.log('Screen Time framework use vs. Family Controls entitlement, per target:');
console.log(report.join('\n'));

if (problems.length > 0) {
  console.error('\nFamily Controls entitlement check failed:\n');
  for (const p of problems) console.error(`  ✗ ${p}`);
  console.error(
    '\nApp Review rejects builds where a binary links a Screen Time framework without\n' +
      `the ${ENTITLEMENT} entitlement. Either add the entitlement to that target (and\n` +
      "enable Family Controls on its App ID), or stop compiling Screen Time code into it.\n"
  );
  process.exit(1);
}

console.log('\n✓ Every target that links a Screen Time framework carries the Family Controls entitlement.');
