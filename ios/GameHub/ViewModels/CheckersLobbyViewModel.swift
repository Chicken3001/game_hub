import SwiftUI
import Supabase
import Observation

@Observable
@MainActor
final class CheckersLobbyViewModel {
    var games: [CheckersGameRow] = []
    var usernames: [UUID: String] = [:]
    var loading: Bool = true
    var creating: Bool = false
    var createdGame: CheckersGameRow? = nil
    var errorMessage: String? = nil

    private let client = SupabaseService.client
    private var subscriptionTask: Task<Void, Never>?

    func load() async {
        loading = true
        defer { loading = false }
        do {
            let rows = try await CheckersService.fetchOpenGames()
            self.games = rows
            await fetchUsernames(for: Array(Set(rows.map { $0.player_1 })))
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func subscribe() {
        subscriptionTask?.cancel()
        subscriptionTask = Task { [weak self] in
            guard let self else { return }
            await self.client.realtimeV2.connect()
            let channel = self.client.realtimeV2.channel("checkers:lobby")
            let inserts = channel.postgresChange(
                InsertAction.self, schema: "public", table: "checkers_games"
            )
            let updates = channel.postgresChange(
                UpdateAction.self, schema: "public", table: "checkers_games"
            )
            do { try await channel.subscribeWithError() } catch { return }
            await withTaskGroup(of: Void.self) { group in
                group.addTask { [weak self] in
                    for await action in inserts {
                        if let row = try? action.decodeRecord(as: CheckersGameRow.self, decoder: JSONDecoder()) {
                            await self?.handleInsert(row)
                        }
                    }
                }
                group.addTask { [weak self] in
                    for await action in updates {
                        if let row = try? action.decodeRecord(as: CheckersGameRow.self, decoder: JSONDecoder()) {
                            await self?.handleUpdate(row)
                        }
                    }
                }
            }
        }
    }

    func unsubscribe() {
        subscriptionTask?.cancel()
        subscriptionTask = nil
    }

    func createGame(userId: String) async {
        guard !creating else { return }
        creating = true
        defer { creating = false }
        do {
            let row = try await CheckersService.createGame(userId: userId)
            self.createdGame = row
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func handleInsert(_ row: CheckersGameRow) async {
        let cutoff = Date().addingTimeInterval(-2 * 3600)
        let ts = Self.parseDate(row.created_at) ?? Date()
        if row.statusEnum == .waiting && ts >= cutoff {
            if !games.contains(where: { $0.id == row.id }) {
                games.insert(row, at: 0)
                await fetchUsernames(for: [row.player_1])
            }
        }
    }

    private func handleUpdate(_ row: CheckersGameRow) async {
        if row.statusEnum == .waiting {
            if !games.contains(where: { $0.id == row.id }) {
                games.insert(row, at: 0)
                await fetchUsernames(for: [row.player_1])
            }
        } else {
            games.removeAll { $0.id == row.id }
        }
    }

    private func fetchUsernames(for ids: [UUID]) async {
        let missing = ids.filter { usernames[$0] == nil }
        for id in missing {
            if let name = try? await CheckersService.fetchUsername(userId: id) {
                usernames[id] = name
            }
        }
    }

    nonisolated(unsafe) private static let isoFormatter: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()
    private static func parseDate(_ s: String) -> Date? {
        if let d = isoFormatter.date(from: s) { return d }
        let alt = ISO8601DateFormatter()
        alt.formatOptions = [.withInternetDateTime]
        return alt.date(from: s)
    }
}
