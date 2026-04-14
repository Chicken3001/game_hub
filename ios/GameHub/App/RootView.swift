import SwiftUI

struct RootView: View {
    @State private var authService = AuthService.shared

    var body: some View {
        Group {
            if authService.isLoading {
                LoadingScreen()
            } else if authService.isAuthenticated {
                HubView()
            } else {
                LoginView()
            }
        }
        .animation(.easeInOut(duration: 0.3), value: authService.isAuthenticated)
        .animation(.easeInOut(duration: 0.3), value: authService.isLoading)
    }
}

private struct LoadingScreen: View {
    var body: some View {
        ZStack {
            Color.hubBackground.ignoresSafeArea()
            ProgressView()
                .tint(.hubAccent)
        }
    }
}
