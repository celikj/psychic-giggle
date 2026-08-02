import Foundation

// Deliberately free of any Screen Time import: this file is compiled into the
// widget extension too, and a target that links FamilyControls /
// ManagedSettings / DeviceActivity must ship the Family Controls entitlement
// or App Review's automated scan rejects the build. The widget needs none of
// that — the Screen Time helpers live in TaskLockShield.swift, which only the
// app and the monitor extension compile.

/// State shared between the main app and the DeviceActivity monitor extension
/// through the App Group container. The monitor extension runs headless —
/// at midnight for all-day locking items, or at a specific time of day for
/// timed locking dailies — so everything it needs to decide "should this
/// re-lock right now?" must be readable from here.
/// Snapshot of today's lock state, written by the web layer whenever it
/// changes, so the home screen widget can render without running any of the
/// app's logic.
struct TaskLockWidgetState: Codable {
    /// Local YYYY-MM-DD the snapshot describes — the widget treats any other
    /// day's snapshot as stale rather than showing yesterday's numbers.
    var date: String
    var lockingLeft: Int
    var allLockingDone: Bool
    var hasLockingToday: Bool
}

enum TaskLockShared {
    static let appGroupId = "group.com.celikj.tasklock"

    static let selectionKey = "tasklock.familyActivitySelection"
    static let enabledKey = "tasklock.blockingEnabled"
    static let pendingDatesKey = "tasklock.pendingLockDates"
    static let pendingTimedDatesKey = "tasklock.pendingTimedLockDates"
    static let widgetStateKey = "tasklock.widgetState"
    
    static let focusSelectionKey = "tasklock.focusSelection"
    static let schedSelectionKey = "tasklock.schedSelection"

    static let midnightActivityName = "tasklock.daily"
    private static let timedActivityPrefix = "tasklock.time."
    private static let focusActivityPrefix = "tasklock.focus."
    private static let schedActivityPrefix = "tasklock.sched."

    static var defaults: UserDefaults? { UserDefaults(suiteName: appGroupId) }

    /// Local-timezone YYYY-MM-DD, matching the web layer's date keys.
    static func localDateString(_ date: Date = Date()) -> String {
        let fmt = DateFormatter()
        fmt.calendar = Calendar(identifier: .gregorian)
        fmt.locale = Locale(identifier: "en_US_POSIX")
        fmt.dateFormat = "yyyy-MM-dd"
        return fmt.string(from: date)
    }

    /// "21:00" -> "tasklock.time.2100". Both sides (plugin + extension) go
    /// through this so the encoding can never drift out of sync.
    static func timedActivityName(for time: String) -> String {
        timedActivityPrefix + time.replacingOccurrences(of: ":", with: "")
    }

    /// The inverse: "tasklock.time.2100" -> "21:00", or nil for any other name.
    static func time(fromActivityName name: String) -> String? {
        guard name.hasPrefix(timedActivityPrefix) else { return nil }
        let digits = String(name.dropFirst(timedActivityPrefix.count))
        guard digits.count == 4 else { return nil }
        return "\(digits.prefix(2)):\(digits.suffix(2))"
    }

    static func focusActivityName(for id: String) -> String {
        return focusActivityPrefix + id
    }

    static func schedActivityName(for id: String, day: Int) -> String {
        return "\(schedActivityPrefix)\(id).\(day)"
    }

    static func loadPendingTimedDates() -> [String: [String]] {
        guard let data = defaults?.data(forKey: pendingTimedDatesKey),
              let dict = try? JSONDecoder().decode([String: [String]].self, from: data) else { return [:] }
        return dict
    }

    static func savePendingTimedDates(_ dict: [String: [String]]) {
        if let data = try? JSONEncoder().encode(dict) {
            defaults?.set(data, forKey: pendingTimedDatesKey)
        }
    }

    static func loadWidgetState() -> TaskLockWidgetState? {
        guard let data = defaults?.data(forKey: widgetStateKey) else { return nil }
        return try? JSONDecoder().decode(TaskLockWidgetState.self, from: data)
    }

    static func saveWidgetState(_ state: TaskLockWidgetState) {
        if let data = try? JSONEncoder().encode(state) {
            defaults?.set(data, forKey: widgetStateKey)
        }
    }

    /// "21:00" -> (21, 0), for building a DeviceActivitySchedule's start time.
    static func hourMinute(from time: String) -> (hour: Int, minute: Int)? {
        let parts = time.split(separator: ":")
        guard parts.count == 2, let h = Int(parts[0]), let m = Int(parts[1]) else { return nil }
        return (h, m)
    }
}
