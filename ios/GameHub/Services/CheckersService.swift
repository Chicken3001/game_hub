import Foundation
import Supabase

enum CheckersService {
    private static let client = SupabaseService.client
    private static let table = "checkers_games"

    static func fetchOpenGames() async throws -> [CheckersGameRow] {
        let cutoff = iso8601(Date().addingTimeInterval(-2 * 3600))
        return try await client.from(table)
            .select()
            .eq("status", value: "waiting")
            .gte("created_at", value: cutoff)
            .order("created_at", ascending: false)
            .execute()
            .value
    }

    static func fetchGame(id: UUID) async throws -> CheckersGameRow {
        try await client.from(table)
            .select()
            .eq("id", value: id.uuidString)
            .single()
            .execute()
            .value
    }

    struct NewGamePayload: Encodable { let player_1: String }
    static func createGame(userId: String) async throws -> CheckersGameRow {
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
    static func joinGame(roomId: UUID, userId: String) async throws -> CheckersGameRow? {
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
        let position_history: [String]
    }
    static func makeMove(
        roomId: UUID,
        newBoard: [Int],
        nextTurn: Int,
        newStatus: String,
        positionHistory: [String],
        expectedTurn: Int
    ) async throws {
        try await client.from(table)
            .update(MovePayload(
                board: newBoard, current_turn: nextTurn,
                status: newStatus, position_history: positionHistory
            ))
            .eq("id", value: roomId.uuidString)
            .eq("current_turn", value: String(expectedTurn))
            .eq("status", value: "active")
            .execute()
    }

    struct ForcedCapturePayload: Encodable { let forced_capture: Bool }
    static func setForcedCapture(roomId: UUID, value: Bool) async throws {
        try await client.from(table)
            .update(ForcedCapturePayload(forced_capture: value))
            .eq("id", value: roomId.uuidString)
            .eq("status", value: "waiting")
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
