import WidgetKit
import SwiftUI

/// Home screen widget showing TaskLock's current lock state: how many locking
/// items stand between the user and their apps. The web layer pushes a
/// snapshot into the App Group whenever the state changes (and asks WidgetKit
/// to reload), so the widget never has to run any app logic itself.

private let accent = Color(red: 1.0, green: 0.42, blue: 0.208) // #FF6B35
private let background = Color(red: 0.04, green: 0.04, blue: 0.06) // #0A0A0F

struct LockEntry: TimelineEntry {
    let date: Date
    let state: TaskLockWidgetState?
    /// True when the stored snapshot is from a previous day — the numbers in
    /// it no longer describe today, so the widget prompts a sync instead.
    let isStale: Bool
}

struct LockStateProvider: TimelineProvider {
    func placeholder(in context: Context) -> LockEntry {
        LockEntry(
            date: Date(),
            state: TaskLockWidgetState(date: "", lockingLeft: 2, allLockingDone: false, hasLockingToday: true),
            isStale: false
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (LockEntry) -> Void) {
        completion(currentEntry())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<LockEntry>) -> Void) {
        // The app reloads timelines on every state change; the only scheduled
        // refresh needed is midnight, when today's snapshot goes stale.
        let midnight = Calendar.current.startOfDay(
            for: Calendar.current.date(byAdding: .day, value: 1, to: Date()) ?? Date()
        )
        completion(Timeline(entries: [currentEntry()], policy: .after(midnight)))
    }

    private func currentEntry() -> LockEntry {
        let state = TaskLockShared.loadWidgetState()
        return LockEntry(
            date: Date(),
            state: state,
            isStale: state.map { $0.date != TaskLockShared.localDateString() } ?? false
        )
    }
}

struct TaskLockWidgetEntryView: View {
    var entry: LockEntry

    var body: some View {
        content
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .widgetBackground(background)
    }

    @ViewBuilder
    private var content: some View {
        if let state = entry.state, !entry.isStale {
            if !state.allLockingDone {
                statusView(
                    icon: "lock.fill",
                    tint: .red,
                    title: state.lockingLeft == 1 ? "1 item left" : "\(state.lockingLeft) items left",
                    subtitle: "to unlock your apps"
                )
            } else if state.hasLockingToday {
                statusView(icon: "lock.open.fill", tint: .green, title: "Unlocked", subtitle: "all locking items done")
            } else {
                statusView(icon: "checkmark.circle.fill", tint: accent, title: "No locks today", subtitle: "enjoy your day")
            }
        } else {
            statusView(icon: "lock.circle", tint: .gray, title: "TaskLock", subtitle: "open the app to sync")
        }
    }

    private func statusView(icon: String, tint: Color, title: String, subtitle: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Image(systemName: icon)
                .font(.system(size: 26, weight: .bold))
                .foregroundColor(tint)
            Spacer(minLength: 0)
            Text(title)
                .font(.system(size: 17, weight: .bold, design: .rounded))
                .foregroundColor(.white)
                .minimumScaleFactor(0.7)
            Text(subtitle)
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(.white.opacity(0.45))
                .minimumScaleFactor(0.7)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .padding(14)
    }
}

private extension View {
    /// iOS 17 requires containerBackground for widgets; iOS 16 (our floor)
    /// doesn't have the API, so fall back to a plain background there.
    @ViewBuilder
    func widgetBackground(_ color: Color) -> some View {
        if #available(iOSApplicationExtension 17.0, *) {
            containerBackground(color, for: .widget)
        } else {
            background(color)
        }
    }
}

struct TaskLockStatusWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "TaskLockStatus", provider: LockStateProvider()) { entry in
            TaskLockWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Lock Status")
        .description("How many locking items stand between you and your apps.")
        .supportedFamilies([.systemSmall])
    }
}

@main
struct TaskLockWidgetBundle: WidgetBundle {
    var body: some Widget {
        TaskLockStatusWidget()
    }
}
