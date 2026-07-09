import Foundation
import Supabase

enum LifeService {
    private static let client = SupabaseService.client
    private static let table = "life_games"

    // MARK: - Lobby

    static func fetchOpenGames() async throws -> [LifeGameRow] {
        let cutoff = iso8601(Date().addingTimeInterval(-2 * 3600))
        return try await client.from(table)
            .select()
            .eq("status", value: "waiting")
            .gte("created_at", value: cutoff)
            .order("created_at", ascending: false)
            .execute()
            .value
    }

    static func fetchGame(id: UUID) async throws -> LifeGameRow {
        try await client.from(table)
            .select()
            .eq("id", value: id.uuidString)
            .single()
            .execute()
            .value
    }

    struct NewGamePayload: Encodable {
        let host: String
        let players: [LifePlayerState]
    }

    static func createGame(userId: String) async throws -> LifeGameRow {
        try await cancelWaitingGames(forUserId: userId)
        guard let uuid = UUID(uuidString: userId) else {
            throw NSError(domain: "LifeService", code: 1,
                          userInfo: [NSLocalizedDescriptionKey: "Bad user id"])
        }
        let seat0 = LifePlayerState(user_id: uuid, seat: 0)
        return try await client.from(table)
            .insert(NewGamePayload(host: userId, players: [seat0]))
            .select()
            .single()
            .execute()
            .value
    }

    static func cancelWaitingGames(forUserId userId: String) async throws {
        try await client.from(table)
            .update(["status": "cancelled"])
            .eq("host", value: userId)
            .eq("status", value: "waiting")
            .execute()
    }

    static func cancelGame(roomId: UUID, expectedStatus: String) async throws {
        try await client.from(table)
            .update(["status": "cancelled"])
            .eq("id", value: roomId.uuidString)
            .eq("status", value: expectedStatus)
            .execute()
    }

    // MARK: - Seating

    struct RoomParams: Encodable { let room: String }

    /// Appends the caller to `players` and assigns the next free seat.
    /// Runs server-side so two people tapping Join at once cannot land on the same seat.
    static func joinGame(roomId: UUID) async throws -> LifeGameRow? {
        try? await client.rpc("life_join_game", params: RoomParams(room: roomId.uuidString))
            .select()
            .single()
            .execute()
            .value
    }

    /// Host-only: flips `waiting` -> `active` and queues seat 0's path choice.
    static func startGame(roomId: UUID) async throws -> LifeGameRow? {
        try? await client.rpc("life_start_game", params: RoomParams(room: roomId.uuidString))
            .select()
            .single()
            .execute()
            .value
    }

    // MARK: - Play

    /// PostgREST leaves omitted keys untouched, and Swift's synthesized encoder
    /// *omits* nil optionals. Both `pending` and `spin` must clear back to NULL,
    /// so they are encoded explicitly.
    struct MovePayload: Encodable {
        let players: [LifePlayerState]
        let current_turn: Int
        let pending: LifePending?
        let log: [String]
        let status: String
        let spin: Int?

        enum CodingKeys: String, CodingKey {
            case players, current_turn, pending, log, status, spin
        }

        func encode(to encoder: Encoder) throws {
            var c = encoder.container(keyedBy: CodingKeys.self)
            try c.encode(players, forKey: .players)
            try c.encode(current_turn, forKey: .current_turn)
            try c.encode(log, forKey: .log)
            try c.encode(status, forKey: .status)
            if let pending { try c.encode(pending, forKey: .pending) }
            else { try c.encodeNil(forKey: .pending) }
            if let spin { try c.encode(spin, forKey: .spin) }
            else { try c.encodeNil(forKey: .spin) }
        }
    }

    /// Writes an engine outcome. `expectedTurn` guards against a stale client
    /// clobbering a turn that has already moved on.
    static func applyOutcome(
        roomId: UUID,
        outcome: LifeOutcome,
        spin: Int?,
        expectedTurn: Int
    ) async throws {
        try await client.from(table)
            .update(MovePayload(
                players: outcome.players,
                current_turn: outcome.currentTurn,
                pending: outcome.pending,
                log: Array(outcome.log.suffix(LifeLog.maxEntries)),
                status: outcome.status,
                spin: spin
            ))
            .eq("id", value: roomId.uuidString)
            .eq("current_turn", value: String(expectedTurn))
            .eq("status", value: "active")
            .execute()
    }

    // MARK: - Profiles

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

enum LifeLog {
    /// The log column is append-only from the UI's perspective; keep it bounded.
    static let maxEntries = 40
}
