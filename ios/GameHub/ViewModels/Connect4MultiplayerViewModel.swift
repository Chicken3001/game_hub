import SwiftUI
import Supabase
import Observation

@Observable
@MainActor
final class Connect4MultiplayerViewModel {
    var game: Connect4GameRow
    var joining: Bool = false
    var rematching: Bool = false
    var opponentUsername: String? = nil
    var errorMessage: String? = nil
    var rematchGame: Connect4GameRow? = nil
    var opponentGone: Bool = false
    var countdown: Int? = nil
    var forceDismiss: Bool = false
    var lastMove: Int? = nil

    static let disconnectTimeout: Int = 30

    private let roomId: UUID
    private let currentUserId: String
    private let client = SupabaseService.client
    private var subscriptionTask: Task<Void, Never>?
    private var presenceTask: Task<Void, Never>?
    private var countdownTask: Task<Void, Never>?
    private let initialStatus: String
    private let initialHost: UUID

    struct PresencePayload: Codable { let userId: String }

    init(initialGame: Connect4GameRow, currentUserId: String) {
        self.game = initialGame
        self.roomId = initialGame.id
        self.currentUserId = currentUserId
        self.initialStatus = initialGame.status
        self.initialHost = initialGame.player_1
    }

    var myPlayer: Connect4Player? {
        guard let me = UUID(uuidString: currentUserId) else { return nil }
        if game.player_1 == me { return .one }
        if game.player_2 == me { return .two }
        return nil
    }
    var isSpectator: Bool { myPlayer == nil }
    var isMyTurn: Bool { game.statusEnum == .active && game.turnPlayer == myPlayer }
    var opponentId: UUID? {
        switch myPlayer {
        case .one: return game.player_2
        case .two: return game.player_1
        default: return nil
        }
    }
    var iWon: Bool {
        (game.statusEnum == .p1_wins && myPlayer == .one) ||
        (game.statusEnum == .p2_wins && myPlayer == .two)
    }

    // ── Lifecycle ─────────────────────────────────────────────────────────
    func onAppear() {
        Task { await self.joinIfNeeded() }
        subscribe()
        subscribePresenceIfNeeded()
    }

    func onDisappear() {
        subscriptionTask?.cancel(); subscriptionTask = nil
        presenceTask?.cancel(); presenceTask = nil
        countdownTask?.cancel(); countdownTask = nil
        if initialStatus == "waiting",
           initialHost.uuidString.lowercased() == currentUserId.lowercased() {
            let rid = roomId
            Task { try? await Connect4Service.cancelGame(roomId: rid, expectedStatus: "waiting") }
        }
    }

    private func joinIfNeeded() async {
        guard initialStatus == "waiting",
              initialHost.uuidString.lowercased() != currentUserId.lowercased(),
              game.player_2 == nil else { return }
        joining = true
        defer { joining = false }
        if let updated = try? await Connect4Service.joinGame(roomId: roomId, userId: currentUserId) {
            self.game = updated
        } else if let fresh = try? await Connect4Service.fetchGame(id: roomId) {
            self.game = fresh
        }
        await loadOpponentUsername()
    }

    private func loadOpponentUsername() async {
        guard let opp = opponentId else { return }
        if let name = try? await Connect4Service.fetchUsername(userId: opp) {
            self.opponentUsername = name
        }
    }

    // ── Move handler ──────────────────────────────────────────────────────
    func dropInColumn(_ col: Int) {
        guard let me = myPlayer, isMyTurn, !game.isGameOver else { return }
        let row = Connect4.dropRow(board: game.board, col: col)
        guard row != -1 else { return }
        let idx = row * Connect4.cols + col
        var newBoard = game.board
        newBoard[idx] = me.rawValue

        let winner = Connect4.checkWinner(board: newBoard)
        let newStatus: String = {
            if case .player(let p) = winner { return p == .one ? "p1_wins" : "p2_wins" }
            if winner == .draw { return "draw" }
            return "active"
        }()

        // Optimistic update
        self.game = Connect4GameRow(
            id: game.id, player_1: game.player_1, player_2: game.player_2,
            board: newBoard,
            current_turn: newStatus == "active" ? me.other.rawValue : game.current_turn,
            status: newStatus,
            created_at: game.created_at, updated_at: game.updated_at
        )
        self.lastMove = idx

        let rid = roomId
        let expected = me.rawValue
        let nextTurn = me.other.rawValue
        Task {
            do {
                try await Connect4Service.makeMove(
                    roomId: rid, newBoard: newBoard,
                    nextTurn: nextTurn, newStatus: newStatus,
                    expectedTurn: expected
                )
            } catch {
                if let fresh = try? await Connect4Service.fetchGame(id: rid) {
                    self.game = fresh
                }
            }
        }
    }

