import SwiftUI
import Observation

@Observable
@MainActor
final class CheckersComputerViewModel {
    enum Phase { case setup, playing }

    var phase: Phase = .setup

    // Settings (persist across replays)
    var difficulty: CheckersDifficulty = .medium
    var goFirst: Bool = true
    var forcedCapture: Bool = true

    // Gameplay state
    var board: [Int] = Checkers.initialBoard
    var isComputerTurn: Bool = false
    var isThinking: Bool = false
    var gameResult: GameResult? = nil
    var lastMove: (from: Int, to: Int)? = nil

    var selectedPiece: Int? = nil
    var pendingBoard: [Int]? = nil
    var mustContinueFrom: Int? = nil
    private var jumpOrigin: Int? = nil
    private var positionHistory: [String] = []

    private var aiTask: Task<Void, Never>?

    enum GameResult: Equatable { case humanWins, aiWins, draw }

    var humanPlayer: CheckersPlayer { goFirst ? .one : .two }
    var aiPlayer: CheckersPlayer { goFirst ? .two : .one }
    var flipBoard: Bool { humanPlayer == .two }
    var activeBoard: [Int] { pendingBoard ?? board }
    var gameOver: Bool { gameResult != nil }

    var forcedPieces: Set<Int> {
        guard !isComputerTurn, !gameOver, mustContinueFrom == nil, forcedCapture else { return [] }
        let moves = Checkers.validMoves(board: activeBoard, player: humanPlayer, enforceCapture: true)
        if !moves.contains(where: { !$0.jumped.isEmpty }) { return [] }
        return Set(moves.map { $0.from })
    }

    var validDestinations: Set<Int> {
        guard !isComputerTurn, !gameOver else { return [] }
        if let cont = mustContinueFrom {
            return Set(Checkers.immediateJumps(board: activeBoard, from: cont, player: humanPlayer).map { $0.to })
        }
        guard let sel = selectedPiece else { return [] }
        let moves = Checkers.validMoves(board: activeBoard, player: humanPlayer, enforceCapture: forcedCapture)
        let hasJumps = moves.contains { !$0.jumped.isEmpty }
        if forcedCapture && hasJumps {
            return Set(Checkers.immediateJumps(board: activeBoard, from: sel, player: humanPlayer).map { $0.to })
        }
        var s = Set(Checkers.immediateJumps(board: activeBoard, from: sel, player: humanPlayer).map { $0.to })
        s.formUnion(Checkers.stepMoves(board: activeBoard, from: sel, player: humanPlayer))
        return s
    }

    // ── Phase transitions ────────────────────────────────────────────────
    func startGame() {
        board = Checkers.initialBoard
        selectedPiece = nil
        pendingBoard = nil
        mustContinueFrom = nil
        jumpOrigin = nil
        lastMove = nil
        gameResult = nil
        positionHistory = [Checkers.boardKey(board: board, turn: .one)]
        isComputerTurn = !goFirst
        phase = .playing
        if isComputerTurn { scheduleAI() }
    }

    func changeSettings() {
        aiTask?.cancel(); aiTask = nil
        phase = .setup
    }

