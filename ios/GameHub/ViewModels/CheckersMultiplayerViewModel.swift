import SwiftUI
import Supabase
import Observation

@Observable
@MainActor
final class CheckersMultiplayerViewModel {
    var game: CheckersGameRow
    var joining: Bool = false
    var rematching: Bool = false
    var opponentUsername: String? = nil
    var errorMessage: String? = nil
    var rematchGame: CheckersGameRow? = nil
    var opponentGone: Bool = false
    var countdown: Int? = nil
    var forceDismiss: Bool = false

    // Multi-step move state (local only)
    var selectedPiece: Int? = nil
    var pendingBoard: [Int]? = nil
    var mustContinueFrom: Int? = nil
    var lastMove: (from: Int, to: Int)? = nil
    private var jumpOrigin: Int? = nil

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

    init(initialGame: CheckersGameRow, currentUserId: String) {
        self.game = initialGame
        self.roomId = initialGame.id
        self.currentUserId = currentUserId
        self.initialStatus = initialGame.status
        self.initialHost = initialGame.player_1
    }

    var myPlayer: CheckersPlayer? {
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

    /// View flips the board when the local player is Black.
    var flipBoard: Bool { myPlayer == .two }

    var activeBoard: [Int] { pendingBoard ?? game.board }

    var forcedPieces: Set<Int> {
        guard let me = myPlayer,
              isMyTurn, !game.isGameOver, mustContinueFrom == nil, game.forced_capture
        else { return [] }
        let moves = Checkers.validMoves(board: activeBoard, player: me, enforceCapture: true)
        if !moves.contains(where: { !$0.jumped.isEmpty }) { return [] }
        return Set(moves.map { $0.from })
    }

    var validDestinations: Set<Int> {
        guard let me = myPlayer, isMyTurn, !game.isGameOver else { return [] }
        if let cont = mustContinueFrom {
            return Set(Checkers.immediateJumps(board: activeBoard, from: cont, player: me).map { $0.to })
        }
        guard let sel = selectedPiece else { return [] }
        let moves = Checkers.validMoves(board: activeBoard, player: me, enforceCapture: game.forced_capture)
        let hasJumps = moves.contains(where: { !$0.jumped.isEmpty })
        if game.forced_capture && hasJumps {
            return Set(Checkers.immediateJumps(board: activeBoard, from: sel, player: me).map { $0.to })
        }
        var s = Set(Checkers.immediateJumps(board: activeBoard, from: sel, player: me).map { $0.to })
        s.formUnion(Checkers.stepMoves(board: activeBoard, from: sel, player: me))
        return s
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
            Task { try? await CheckersService.cancelGame(roomId: rid, expectedStatus: "waiting") }
        }
    }

    private func joinIfNeeded() async {
        guard initialStatus == "waiting",
              initialHost.uuidString.lowercased() != currentUserId.lowercased(),
              game.player_2 == nil else { return }
        joining = true
        defer { joining = false }
        if let updated = try? await CheckersService.joinGame(roomId: roomId, userId: currentUserId) {
            self.game = updated
        } else if let fresh = try? await CheckersService.fetchGame(id: roomId) {
            self.game = fresh
        }
        await loadOpponentUsername()
    }

    private func loadOpponentUsername() async {
        guard let opp = opponentId else { return }
        if let name = try? await CheckersService.fetchUsername(userId: opp) {
            self.opponentUsername = name
        }
    }

    // ── Toggle forced capture (host-only while waiting) ──────────────────
    func toggleForcedCapture() async {
        guard game.statusEnum == .waiting, myPlayer == .one else { return }
        let newVal = !game.forced_capture
        self.game = CheckersGameRow(
            id: game.id, player_1: game.player_1, player_2: game.player_2,
            board: game.board, current_turn: game.current_turn, status: game.status,
            position_history: game.position_history, forced_capture: newVal,
            created_at: game.created_at, updated_at: game.updated_at
        )
        try? await CheckersService.setForcedCapture(roomId: roomId, value: newVal)
    }