    func startRematch() async {
        guard !rematching else { return }
        rematching = true
        defer { rematching = false }
        do {
            let row = try await Connect4Service.createGame(userId: currentUserId)
            self.rematchGame = row
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    // ── Realtime ────────────────────────────────────────────────────────
    private func subscribe() {
        subscriptionTask?.cancel()
        let rid = roomId
        subscriptionTask = Task { [weak self] in
            guard let self else { return }
            await self.client.realtimeV2.connect()
            let channel = self.client.realtimeV2.channel("connect4:\(rid.uuidString)")
            let updates = channel.postgresChange(
                UpdateAction.self, schema: "public", table: "connect4_games",
                filter: .eq("id", value: rid.uuidString)
            )
            do { try await channel.subscribeWithError() } catch { return }
            for await action in updates {
                if let row = try? action.decodeRecord(as: Connect4GameRow.self, decoder: JSONDecoder()) {
                    await self.handleRemoteUpdate(row)
                }
            }
        }
    }

    private func handleRemoteUpdate(_ row: Connect4GameRow) async {
        let oldBoard = game.board
        if row.board != oldBoard {
            for i in 0..<(Connect4.rows * Connect4.cols) {
                if oldBoard[i] == 0 && row.board[i] != 0 {
                    self.lastMove = i; break
                }
            }
        }
        self.game = row
        if opponentUsername == nil { await loadOpponentUsername() }
        if row.statusEnum != .active { cancelCountdown(); opponentGone = false }
        if row.statusEnum == .active, presenceTask == nil { subscribePresenceIfNeeded() }
    }

    // ── Presence / disconnect ───────────────────────────────────────────
    private func subscribePresenceIfNeeded() {
        guard game.statusEnum == .active, myPlayer != nil, presenceTask == nil else { return }
        let rid = roomId
        let uid = currentUserId
        presenceTask = Task { [weak self] in
            guard let self else { return }
            await self.client.realtimeV2.connect()
            let channel = self.client.realtimeV2.channel("presence:connect4:\(rid.uuidString)")
            let presenceStream = channel.presenceChange()
            do { try await channel.subscribeWithError() } catch { return }
            try? await channel.track(PresencePayload(userId: uid))
            for await action in presenceStream {
                let joins = (try? action.decodeJoins(as: PresencePayload.self)) ?? []
                let leaves = (try? action.decodeLeaves(as: PresencePayload.self)) ?? []
                await self.handlePresence(joins: joins, leaves: leaves)
            }
        }
    }

    private func handlePresence(joins: [PresencePayload], leaves: [PresencePayload]) async {
        guard let opp = opponentId else { return }
        let oppStr = opp.uuidString.lowercased()
        if leaves.contains(where: { $0.userId.lowercased() == oppStr }) {
            if !opponentGone { opponentGone = true; startCountdown() }
        }
        if joins.contains(where: { $0.userId.lowercased() == oppStr }) {
            opponentGone = false
            cancelCountdown()
        }
    }

    private func startCountdown() {
        cancelCountdown()
        countdown = Self.disconnectTimeout
        countdownTask = Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 1_000_000_000)
                if Task.isCancelled { return }
                await MainActor.run {
                    guard let self else { return }
                    if let n = self.countdown, n > 1 {
                        self.countdown = n - 1
                    } else {
                        self.countdown = 0
                        Task { await self.expireDisconnect() }
                    }
                }
                if self?.countdown == 0 { return }
            }
        }
    }

    private func cancelCountdown() {
        countdownTask?.cancel(); countdownTask = nil
        countdown = nil
    }

    private func expireDisconnect() async {
        cancelCountdown()
        try? await Connect4Service.cancelGame(roomId: roomId, expectedStatus: "active")
        forceDismiss = true
    }

    func leaveNow() async {
        cancelCountdown()
        forceDismiss = true
    }
}