    // ── Tap handler (mirrors multiplayer) ────────────────────────────────
    func tapCell(_ idx: Int) {
        guard phase == .playing, !isComputerTurn, !gameOver else { return }
        let b = activeBoard

        if let cont = mustContinueFrom {
            let hops = Checkers.immediateJumps(board: b, from: cont, player: humanPlayer)
            guard let hop = hops.first(where: { $0.to == idx }) else { return }
            var nb = b
            nb[hop.to] = nb[cont]
            nb[cont] = 0
            nb[hop.jumped] = 0
            let (toRow, _) = Checkers.rowCol(hop.to)
            let kinged = (humanPlayer == .one && toRow == 0 && nb[hop.to] == 1) ||
                         (humanPlayer == .two && toRow == 7 && nb[hop.to] == 2)
            if kinged {
                nb[hop.to] = humanPlayer == .one ? 3 : 4
                commitMove(nb, from: jumpOrigin ?? cont, to: hop.to)
                return
            }
            let more = Checkers.immediateJumps(board: nb, from: hop.to, player: humanPlayer)
            if more.isEmpty {
                commitMove(nb, from: jumpOrigin ?? cont, to: hop.to)
            } else {
                selectedPiece = hop.to
                pendingBoard = nb
                mustContinueFrom = hop.to
            }
            return
        }

        if Checkers.isPlayerPiece(b[idx], humanPlayer) {
            if forcedCapture {
                let moves = Checkers.validMoves(board: b, player: humanPlayer, enforceCapture: true)
                let hasJumps = moves.contains { !$0.jumped.isEmpty }
                if hasJumps && Checkers.immediateJumps(board: b, from: idx, player: humanPlayer).isEmpty { return }
            }
            selectedPiece = idx
            pendingBoard = nil
            mustContinueFrom = nil
            return
        }

        guard let sel = selectedPiece else { return }

        if let hop = Checkers.immediateJumps(board: b, from: sel, player: humanPlayer).first(where: { $0.to == idx }) {
            var nb = b
            nb[hop.to] = nb[sel]
            nb[sel] = 0
            nb[hop.jumped] = 0
            let (toRow, _) = Checkers.rowCol(hop.to)
            let kinged = (humanPlayer == .one && toRow == 0 && nb[hop.to] == 1) ||
                         (humanPlayer == .two && toRow == 7 && nb[hop.to] == 2)
            if kinged {
                nb[hop.to] = humanPlayer == .one ? 3 : 4
                commitMove(nb, from: sel, to: hop.to)
                return
            }
            let more = Checkers.immediateJumps(board: nb, from: hop.to, player: humanPlayer)
            if more.isEmpty {
                commitMove(nb, from: sel, to: hop.to)
            } else {
                jumpOrigin = sel
                selectedPiece = hop.to
                pendingBoard = nb
                mustContinueFrom = hop.to
            }
        } else if validDestinations.contains(idx) {
            var nb = b
            nb[idx] = nb[sel]
            nb[sel] = 0
            let (toRow, _) = Checkers.rowCol(idx)
            if humanPlayer == .one && toRow == 0 && nb[idx] == 1 { nb[idx] = 3 }
            if humanPlayer == .two && toRow == 7 && nb[idx] == 2 { nb[idx] = 4 }
            commitMove(nb, from: sel, to: idx)
        }
    }

    private func commitMove(_ newBoard: [Int], from: Int, to: Int) {
        lastMove = (from, to)
        jumpOrigin = nil
        selectedPiece = nil
        pendingBoard = nil
        mustContinueFrom = nil
        board = newBoard

        if let winner = Checkers.checkWinner(board: newBoard, nextPlayer: aiPlayer) {
            gameResult = winner == humanPlayer ? .humanWins : .aiWins
            return
        }
        positionHistory.append(Checkers.boardKey(board: newBoard, turn: aiPlayer))
        if checkRepetitionDraw() { gameResult = .draw; return }

        isComputerTurn = true
        scheduleAI()
    }

    // ── AI turn ──────────────────────────────────────────────────────────
    private func scheduleAI() {
        aiTask?.cancel()
        let depth = Checkers.difficultyDepths[difficulty] ?? 2
        let ec = forcedCapture
        let ai = aiPlayer
        let human = humanPlayer
        let currentBoard = board

        aiTask = Task { [weak self] in
            let shouldShow = depth >= 4
            if shouldShow {
                await MainActor.run { self?.isThinking = true }
            }
            // Small minimum delay so easier moves don't feel instantaneous
            let minDelay: UInt64 = depth >= 5 ? 200_000_000 : 400_000_000
            async let move: CheckersMove? = Task.detached(priority: .userInitiated) {
                Checkers.bestMove(board: currentBoard, ai: ai, depth: depth, enforceCapture: ec)
            }.value
            try? await Task.sleep(nanoseconds: minDelay)
            let chosen = await move
            if Task.isCancelled { return }
            await MainActor.run {
                guard let self else { return }
                self.isThinking = false
                guard let m = chosen else {
                    // AI has no moves → human wins
                    self.gameResult = .humanWins
                    self.isComputerTurn = false
                    return
                }
                let newBoard = Checkers.applyMove(board: self.board, move: m)
                self.lastMove = (m.from, m.to)
                self.board = newBoard

                if let winner = Checkers.checkWinner(board: newBoard, nextPlayer: human) {
                    self.gameResult = winner == human ? .humanWins : .aiWins
                    self.isComputerTurn = false
                    return
                }
                self.positionHistory.append(Checkers.boardKey(board: newBoard, turn: human))
                if self.checkRepetitionDraw() {
                    self.gameResult = .draw
                    self.isComputerTurn = false
                    return
                }
                self.isComputerTurn = false
            }
        }
    }

    private func checkRepetitionDraw() -> Bool {
        let p1 = positionHistory.filter { $0.hasSuffix("1") }.suffix(3)
        let p2 = positionHistory.filter { $0.hasSuffix("2") }.suffix(3)
        return p1.count == 3 && p1.allSatisfy({ $0 == p1.first }) &&
               p2.count == 3 && p2.allSatisfy({ $0 == p2.first })
    }

    func replay() {
        aiTask?.cancel(); aiTask = nil
        startGame()
    }
}
