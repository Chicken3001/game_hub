import SwiftUI
import Supabase
import Observation

@Observable
@MainActor
final class TicTacToeMultiplayerViewModel {
    var game: TicTacToeGameRow
    var joining: Bool = false
    var rematching: Bool = false
    var opponentUsername: String? = nil
    var lastMove: Int? = nil
    var errorMessage: String? = nil
    var rematchGame: TicTacToeGameRow? = nil
    var opponentGone: Bool = false
    var countdown: Int? = nil
    var forceDismiss: Bool = false

    static let disconnectTimeout: Int = 30

    private let roomId: UUID
    private let currentUserId: String
    private let client = SupabaseService.client
    private var subscriptionTask: Task<Void, Never>?
    private var presenceTask: Task<Void, Never>?
    private var countdownTask: Task<Void, Never>?
    private let initialStatus: String
    private let initialPlayerX: UUID

    struct PresencePayload: Codable { let userId: String }

    init(initialGame: TicTacToeGameRow, currentUserId: String) {
        self.game = initialGame
        self.roomId = initialGame.id
        self.currentUserId = currentUserId
        self.initialStatus = initialGame.status
        self.initialPlayerX = initialGame.player_x
    }

    var mySymbol: TTTSymbol? {
        guard let meUUID = UUID(uuidString: currentUserId) else { return nil }
        if game.player_x == meUUID { return .x }
        if game.player_o == meUUID { return .o }
        return nil
    }
    var isSpectator: Bool { mySymbol == nil }
    var isMyTurn: Bool {
        game.statusEnum == .active && mySymbol != nil && game.turnSymbol == mySymbol
    }
    var opponentId: UUID? {
        switch mySymbol {
        case .x: return game.player_o
        case .o: return game.player_x
        default: return nil
        }
    }
    var isGameOver: Bool {
        switch game.statusEnum { case .x_wins, .o_wins, .draw: return true; default: return false }
    }
    var iWon: Bool {
        if game.statusEnum == .x_wins && mySymbol == .x { return true }
        if game.statusEnum == .o_wins && mySymbol == .o { return true }
        return false
    }

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
           initialPlayerX.uuidString.lowercased() == currentUserId.lowercased() {
            let rid = roomId
            Task {
                try? await TicTacToeService.cancelGame(roomId: rid, expectedStatus: "waiting")
            }
        }
    }

    private func joinIfNeeded() async {
        guard initialStatus == "waiting",
              initialPlayerX.uuidString.lowercased() != currentUserId.lowercased(),
              game.player_o == nil else { return }
        joining = true
        defer { joining = false }
        if let updated = try? await TicTacToeService.joinGame(roomId: roomId, userId: currentUserId) {
            self.game = updated
        } else if let fresh = try? await TicTacToeService.fetchGame(id: roomId) {
            self.game = fresh
        }
        await loadOpponentUsername()
    }

    private func loadOpponentUsername() async {
        guard let opponentId else { return }
        if let name = try? await TicTacToeService.fetchUsername(userId: opponentId) {
            self.opponentUsername = name
        }
    }

    func tapCell(_ i: Int) async {
        guard isMyTurn, game.boardCells[i] == .empty, let me = mySymbol else { return }
        var newBoard = game.board
        newBoard[i] = me.rawValue
        let cells = newBoard.map { TTTCell(rawValue: $0) ?? .empty }
        let result = TTTLogic.checkWinner(cells)
        let newStatus: String
        switch result {
        case .win(.x): newStatus = "x_wins"
        case .win(.o): newStatus = "o_wins"
        case .draw: newStatus = "draw"
        case .none: newStatus = "active"
        }
        let nextTurn = newStatus == "active" ? me.other.rawValue : game.current_turn
        let optimistic = TicTacToeGameRow(
            id: game.id, player_x: game.player_x, player_o: game.player_o,
            board: newBoard, current_turn: nextTurn, status: newStatus,
            created_at: game.created_at, updated_at: game.updated_at
        )
        self.game = optimistic
        self.lastMove = i

        do {
            try await TicTacToeService.makeMove(
                roomId: roomId,
                newBoard: newBoard,
                nextTurn: nextTurn,
                newStatus: newStatus,
                expectedTurn: me.rawValue
            )
        } catch {
            if let fresh = try? await TicTacToeService.fetchGame(id: roomId) {
                self.game = fresh
            }
        }
    }

    func startRematch() async {
        guard !rematching else { return }
        rematching = true
        defer { rematching = false }
        do {
            let row = try await TicTacToeService.createGame(userId: currentUserId)
            self.rematchGame = row
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func subscribe() {
        subscriptionTask?.cancel()
        let rid = roomId
        subscriptionTask = Task { [weak self] in
            guard let self else { return }
            await self.client.realtimeV2.connect()
            let channel = self.client.realtimeV2.channel("ttt:\(rid.uuidString)")
            let updates = channel.postgresChange(
                UpdateAction.self,
                schema: "public",
                table: "tic_tac_toe_games",
                filter: .eq("id", value: rid.uuidString)
            )
            do { try await channel.subscribeWithError() } catch { return }
            for await action in updates {
                if let row = try? action.decodeRecord(as: TicTacToeGameRow.self, decoder: JSONDecoder()) {
                    await self.handleUpdate(row)
                }
            }
        }
    }

    private func handleUpdate(_ row: TicTacToeGameRow) async {
        let oldBoard = game.board
        if let idx = row.board.enumerated().first(where: { $0.element != oldBoard[$0.offset] })?.offset {
            self.lastMove = idx
        }
        self.game = row
        if opponentUsername == nil { await loadOpponentUsername() }
        if row.statusEnum != .active { cancelCountdown(); opponentGone = false }
        if row.statusEnum == .active, presenceTask == nil { subscribePresenceIfNeeded() }
    }

    private func subscribePresenceIfNeeded() {
        guard game.statusEnum == .active, mySymbol != nil, presenceTask == nil else { return }
        let rid = roomId
        let uid = currentUserId
        presenceTask = Task { [weak self] in
            guard let self else { return }
            await self.client.realtimeV2.connect()
            let channel = self.client.realtimeV2.channel("presence:ttt:\(rid.uuidString)")
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
        try? await TicTacToeService.cancelGame(roomId: roomId, expectedStatus: "active")
        forceDismiss = true
    }

    func leaveNow() async {
        cancelCountdown()
        forceDismiss = true
    }
}
