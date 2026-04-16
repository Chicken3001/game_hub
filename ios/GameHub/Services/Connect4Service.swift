import Foundation
import Supabase

enum Connect4Service {
    private static let client = SupabaseService.client
    private static let table = "connect4_games"

    static func fetchOpenGames() async throws -> [Connect4GameRow] {
        let cutoff = iso8601(Date().addingTimeInterval(-2 * 3600))
        return try await client.from(table)
            .select()
            .eq("status", value: "waiting")
            .gte("created_at", value: cutoff)
            .order("created_at", ascending: false)
            .execute()
            .value
    }

    static func fetchGame(id: UUID) async throws -> Connect4GameRow {
        try await client.from(table)
            .select()
            .eq("id", value: id.uuidString)
            .single()
            .execute()
            .value
    }

    struct NewGamePayload: Encodable { let player_1: String }
    static func createGame(userId: String) async throws -> Connect4GameRow {
        try await cancelWaitingGames(forUserId: userId)
        return try await client.from(table)
            .insert(NewGamePayload(player_1: userId))
            .select()
            .single()
            .execute()
            .value
    }

    static func cancelWaitingGames(forUserId userId: String) async throws {
        try await client.from(table)
            .update(["status": "cancelled"])
            .eq("player_1", value: userId)
            .eq("status", value: "waiting")
            .execute()
    }

    struct JoinPayload: Encodable { let player_2: String; let status: String }
    static func joinGame(roomId: UUID, userId: String) async throws -> Connect4GameRow? {
        try? await client.from(table)
            .update(JoinPayload(player_2: userId, status: "active"))
            .eq("id", value: roomId.uuidString)
            .is("player_2", value: nil)
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
        let board: [Int]
        let current_turn: Int
        let status: String
    }
    static func makeMove(
        roomId: UUID,
        newBoard: [Int],
        nextTurn: Int,
        newStatus: String,
        expectedTurn: Int
    ) async throws {
        try await client.from(table)
            .update(MovePayload(board: newBoard, current_turn: nextTurn, status: newStatus))
            .eq("id", value: roomId.uuidString)
            .eq("current_turn", value: String(expectedTurn))
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
