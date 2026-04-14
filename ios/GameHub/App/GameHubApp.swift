import SwiftUI

@main
struct GameHubApp: App {
    var body: some Scene {
        WindowGroup {
            RootView()
                .preferredColorScheme(.light)
                .onOpenURL { url in
                    SupabaseService.client.auth.handle(url)
                }
        }
    }
}