    // ── Tap handler ──────────────────────────────────────────────────────
    func tapCell(_ idx: Int) {
        guard let me = myPlayer, isMyTurn, !game.isGameOver else { return }
        let board = activeBoard

        if let cont = mustContinueFrom {
            let hops = Checkers.immediateJumps(board: board, from: cont, player: me)
            guard let hop = hops.first(where: { $0.to == idx }) else { return }
            var nb = board
            nb[hop.to] = nb[cont]
            nb[cont] = 0
            nb[hop.jumped] = 0
            let (toRow, _) = Checkers.rowCol(hop.to)
            let kinged = (me == .one && toRow == 0 && nb[hop.to] == 1) ||
                         (me == .two && toRow == 7 && nb[hop.to] == 2)
            if kinged {
                nb[hop.to] = me == .one ? 3 : 4
                Task { await commitMove(nb, from: jumpOrigin ?? cont, to: hop.to) }
                return
            }
            let more = Checkers.immediateJumps(board: nb, from: hop.to, player: me)
            if more.isEmpty {
                Task { await commitMove(nb, from: jumpOrigin ?? cont, to: hop.to) }
            } else {
                selectedPiece = hop.to
                pendingBoard = nb
                mustContinueFrom = hop.to
            }
            return
        }

        // Tap own piece to select
        if Checkers.isPlayerPiece(board[idx], me) {
            if game.forced_capture {
                let moves = Checkers.validMoves(board: board, player: me, enforceCapture: true)
                let hasJumps = moves.contains { !$0.jumped.isEmpty }
                if hasJumps && Checkers.immediateJumps(board: board, from: idx, player: me).isEmpty { return }
            }
            selectedPiece = idx
            pendingBoard = nil
            mustContinueFrom = nil
            return
        }

        guard let sel = selectedPiece else { return }

        // Try jump first
        if let hop = Checkers.immediateJumps(board: board, from: sel, player: me).first(where: { $0.to == idx }) {
            var nb = board
            nb[hop.to] = nb[sel]
            nb[sel] = 0
            nb[hop.jumped] = 0
            let (toRow, _) = Checkers.rowCol(hop.to)
            let kinged = (me == .one && toRow == 0 && nb[hop.to] == 1) ||
                         (me == .two && toRow == 7 && nb[hop.to] == 2)
            if kinged {
                nb[hop.to] = me == .one ? 3 : 4
                Task { await commitMove(nb, from: sel, to: hop.to) }
                return
            }
            let more = Checkers.immediateJumps(board: nb, from: hop.to, player: me)
            if more.isEmpty {
                Task { await commitMove(nb, from: sel, to: hop.to) }
            } else {
                jumpOrigin = sel
                selectedPiece = hop.to
                pendingBoard = nb
                mustContinueFrom = hop.to
            }
        } else if validDestinations.contains(idx) {
            var nb = board
            nb[idx] = nb[sel]
            nb[sel] = 0
            let (toRow, _) = Checkers.rowCol(idx)
            if me == .one && toRow == 0 && nb[idx] == 1 { nb[idx] = 3 }
            if me == .two && toRow == 7 && nb[idx] == 2 { nb[idx] = 4 }
            Task { await commitMove(nb, from: sel, to: idx) }
        }
    }

    private func commitMove(_ newBoard: [Int], from: Int, to: Int) async {
        guard let me = myPlayer else { return }
        lastMove = (from, to)
        jumpOrigin = nil
        selectedPiece = nil
        pendingBoard = nil
        mustContinueFrom = nil

        let next = me.other
        let winner = Checkers.checkWinner(board: newBoard, nextPlayer: next)
        let key = Checkers.boardKey(board: newBoard, turn: next)
        let newHistory = game.position_history + [key]
        let p1Recent = newHistory.filter { $0.hasSuffix("1") }.suffix(3)
        let p2Recent = newHistory.filter { $0.hasSuffix("2") }.suffix(3)
        let isRepDraw = p1Recent.count == 3 && p1Recent.allSatisfy({ $0 == p1Recent.first }) &&
                        p2Recent.count == 3 && p2Recent.allSatisfy({ $0 == p2Recent.first })

        let newStatus: String = {
            if isRepDraw { return "draw" }
            if winner == .one { return "p1_wins" }
            if winner == .two { return "p2_wins" }
            return "active"
        }()

        self.game = CheckersGameRow(
            id: game.id, player_1: game.player_1, player_2: game.player_2,
            board: newBoard,
            current_turn: newStatus == "active" ? next.rawValue : game.current_turn,
            status: newStatus,
            position_history: newHistory,
            forced_capture: game.forced_capture,
            created_at: game.created_at, updated_at: game.updated_at
        )

        do {
            try await CheckersService.makeMove(
                roomId: roomId, newBoard: newBoard,
                nextTurn: next.rawValue, newStatus: newStatus,
                positionHistory: newHistory, expectedTurn: me.rawValue
            )
        } catch {
            if let fresh = try? await CheckersService.fetchGame(id: roomId) {
                self.game = fresh
            }
        }
    }

    func startRematch() async {
        guard !rematching else { return }
        rematching = true
        defer { rematching = false }
        do {
            let row = try await CheckersService.createGame(userId: currentUserId)
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
            let channel = self.client.realtimeV2.channel("checkers:\(rid.uuidString)")
            let updates = channel.postgresChange(
                UpdateAction.self, schema: "public", table: "checkers_games",
                filter: .eq("id", value: rid.uuidString)
            )
            do { try await channel.subscribeWithError() } catch { return }
            for await action in updates {
                if let row = try? action.decodeRecord(as: CheckersGameRow.self, decoder: JSONDecoder()) {
                    await self.handleRemoteUpdate(row)
                }
            }
        }
    }

    private func handleRemoteUpdate(_ row: CheckersGameRow) async {
        let oldBoard = game.board
        if row.board != oldBoard {
            // Compute last move using delta (matches web heuristic)
            var moveTo = -1
            var moveFrom = -1
            for i in 0..<64 {
                if oldBoard[i] == 0 && row.board[i] != 0 { moveTo = i }
            }
            if moveTo != -1 {
                let cell = row.board[moveTo]
                let owner: CheckersPlayer = (cell == 1 || cell == 3) ? .one : .two
                for i in 0..<64 {
                    if Checkers.isPlayerPiece(oldBoard[i], owner) && row.board[i] == 0 {
                        moveFrom = i; break
                    }
                }
            }
            if moveFrom != -1 && moveTo != -1 {
                self.lastMove = (moveFrom, moveTo)
            }
            selectedPiece = nil
            pendingBoard = nil
            mustContinueFrom = nil
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
            let channel = self.client.realtimeV2.channel("presence:checkers:\(rid.uuidString)")
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
        try? await CheckersService.cancelGame(roomId: roomId, expectedStatus: "active")
        forceDismiss = true
    }

    func leaveNow() async {
        cancelCountdown()
        forceDismiss = true
    }
}
