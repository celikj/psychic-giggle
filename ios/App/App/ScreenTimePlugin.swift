import Foundation
import Capacitor

#if canImport(FamilyControls)
import FamilyControls
import ManagedSettings
import SwiftUI
#endif

/// Native bridge to Apple's Screen Time (Family Controls) framework.
///
/// Lets the web layer request authorization, pick which apps/categories to
/// block via the system picker, and shield/unshield them. TaskLock uses this
/// to keep distracting apps locked until the day's locking tasks are done.
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
    ]

    private let selectionKey = "tasklock.familyActivitySelection"

    #if canImport(FamilyControls)
    private let managedStore = ManagedSettingsStore()

    @available(iOS 16.0, *)
    private func loadSelection() -> FamilyActivitySelection? {
        guard let data = UserDefaults.standard.data(forKey: selectionKey) else { return nil }
        return try? JSONDecoder().decode(FamilyActivitySelection.self, from: data)
    }

    @available(iOS 16.0, *)
    private func saveSelection(_ selection: FamilyActivitySelection) {
        if let data = try? JSONEncoder().encode(selection) {
            UserDefaults.standard.set(data, forKey: selectionKey)
        }
    }

    @available(iOS 16.0, *)
    private func selectionCount(_ selection: FamilyActivitySelection) -> Int {
        selection.applicationTokens.count + selection.categoryTokens.count + selection.webDomainTokens.count
    }

    @available(iOS 16.0, *)
    private func applyShield(_ selection: FamilyActivitySelection) {
        managedStore.shield.applications = selection.applicationTokens.isEmpty ? nil : selection.applicationTokens
        managedStore.shield.applicationCategories = selection.categoryTokens.isEmpty
            ? nil
            : .specific(selection.categoryTokens)
        managedStore.shield.webDomains = selection.webDomainTokens.isEmpty ? nil : selection.webDomainTokens
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
        if #available(iOS 16.0, *) {
            call.resolve(["supported": true])
            return
        }
        #endif
        call.resolve(["supported": false])
    }

    @objc func getStatus(_ call: CAPPluginCall) {
        #if canImport(FamilyControls)
        if #available(iOS 16.0, *) {
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
            return
        }
        #endif
        call.resolve(["supported": false, "authorization": "unavailable", "selectionCount": 0, "blocking": false])
    }

    @objc func requestAuthorization(_ call: CAPPluginCall) {
        #if canImport(FamilyControls)
        if #available(iOS 16.0, *) {
            Task {
                do {
                    try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
                    call.resolve(["authorization": "approved"])
                } catch {
                    call.reject("Screen Time permission was not granted. Enable it in Settings › Screen Time. (\(error.localizedDescription))")
                }
            }
            return
        }
        #endif
        call.reject("Screen Time blocking requires iOS 16 or later.")
    }

    @objc func selectApps(_ call: CAPPluginCall) {
        #if canImport(FamilyControls)
        if #available(iOS 16.0, *) {
            DispatchQueue.main.async {
                let initial = self.loadSelection() ?? FamilyActivitySelection()
                let picker = FamilyActivityPickerHost(selection: initial) { [weak self] result in
                    self?.bridge?.viewController?.dismiss(animated: true)
                    guard let self = self else { return }
                    if let result = result {
                        self.saveSelection(result)
                        if self.isShielded() { self.applyShield(result) } // keep an active shield in sync
                        call.resolve(["count": self.selectionCount(result)])
                    } else {
                        call.resolve(["count": self.loadSelection().map { self.selectionCount($0) } ?? 0])
                    }
                }
                let host = UIHostingController(rootView: picker)
                host.modalPresentationStyle = .formSheet
                self.bridge?.viewController?.present(host, animated: true)
            }
            return
        }
        #endif
        call.reject("Screen Time blocking requires iOS 16 or later.")
    }

    @objc func startBlocking(_ call: CAPPluginCall) {
        #if canImport(FamilyControls)
        if #available(iOS 16.0, *) {
            guard let selection = loadSelection(), selectionCount(selection) > 0 else {
                call.reject("Pick at least one app to block first.")
                return
            }
            applyShield(selection)
            call.resolve(["blocking": true])
            return
        }
        #endif
        call.reject("Screen Time blocking requires iOS 16 or later.")
    }

    @objc func stopBlocking(_ call: CAPPluginCall) {
        #if canImport(FamilyControls)
        clearShield()
        call.resolve(["blocking": false])
        return
        #else
        call.reject("Screen Time blocking requires iOS 16 or later.")
        #endif
    }
}

#if canImport(FamilyControls)
/// Small SwiftUI wrapper that presents the system Family Activity picker and
/// reports the chosen selection (or nil if cancelled) back through a callback.
@available(iOS 16.0, *)
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
