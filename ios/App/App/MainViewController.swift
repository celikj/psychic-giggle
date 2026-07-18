import Capacitor

/// Capacitor only auto-registers plugins shipped as npm packages (via
/// capacitor.config.json). Our local Screen Time plugin lives in the app
/// target, so we register it by hand once the bridge is ready.
class MainViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(ScreenTimePlugin())
    }
}
