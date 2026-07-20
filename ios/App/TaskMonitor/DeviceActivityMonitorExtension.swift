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
        
        #if canImport(FamilyControls)
        if name.hasPrefix("tasklock.focus.") {
            if let selection = TaskLockShared.loadSelection(key: TaskLockShared.focusSelectionKey) {
                TaskLockShared.applyShield(selection, to: store)
            }
            return
        }
        
        if name.hasPrefix("tasklock.sched.") {
            if let selection = TaskLockShared.loadSelection(key: TaskLockShared.selectionKey) {
                TaskLockShared.applyShield(selection, to: store)
            }
            return
        }
        #endif

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
        if let selection = TaskLockShared.loadSelection(key: TaskLockShared.selectionKey) {
            TaskLockShared.applyShield(selection, to: store)
        }
        #endif
    }
    
    override func intervalDidEnd(for activity: DeviceActivityName) {
        super.intervalDidEnd(for: activity)
        
        guard let defaults = TaskLockShared.defaults,
              defaults.bool(forKey: TaskLockShared.enabledKey) else { return }
              
        let name = activity.rawValue
        
        // Remove the shield at the end of a focus session or scheduled block.
        // Wait, if locking tasks are STILL pending, we shouldn't lift the main shield!
        // So we only clear the shield if it's a focus block (which has its own apps)
        // OR if it's a sched block AND locking tasks are done.
        // Actually, to be safe, if intervalDidEnd fires, we can just re-evaluate the main lock state.
        // But since we can't easily read `allLockingDone` from here natively, 
        // the easiest way is: 
        // 1. Focus session ends -> clear shield, but wait! We can't clear the main shield apps.
        // 2. We only have ONE ManagedSettingsStore shield! `store.shield.applications = ...`
        // If we clear it, we clear EVERYTHING. 
        // This is why we need to RE-APPLY the correct shield instead of clearing.
        // Let's re-apply the tasks shield if tasks are pending, otherwise clear.
        
        #if canImport(FamilyControls)
        // Check if main tasks are pending by checking if today is in pendingLockDates
        let today = TaskLockShared.localDateString()
        let pending = defaults.stringArray(forKey: TaskLockShared.pendingDatesKey) ?? []
        let tasksPending = pending.contains(today)
        
        // Check if ANY sched blocks are active right now? Too hard to compute here.
        // The web app will call st.sync() when the app is opened anyway.
        // If tasks are pending, re-apply task shield. If not, clear shield.
        if tasksPending {
            if let selection = TaskLockShared.loadSelection(key: TaskLockShared.selectionKey) {
                TaskLockShared.applyShield(selection, to: store)
            }
        } else {
            store.shield.applications = nil
            store.shield.applicationCategories = nil
            store.shield.webDomains = nil
        }
        #endif
    }
}
