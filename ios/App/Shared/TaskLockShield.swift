import Foundation

#if canImport(FamilyControls)
import FamilyControls
import ManagedSettings
#endif

/// The Screen Time half of the shared layer: reading back the user's app
/// selection and turning it into a shield. Split out of TaskLockShared.swift
/// because importing FamilyControls / ManagedSettings makes a target a Screen
/// Time API user in App Review's automated analysis, which then requires the
/// Family Controls entitlement on that target. Only the app and the
/// DeviceActivity monitor extension compile this file — both carry the
/// entitlement; the widget extension does not and must not link these
/// frameworks.
extension TaskLockShared {
    #if canImport(FamilyControls)
    static func loadSelection(key: String = selectionKey) -> FamilyActivitySelection? {
        guard let data = defaults?.data(forKey: key) else { return nil }
        return try? JSONDecoder().decode(FamilyActivitySelection.self, from: data)
    }

    static func saveSelection(_ selection: FamilyActivitySelection, key: String = selectionKey) {
        if let data = try? JSONEncoder().encode(selection) {
            defaults?.set(data, forKey: key)
        }
    }

    static func applyShield(_ selection: FamilyActivitySelection, to store: ManagedSettingsStore) {
        store.shield.applications = selection.applicationTokens.isEmpty ? nil : selection.applicationTokens
        store.shield.applicationCategories = selection.categoryTokens.isEmpty
            ? nil
            : .specific(selection.categoryTokens)
        store.shield.webDomains = selection.webDomainTokens.isEmpty ? nil : selection.webDomainTokens
    }
    #endif
}
