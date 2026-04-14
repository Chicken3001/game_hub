import Foundation
import Supabase
import Observation

@Observable
final class AuthService: @unchecked Sendable {
    static let shared = AuthService()

    var isAuthenticated = false
    var isLoading = true
    var currentUserId: String?

    private let client = SupabaseService.client

    private init() {
        Task { await listenForAuthChanges() }
    }

    private func listenForAuthChanges() async {
        for await (event, session) in client.auth.authStateChanges {
            await MainActor.run {
                switch event {
                case .initialSession:
                    self.isAuthenticated = session != nil
                    self.currentUserId = session?.user.id.uuidString
                    self.isLoading = false
                case .signedIn:
                    self.isAuthenticated = true
                    self.currentUserId = session?.user.id.uuidString
                case .signedOut:
                    self.isAuthenticated = false
                    self.currentUserId = nil
                default:
                    break
                }
            }
        }
    }

    func signIn(email: String, password: String) async throws {
        try await client.auth.signIn(email: email, password: password)
    }

    func signOut() async throws {
        try await client.auth.signOut()
    }
}
