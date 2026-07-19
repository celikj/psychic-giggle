import DeviceActivity
import ManagedSettings

#if canImport(FamilyControls)
import FamilyControls
#endif

/// Runs headless when the daily DeviceActivity schedule ticks over at
/// midnight. If the new day has pending locking tasks (as last synced by the
/// app), it re-applies the shield — so apps re-lock for a new day even when
/// TaskLock itself is never opened.
class DeviceActivityMonitorExtension: DeviceActivityMonitor {
    private let store = ManagedSettingsStore()

    override func intervalDidStart(for activity: DeviceActivityName) {
        super.intervalDidStart(for: activity)

        guard let defaults = TaskLockShared.defaults,
              defaults.bool(forKey: TaskLockShared.enabledKey) else { return }

        let pending = defaults.stringArray(forKey: TaskLockShared.pendingDatesKey) ?? []
        guard pending.contains(TaskLockShared.localDateString()) else { return }

        #if canImport(FamilyControls)
        if let selection = TaskLockShared.loadSelection() {
            TaskLockShared.applyShield(selection, to: store)
        }
        #endif
    }
}
