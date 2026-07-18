import ManagedSettings
import ManagedSettingsUI
import UIKit

/// Draws TaskLock's custom block screen in place of Apple's default
/// "Restricted / hourglass" shield.
class ShieldConfigurationProvider: ShieldConfigurationDataSource {

    private func shield(for name: String?) -> ShieldConfiguration {
        let orange = UIColor(red: 1.0, green: 0.42, blue: 0.21, alpha: 1.0)   // #FF6B35
        let bg = UIColor(red: 0.039, green: 0.039, blue: 0.059, alpha: 1.0)   // #0a0a0f

        let lock = UIImage(systemName: "lock.fill")?
            .withTintColor(orange, renderingMode: .alwaysOriginal)

        let subtitleText: String = {
            if let name = name, !name.isEmpty {
                return "Finish your locking tasks in TaskLock to unlock \(name)."
            }
            return "Finish your locking tasks in TaskLock to unlock this app."
        }()

        return ShieldConfiguration(
            backgroundBlurStyle: .systemThickMaterialDark,
            backgroundColor: bg.withAlphaComponent(0.9),
            icon: lock,
            title: ShieldConfiguration.Label(text: "Locked by TaskLock", color: .white),
            subtitle: ShieldConfiguration.Label(text: subtitleText, color: UIColor.white.withAlphaComponent(0.6)),
            primaryButtonLabel: ShieldConfiguration.Label(text: "Back to Tasks", color: .white),
            primaryButtonBackgroundColor: orange
        )
    }

    override func configuration(shielding application: Application) -> ShieldConfiguration {
        shield(for: application.localizedDisplayName)
    }

    override func configuration(shielding application: Application, in category: ActivityCategory) -> ShieldConfiguration {
        shield(for: application.localizedDisplayName)
    }

    override func configuration(shielding webDomain: WebDomain) -> ShieldConfiguration {
        shield(for: webDomain.domain)
    }

    override func configuration(shielding webDomain: WebDomain, in category: ActivityCategory) -> ShieldConfiguration {
        shield(for: webDomain.domain)
    }
}
