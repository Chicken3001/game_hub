import SwiftUI
import Observation

@Observable
@MainActor
final class Connect4ComputerViewModel {
    enum Phase { case setup, playing }

    var phase: Phase = .setup

    // Settings
    var difficulty: Connect4Difficulty = .medium
    var goFirst: Bool = true

    // Gameplay state
    var board: [Int] = Connect4.emptyBoard
    var isComputerTurn: Bool = false
    var isThinking: Bool = false
    var gameResult: GameResult? = nil
    var lastMove: Int? = nil

    private var aiTask: Task<Void, Never>?

    enum GameResult: Equatable { case humanWins, aiWins, draw }

    var humanPlayer: Connect4Player { goFirst ? .one : .two }
    var aiPlayer: Connect4Player { goFirst ? .two : .one }
    var gameOver: Bool { gameResult != nil }

    // ── Phase transitions ────────────────────────────────────────────────
    func startGame() {
        board = Connect4.emptyBoard
        lastMove = nil
        gameResult = nil
        isComputerTurn = !goFirst
        phase = .playing
        if isComputerTurn { scheduleAI() }
    }

    func changeSettings() {
        aiTask?.cancel(); aiTask = nil
        phase = .setup
    }

    func replay() {
        aiTask?.cancel(); aiTask = nil
        startGame()
    }

    // ── Move handler ─────────────────────────────────────────────────────
    func dropInColumn(_ col: Int) {
        guard phase == .playing, !isComputerTurn, !gameOver else { return }
        let row = Connect4.dropRow(board: board, col: col)
        guard row != -1 else { return }
        let idx = row * Connect4.cols + col
        var next = board
        next[idx] = humanPlayer.rawValue
        board = next
        lastMove = idx

        if let result = resultFor(board: next) {
            gameResult = result
            return
        }
        isComputerTurn = true
        scheduleAI()
    }

    private func resultFor(board: [Int]) -> GameResult? {
        guard let w = Connect4.checkWinner(board: board) else { return nil }
        switch w {
        case .player(let p): return p == humanPlayer ? .humanWins : .aiWins
        case .draw: return .draw
        }
    }

    // ── AI turn ──────────────────────────────────────────────────────────
    private func scheduleAI() {
        aiTask?.cancel()
        let depth = Connect4.difficultyDepths[difficulty] ?? 2
        let ai = aiPlayer
        let currentBoard = board

        aiTask = Task { [weak self] in
            let shouldShow = depth >= 4
            if shouldShow {
                await MainActor.run { self?.isThinking = true }
            }
            let minDelay: UInt64 = depth >= 5 ? 300_000_000 : 400_000_000
            async let pick: Int = Task.detached(priority: .userInitiated) {
                Connect4.bestMove(board: currentBoard, ai: ai, depth: depth)
            }.value
            try? await Task.sleep(nanoseconds: minDelay)
            let col = await pick
            if Task.isCancelled { return }
            await MainActor.run {
                guard let self else { return }
                self.isThinking = false
                guard col >= 0 else {
                    self.gameResult = .humanWins
                    self.isComputerTurn = false
                    return
                }
                let row = Connect4.dropRow(board: self.board, col: col)
                guard row != -1 else {
                    self.isComputerTurn = false
                    return
                }
                let idx = row * Connect4.cols + col
                var next = self.board
                next[idx] = ai.rawValue
                self.board = next
                self.lastMove = idx
                if let result = self.resultFor(board: next) {
                    self.gameResult = result
                }
                self.isComputerTurn = false
            }
        }
    }
}
