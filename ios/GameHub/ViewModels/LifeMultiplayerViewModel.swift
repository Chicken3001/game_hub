import SwiftUI
import Supabase
import Observation

@Observable
@MainActor
final class LifeMultiplayerViewModel {
    var game: LifeGameRow
    var joining: Bool = false
    var starting: Bool = false
    var rematching: Bool = false
    var usernames: [UUID: String] = [:]
    var errorMessage: String? = nil
    var rematchGame: LifeGameRow? = nil
    var forceDismiss: Bool = false

    /// Seconds until an away player's turn is skipped for them.
    var skipCountdown: Int? = nil
    static let skipTimeout: Int = 30

    private let roomId: UUID
    private let currentUserId: String
    private let client = SupabaseService.client
    private var subscriptionTask: Task<Void, Never>?
    private var presenceTask: Task<Void, Never>?
    private var countdownTask: Task<Void, Never>?
    private let initialStatus: String
    private let initialHost: UUID

    /// Everyone currently connected to this room, by lowercased uuid string.
    private var presentUserIds: Set<String> = []

    struct PresencePayload: Codable { let userId: String }

    init(initialGame: LifeGameRow, currentUserId: String) {
        self.game = initialGame
        self.roomId = initialGame.id
        self.currentUserId = currentUserId
        self.initialStatus = initialGame.status
        self.initialHost = initialGame.host
        self.presentUserIds = [currentUserId.lowercased()]
    }

    // MARK: - Identity

    var myUUID: UUID? { UUID(uuidString: currentUserId) }
    var me: LifePlayerState? { myUUID.flatMap { game.player(userId: $0) } }
    var mySeat: Int? { me?.seat }
    var isSpectator: Bool { me == nil }
    var isHost: Bool { initialHost.uuidString.lowercased() == currentUserId.lowercased() }

    var currentPlayer: LifePlayerState? { game.player(seat: game.current_turn) }
    var isMyTurn: Bool {
        game.statusEnum == .active && mySeat != nil && mySeat == game.current_turn
    }

    /// The decision this device owes the game, if any.
    var myPending: LifePending? {
        guard let pending = game.pending, pending.seat == mySeat else { return nil }
        return pending
    }

    var canSpin: Bool {
        isMyTurn && game.pending == nil && !(me?.retired ?? true) && game.statusEnum == .active
    }

    var canStart: Bool {
        isHost && game.statusEnum == .waiting && game.players.count >= LifeEngine.minPlayers
    }

    var isFull: Bool { game.players.count >= LifeEngine.maxPlayers }

    func username(_ p: LifePlayerState) -> String {
        if p.user_id.uuidString.lowercased() == currentUserId.lowercased() { return "You" }
        return usernames[p.user_id] ?? "Player \(p.seat + 1)"
    }

    var iWon: Bool {
        guard let winner = game.winner, let me else { return false }
        return winner.user_id == me.user_id
    }

    // MARK: - Lifecycle

    func onAppear() {
        Task { await self.joinIfNeeded() }
        subscribe()
        subscribePresence()
        Task { await self.loadUsernames() }
    }

    func onDisappear() {
        subscriptionTask?.cancel(); subscriptionTask = nil
        presenceTask?.cancel(); presenceTask = nil
        countdownTask?.cancel(); countdownTask = nil
        // A host who backs out of their own waiting room takes the room with them.
        if initialStatus == "waiting", isHost {
            let rid = roomId
            Task { try? await LifeService.cancelGame(roomId: rid, expectedStatus: "waiting") }
        }
    }

    private func joinIfNeeded() async {
        guard initialStatus == "waiting", !isHost, me == nil, !isFull else { return }
        joining = true
        defer { joining = false }
        if let updated = try? await LifeService.joinGame(roomId: roomId) {
            self.game = updated
        } else if let fresh = try? await LifeService.fetchGame(id: roomId) {
            self.game = fresh
        }
        await loadUsernames()
    }

    private func loadUsernames() async {
        for p in game.players where usernames[p.user_id] == nil {
            if let name = try? await LifeService.fetchUsername(userId: p.user_id) {
                usernames[p.user_id] = name
            }
        }
    }

    // MARK: - Host actions

    func startGame() async {
        guard canStart, !starting else { return }
        starting = true
        defer { starting = false }
        if let row = try? await LifeService.startGame(roomId: roomId) {
            self.game = row
        }
    }

