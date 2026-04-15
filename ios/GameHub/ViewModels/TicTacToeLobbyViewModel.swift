import SwiftUI
import Supabase
import Observation

@Observable
@MainActor
final class TicTacToeLobbyViewModel {
    var games: [TicTacToeGameRow] = []
    var usernames: [UUID: String] = [:]
    var loading: Bool = true
    var creating: Bool = false
    var createdGame: TicTacToeGameRow? = nil
    var errorMessage: String? = nil

    private let client = SupabaseService.client
    private var subscriptionTask: Task<Void, Never>?

    func load() async {
        loading = true
        defer { loading = false }
        do {
            let rows = try await TicTacToeService.fetchOpenGames()
            self.games = rows
            await fetchUsernames(for: Array(Set(rows.map { $0.player_x })))
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func subscribe() {
        subscriptionTask?.cancel()
        subscriptionTask = Task { [weak self] in
            guard let self else { return }
            await self.client.realtimeV2.connect()
            let channel = self.client.realtimeV2.channel("ttt:lobby")
            let inserts = channel.postgresChange(
                InsertAction.self, schema: "public", table: "tic_tac_toe_games"
            )
            let updates = channel.postgresChange(
                UpdateAction.self, schema: "public", table: "tic_tac_toe_games"
            )
            do { try await channel.subscribeWithError() } catch { return }

            await withTaskGroup(of: Void.self) { group in
                group.addTask { [weak self] in
                    for await action in inserts {
                        if let row = try? action.decodeRecord(as: TicTacToeGameRow.self, decoder: JSONDecoder()) {
                            await self?.handleInsert(row)
                        }
                    }
                }
                group.addTask { [weak self] in
                    for await action in updates {
                        if let row = try? action.decodeRecord(as: TicTacToeGameRow.self, decoder: JSONDecoder()) {
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
            let row = try await TicTacToeService.createGame(userId: userId)
            self.createdGame = row
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func handleInsert(_ row: TicTacToeGameRow) async {
        let cutoff = Date().addingTimeInterval(-2 * 3600)
        let ts = Self.parseDate(row.created_at) ?? Date()
        if row.statusEnum == .waiting && ts >= cutoff {
            if !games.contains(where: { $0.id == row.id }) {
                games.insert(row, at: 0)
                await fetchUsernames(for: [row.player_x])
            }
        }
    }

    private func handleUpdate(_ row: TicTacToeGameRow) async {
        if row.statusEnum == .waiting {
            if !games.contains(where: { $0.id == row.id }) {
                games.insert(row, at: 0)
                await fetchUsernames(for: [row.player_x])
            }
        } else {
            games.removeAll { $0.id == row.id }
        }
    }

    private func fetchUsernames(for ids: [UUID]) async {
        let missing = ids.filter { usernames[$0] == nil }
        for id in missing {
            if let name = try? await TicTacToeService.fetchUsername(userId: id) {
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
