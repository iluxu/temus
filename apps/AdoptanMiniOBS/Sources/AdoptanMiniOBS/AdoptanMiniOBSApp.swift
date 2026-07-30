import AppKit
import SwiftUI

@main
struct AdoptanMiniOBSApp: App {
    @StateObject private var engine = StreamEngine()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(engine)
                .frame(minWidth: 1080, minHeight: 720)
                .onDisappear {
                    engine.shutdown()
                }
        }
        .defaultSize(width: 1260, height: 820)
        .commands {
            CommandGroup(replacing: .newItem) {}
        }

        Settings {
            VStack(alignment: .leading, spacing: 12) {
                Text("Adoptan Mini OBS")
                    .font(.title2.bold())
                Text("Les réglages du direct sont accessibles dans la fenêtre principale.")
                    .foregroundStyle(.secondary)
            }
            .padding(24)
            .frame(width: 430)
        }
    }
}
