import SwiftUI

@main
struct AdoptanMiniOBSIntelApp: App {
    @StateObject private var studio = StudioViewModel()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(studio)
                .frame(minWidth: 1_100, minHeight: 760)
        }
        .defaultSize(width: 1_320, height: 860)
        .commands {
            CommandGroup(replacing: .newItem) {}
        }
    }
}
