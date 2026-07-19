import Foundation

#if canImport(FamilyControls)
import FamilyControls
import ManagedSettings
#endif

/// State shared between the main app and the DeviceActivity monitor extension
/// through the App Group container. The monitor extension runs headless at
/// midnight, so everything it needs to decide "should today start locked?"
/// must be readable from here.
enum TaskLockShared {
    static let appGroupId = "group.com.celikj.tasklock"

    static let selectionKey = "tasklock.familyActivitySelection"
    static let enabledKey = "tasklock.blockingEnabled"
    static let pendingDatesKey = "tasklock.pendingLockDates"

    static var defaults: UserDefaults? { UserDefaults(suiteName: appGroupId) }

    /// Local-timezone YYYY-MM-DD, matching the web layer's date keys.
    static func localDateString(_ date: Date = Date()) -> String {
        let fmt = DateFormatter()
        fmt.calendar = Calendar(identifier: .gregorian)
        fmt.locale = Locale(identifier: "en_US_POSIX")
        fmt.dateFormat = "yyyy-MM-dd"
        return fmt.string(from: date)
    }

    #if canImport(FamilyControls)
    static func loadSelection() -> FamilyActivitySelection? {
        guard let data = defaults?.data(forKey: selectionKey) else { return nil }
        return try? JSONDecoder().decode(FamilyActivitySelection.self, from: data)
    }

    static func saveSelection(_ selection: FamilyActivitySelection) {
        if let data = try? JSONEncoder().encode(selection) {
            defaults?.set(data, forKey: selectionKey)
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
