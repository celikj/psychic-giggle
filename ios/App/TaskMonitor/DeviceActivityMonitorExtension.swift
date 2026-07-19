import DeviceActivity
import ManagedSettings

#if canImport(FamilyControls)
import FamilyControls
#endif

/// Runs headless whenever one of TaskLock's DeviceActivity schedules ticks
/// over: the daily midnight schedule (all-day locking items), or one of the
/// per-time schedules registered for timed locking dailies. Either way, if
/// today is in the relevant pending-dates set (as last synced by the app),
/// it re-applies the shield — so apps re-lock even when TaskLock itself is
/// never opened.
class DeviceActivityMonitorExtension: DeviceActivityMonitor {
    private let store = ManagedSettingsStore()

    override func intervalDidStart(for activity: DeviceActivityName) {
        super.intervalDidStart(for: activity)

        guard let defaults = TaskLockShared.defaults,
              defaults.bool(forKey: TaskLockShared.enabledKey) else { return }

        let today = TaskLockShared.localDateString()
        let name = activity.rawValue

        let isPending: Bool
        if name == TaskLockShared.midnightActivityName {
            let pending = defaults.stringArray(forKey: TaskLockShared.pendingDatesKey) ?? []
            isPending = pending.contains(today)
        } else if let time = TaskLockShared.time(fromActivityName: name) {
            let pendingByTime = TaskLockShared.loadPendingTimedDates()
            isPending = pendingByTime[time]?.contains(today) ?? false
        } else {
            isPending = false
        }
        guard isPending else { return }

        #if canImport(FamilyControls)
        if let selection = TaskLockShared.loadSelection() {
            TaskLockShared.applyShield(selection, to: store)
        }
        #endif
    }
}