    func startRematch() async {
        guard !rematching else { return }
        rematching = true
        defer { rematching = false }
        do {
            self.rematchGame = try await LifeService.createGame(userId: currentUserId)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    // MARK: - Play

    func spin() {
        guard canSpin else { return }
        let value = LifeEngine.randomSpin()
        guard let outcome = LifeEngine.takeTurn(
            players: game.players, currentTurn: game.current_turn, spin: value
        ) else { return }
        push(outcome, spin: value, expectedTurn: game.current_turn)
    }

    func choose(_ option: String) {
        guard let pending = myPending else { return }
        guard let outcome = LifeEngine.resolve(
            players: game.players, currentTurn: game.current_turn,
            pending: pending, choice: option
        ) else {
            errorMessage = "That choice isn't allowed."
            return
        }
        push(outcome, spin: game.spin, expectedTurn: game.current_turn)
    }

    /// Optimistically apply an outcome locally, then persist it.
    /// `expectedTurn` is the turn we believed was current; the write is a no-op if it moved on.
    private func push(_ outcome: LifeOutcome, spin: Int?, expectedTurn: Int) {
        self.game = makeRow(outcome, spin: spin)
        let rid = roomId
        Task {
            do {
                try await LifeService.applyOutcome(
                    roomId: rid, outcome: outcome, spin: spin, expectedTurn: expectedTurn
                )
            } catch {
                // Lost the race, or offline. Re-sync from the source of truth.
                if let fresh = try? await LifeService.fetchGame(id: rid) {
                    self.game = fresh
                }
            }
        }
    }

    private func makeRow(_ o: LifeOutcome, spin: Int?) -> LifeGameRow {
        LifeGameRow(
            id: game.id, host: game.host, players: o.players,
            current_turn: o.currentTurn, spin: spin, pending: o.pending,
            log: Array(o.log.suffix(LifeLog.maxEntries)), status: o.status,
            created_at: game.created_at, updated_at: game.updated_at
        )
    }

    // MARK: - Realtime

    private func subscribe() {
        subscriptionTask?.cancel()
        let rid = roomId
        subscriptionTask = Task { [weak self] in
            guard let self else { return }
            await self.client.realtimeV2.connect()
            let channel = self.client.realtimeV2.channel("life:\(rid.uuidString)")
            let updates = channel.postgresChange(
                UpdateAction.self, schema: "public", table: "life_games",
                filter: .eq("id", value: rid.uuidString)
            )
            do { try await channel.subscribeWithError() } catch { return }
            for await action in updates {
                if let row = try? action.decodeRecord(as: LifeGameRow.self, decoder: JSONDecoder()) {
                    await self.handleRemoteUpdate(row)
                }
            }
        }
    }

    private func handleRemoteUpdate(_ row: LifeGameRow) async {
        let seatsChanged = row.players.count != game.players.count
        self.game = row
        if seatsChanged { await loadUsernames() }
        if row.statusEnum != .active { cancelCountdown() }
        evaluateAwayPlayer()
    }

    // MARK: - Presence

    private func subscribePresence() {
        guard presenceTask == nil else { return }
        let rid = roomId
        let uid = currentUserId
        presenceTask = Task { [weak self] in
            guard let self else { return }
            await self.client.realtimeV2.connect()
            let channel = self.client.realtimeV2.channel("presence:life:\(rid.uuidString)")
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
        for j in joins { presentUserIds.insert(j.userId.lowercased()) }
        for l in leaves { presentUserIds.remove(l.userId.lowercased()) }
        presentUserIds.insert(currentUserId.lowercased())
        evaluateAwayPlayer()
    }

    private func isPresent(_ p: LifePlayerState) -> Bool {
        presentUserIds.contains(p.user_id.uuidString.lowercased())
    }

    /// Exactly one client should issue the skip: the lowest-seated player still here.
    private var isDesignatedSkipper: Bool {
        guard let me else { return false }
        let candidates = game.players
            .filter { isPresent($0) && $0.seat != game.current_turn }
            .map(\.seat)
        return candidates.min() == me.seat
    }

    private func evaluateAwayPlayer() {
        guard game.statusEnum == .active, let current = currentPlayer else {
            cancelCountdown(); return
        }
        if isPresent(current) || current.seat == mySeat {
            cancelCountdown()
        } else if skipCountdown == nil {
            startCountdown()
        }
    }

    private func startCountdown() {
        cancelCountdown()
        skipCountdown = Self.skipTimeout
        countdownTask = Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 1_000_000_000)
                if Task.isCancelled { return }
                await MainActor.run {
                    guard let self else { return }
                    if let n = self.skipCountdown, n > 1 {
                        self.skipCountdown = n - 1
                    } else {
                        self.skipCountdown = nil
                        self.skipAwayPlayer()
                    }
                }
                if self?.skipCountdown == nil { return }
            }
        }
    }

    private func cancelCountdown() {
        countdownTask?.cancel(); countdownTask = nil
        skipCountdown = nil
    }

    private func skipAwayPlayer() {
        guard game.statusEnum == .active, isDesignatedSkipper else { return }
        let expected = game.current_turn
        let outcome = LifeEngine.skipTurn(players: game.players, currentTurn: expected)
        push(outcome, spin: nil, expectedTurn: expected)
    }

    func leaveNow() {
        cancelCountdown()
        forceDismiss = true
    }
}
