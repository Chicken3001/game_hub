import Foundation
import Supabase

enum TicTacToeService {
    private static let client = SupabaseService.client
    private static let table = "tic_tac_toe_games"

    static func fetchOpenGames() async throws -> [TicTacToeGameRow] {
        let cutoff = iso8601(Date().addingTimeInterval(-2 * 3600))
        return try await client.from(table)
            .select()
            .eq("status", value: "waiting")
            .gte("created_at", value: cutoff)
            .order("created_at", ascending: false)
            .execute()
            .value
    }

    static func fetchGame(id: UUID) async throws -> TicTacToeGameRow {
        return try await client.from(table)
            .select()
            .eq("id", value: id.uuidString)
            .single()
            .execute()
            .value
    }

    struct NewGamePayload: Encodable { let player_x: String }
    static func createGame(userId: String) async throws -> TicTacToeGameRow {
        try await cancelWaitingGames(forUserId: userId)
        return try await client.from(table)
            .insert(NewGamePayload(player_x: userId))
            .select()
            .single()
            .execute()
            .value
    }

    static func cancelWaitingGames(forUserId userId: String) async throws {
        try await client.from(table)
            .update(["status": "cancelled"])
            .eq("player_x", value: userId)
            .eq("status", value: "waiting")
            .execute()
    }

    struct JoinPayload: Encodable { let player_o: String; let status: String }
    static func joinGame(roomId: UUID, userId: String) async throws -> TicTacToeGameRow? {
        return try? await client.from(table)
            .update(JoinPayload(player_o: userId, status: "active"))
            .eq("id", value: roomId.uuidString)
            .is("player_o", value: nil)
            .select()
            .single()
            .execute()
            .value
    }

    static func cancelGame(roomId: UUID, expectedStatus: String) async throws {
        try await client.from(table)
            .update(["status": "cancelled"])
            .eq("id", value: roomId.uuidString)
            .eq("status", value: expectedStatus)
            .execute()
    }

    struct MovePayload: Encodable {
        let board: [String]
        let current_turn: String
        let status: String
    }
    static func makeMove(
        roomId: UUID,
        newBoard: [String],
        nextTurn: String,
        newStatus: String,
        expectedTurn: String
    ) async throws {
        try await client.from(table)
            .update(MovePayload(board: newBoard, current_turn: nextTurn, status: newStatus))
            .eq("id", value: roomId.uuidString)
            .eq("current_turn", value: expectedTurn)
            .eq("status", value: "active")
            .execute()
    }

    struct ProfileRow: Codable { let id: UUID; let username: String }
    static func fetchUsername(userId: UUID) async throws -> String? {
        let row: ProfileRow? = try? await client.from("profiles")
            .select("id, username")
            .eq("id", value: userId.uuidString)
            .single()
            .execute()
            .value
        return row?.username
    }

    nonisolated(unsafe) private static let isoFormatter: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()
    private static func iso8601(_ date: Date) -> String { isoFormatter.string(from: date) }
}
