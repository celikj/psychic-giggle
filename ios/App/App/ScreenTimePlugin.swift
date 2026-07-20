import Foundation
import Capacitor

#if canImport(FamilyControls)
import FamilyControls
import ManagedSettings
import SwiftUI
#endif

#if canImport(DeviceActivity)
import DeviceActivity
#endif

#if canImport(WidgetKit)
import WidgetKit
#endif

/// Native bridge to Apple's Screen Time (Family Controls) framework.
///
/// Lets the web layer request authorization, pick which apps/categories to
/// block via the system picker, and shield/unshield them. TaskLock uses this
/// to keep distracting apps locked until the day's locking tasks are done.
/// The app targets iOS 16+, the floor for individual Family Controls
/// authorization, so no runtime availability checks are needed.
@objc(ScreenTimePlugin)
public class ScreenTimePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ScreenTimePlugin"
    public let jsName = "ScreenTime"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isSupported", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestAuthorization", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "selectApps", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startBlocking", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopBlocking", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "updateSchedule", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "updateWidgetState", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startEmergencyPass", returnType: CAPPluginReturnPromise),
    ]

    private let selectionKey = "tasklock.familyActivitySelection"

    #if canImport(FamilyControls)
    private let managedStore = ManagedSettingsStore()

    private func loadSelection() -> FamilyActivitySelection? {
        if let selection = TaskLockShared.loadSelection() { return selection }
        // Migrate a selection saved before the App Group existed.
        if let data = UserDefaults.standard.data(forKey: selectionKey),
           let selection = try? JSONDecoder().decode(FamilyActivitySelection.self, from: data) {
            TaskLockShared.saveSelection(selection)
            UserDefaults.standard.removeObject(forKey: selectionKey)
            return selection
        }
        return nil
    }

    private func selectionCount(_ selection: FamilyActivitySelection) -> Int {
        selection.applicationTokens.count + selection.categoryTokens.count + selection.webDomainTokens.count
    }

    private func clearShield() {
        managedStore.shield.applications = nil
        managedStore.shield.applicationCategories = nil
        managedStore.shield.webDomains = nil
    }

    private func isShielded() -> Bool {
        managedStore.shield.applications != nil || managedStore.shield.applicationCategories != nil
    }
    #endif

    @objc func isSupported(_ call: CAPPluginCall) {
        #if canImport(FamilyControls)
        call.resolve(["supported": true])
        #else
        call.resolve(["supported": false])
        #endif
    }

    @objc func getStatus(_ call: CAPPluginCall) {
        #if canImport(FamilyControls)
        let status: String
        switch AuthorizationCenter.shared.authorizationStatus {
        case .approved: status = "approved"
        case .denied: status = "denied"
        default: status = "notDetermined"
        }
        let selection = loadSelection()
        call.resolve([
            "supported": true,
            "authorization": status,
            "selectionCount": selection.map { selectionCount($0) } ?? 0,
            "blocking": isShielded(),
        ])
        #else
        call.resolve(["supported": false, "authorization": "unavailable", "selectionCount": 0, "blocking": false])
        #endif
    }

    @objc func requestAuthorization(_ call: CAPPluginCall) {
        #if canImport(FamilyControls)
        Task {
            do {
                try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
                call.resolve(["authorization": "approved"])
            } catch {
                call.reject("Screen Time permission was not granted. Enable it in Settings › Screen Time. (\(error.localizedDescription))")
            }
        }
        #else
        call.reject("Screen Time is unavailable on this platform.")
        #endif
    }

    @objc func selectApps(_ call: CAPPluginCall) {
        #if canImport(FamilyControls)
        DispatchQueue.main.async {
            let initial = self.loadSelection() ?? FamilyActivitySelection()
            let picker = FamilyActivityPickerHost(selection: initial) { [weak self] result in
                self?.bridge?.viewController?.dismiss(animated: true)
                guard let self = self else { return }
                if let result = result {
                    TaskLockShared.saveSelection(result)
                    if self.isShielded() {
                        TaskLockShared.applyShield(result, to: self.managedStore) // keep an active shield in sync
                    }
                    call.resolve(["count": self.selectionCount(result)])
                } else {
                    call.resolve(["count": self.loadSelection().map { self.selectionCount($0) } ?? 0])
                }
            }
            let host = UIHostingController(rootView: picker)
            host.modalPresentationStyle = .formSheet
            self.bridge?.viewController?.present(host, animated: true)
        }
        #else
        call.reject("Screen Time is unavailable on this platform.")
        #endif
    }

    @objc func startBlocking(_ call: CAPPluginCall) {
        #if canImport(FamilyControls)
        guard let selection = loadSelection(), selectionCount(selection) > 0 else {
            call.reject("Pick at least one app to block first.")
            return
        }
        TaskLockShared.applyShield(selection, to: managedStore)
        call.resolve(["blocking": true])
        #else
        call.reject("Screen Time is unavailable on this platform.")
        #endif
    }

    @objc func stopBlocking(_ call: CAPPluginCall) {
        #if canImport(FamilyControls)
        clearShield()
        call.resolve(["blocking": false])
        #else
        call.reject("Screen Time is unavailable on this platform.")
        #endif
    }

    /// Syncs the native re-arm schedules. The web layer calls this whenever
    /// the set of dates with pending locking to-dos/all-day dailies, or the
    /// per-time pending dates for timed locking dailies, changes.
    ///
    /// Two kinds of DeviceActivity schedule keep TaskMonitor woken up without
    /// the app running: one repeating midnight schedule for all-day items,
    /// and one repeating schedule per distinct daily start time (e.g. 21:00
    /// for "Brush teeth") so a timed locking daily re-locks apps right on
    /// time even if TaskLock was never opened that day.
    @objc func updateSchedule(_ call: CAPPluginCall) {
        #if canImport(FamilyControls) && canImport(DeviceActivity)
        let dates = call.getArray("dates", String.self) ?? []
        let enabled = call.getBool("enabled") ?? false

        var timedDates: [String: [String]] = [:]
        for (key, value) in call.getObject("timedDates") ?? [:] {
            if let arr = value as? [String] {
                timedDates[key] = arr
            } else if let arr = value as? [Any] {
                timedDates[key] = arr.compactMap { $0 as? String }
            }
        }

        let defaults = TaskLockShared.defaults
        defaults?.set(dates, forKey: TaskLockShared.pendingDatesKey)
        TaskLockShared.savePendingTimedDates(timedDates)
        defaults?.set(enabled, forKey: TaskLockShared.enabledKey)

        let center = DeviceActivityCenter()
        let armed = enabled
            && AuthorizationCenter.shared.authorizationStatus == .approved
            && (loadSelection().map { selectionCount($0) > 0 } ?? false)

        // Midnight schedule — all-day locking to-dos and dailies.
        let midnight = DeviceActivityName(TaskLockShared.midnightActivityName)
        let shouldMonitorMidnight = armed && !dates.isEmpty
        if shouldMonitorMidnight {
            if !center.activities.contains(midnight) {
                let schedule = DeviceActivitySchedule(
                    intervalStart: DateComponents(hour: 0, minute: 0),
                    intervalEnd: DateComponents(hour: 23, minute: 59),
                    repeats: true
                )
                do {
                    try center.startMonitoring(midnight, during: schedule)
                } catch {
                    call.reject("Could not schedule the midnight re-lock. (\(error.localizedDescription))")
                    return
                }
            }
        } else {
            center.stopMonitoring([midnight])
        }

        // Per-time schedules — one per distinct timed locking daily start time.
        let desiredTimes: Set<String> = armed
            ? Set(timedDates.filter { !$0.value.isEmpty }.keys)
            : []
        let currentTimes = Set(center.activities.compactMap { TaskLockShared.time(fromActivityName: $0.rawValue) })

        let namesToStop = currentTimes.subtracting(desiredTimes).map {
            DeviceActivityName(TaskLockShared.timedActivityName(for: $0))
        }
        if !namesToStop.isEmpty { center.stopMonitoring(namesToStop) }

        for time in desiredTimes.subtracting(currentTimes) {
            guard let comps = TaskLockShared.hourMinute(from: time) else { continue }
            let activity = DeviceActivityName(TaskLockShared.timedActivityName(for: time))
            let schedule = DeviceActivitySchedule(
                intervalStart: DateComponents(hour: comps.hour, minute: comps.minute),
                intervalEnd: DateComponents(hour: 23, minute: 59),
                repeats: true
            )
            try? center.startMonitoring(activity, during: schedule)
        }

        call.resolve(["monitoring": shouldMonitorMidnight || !desiredTimes.isEmpty])
        #else
        call.resolve(["monitoring": false])
        #endif
    }

    /// Stores today's lock-state snapshot for the home screen widget and asks
    /// WidgetKit to redraw. Called by the web layer whenever the state changes.
    @objc func updateWidgetState(_ call: CAPPluginCall) {
        let state = TaskLockWidgetState(
            date: call.getString("date") ?? TaskLockShared.localDateString(),
            lockingLeft: call.getInt("lockingLeft") ?? 0,
            allLockingDone: call.getBool("allLockingDone") ?? true,
            hasLockingToday: call.getBool("hasLockingToday") ?? false
        )
        TaskLockShared.saveWidgetState(state)
        #if canImport(WidgetKit)
        WidgetCenter.shared.reloadAllTimelines()
        #endif
        call.resolve()
    }
}

#if canImport(FamilyControls)
/// Small SwiftUI wrapper that presents the system Family Activity picker and
/// reports the chosen selection (or nil if cancelled) back through a callback.
private struct FamilyActivityPickerHost: View {
    @State private var selection: FamilyActivitySelection
    @State private var isPresented = true
    let onFinish: (FamilyActivitySelection?) -> Void

    init(selection: FamilyActivitySelection, onFinish: @escaping (FamilyActivitySelection?) -> Void) {
        _selection = State(initialValue: selection)
        self.onFinish = onFinish
    }

    var body: some View {
        Color.black.opacity(0.001)
            .familyActivityPicker(isPresented: $isPresented, selection: $selection)
            .onChange(of: isPresented) { presented in
                if !presented { onFinish(selection) }
            }
    }
}
#endif
