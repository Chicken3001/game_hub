import SwiftUI
import Observation

@Observable
@MainActor
final class CheckersLocalViewModel {
    enum Phase { case setup, playing }
    enum GameResult: Equatable { case win(CheckersPlayer), draw }

    var phase: Phase = .setup

    // Settings (persist across replays)
    var forcedCapture: Bool = true
    var flipBetweenTurns: Bool = false

    // Gameplay state
    var board: [Int] = Checkers.initialBoard
    var turn: CheckersPlayer = .one
    var gameResult: GameResult? = nil
    var lastMove: (from: Int, to: Int)? = nil

    var selectedPiece: Int? = nil
    var pendingBoard: [Int]? = nil
    var mustContinueFrom: Int? = nil
    private var jumpOrigin: Int? = nil
    private var positionHistory: [String] = []

    var flipBoard: Bool { flipBetweenTurns && turn == .two }
    var activeBoard: [Int] { pendingBoard ?? board }
    var gameOver: Bool { gameResult != nil }

    var forcedPieces: Set<Int> {
        guard !gameOver, mustContinueFrom == nil, forcedCapture else { return [] }
        let moves = Checkers.validMoves(board: activeBoard, player: turn, enforceCapture: true)
        if !moves.contains(where: { !$0.jumped.isEmpty }) { return [] }
        return Set(moves.map { $0.from })
    }

    var validDestinations: Set<Int> {
        guard !gameOver else { return [] }
        if let cont = mustContinueFrom {
            return Set(Checkers.immediateJumps(board: activeBoard, from: cont, player: turn).map { $0.to })
        }
        guard let sel = selectedPiece else { return [] }
        let moves = Checkers.validMoves(board: activeBoard, player: turn, enforceCapture: forcedCapture)
        let hasJumps = moves.contains { !$0.jumped.isEmpty }
        if forcedCapture && hasJumps {
            return Set(Checkers.immediateJumps(board: activeBoard, from: sel, player: turn).map { $0.to })
        }
        var s = Set(Checkers.immediateJumps(board: activeBoard, from: sel, player: turn).map { $0.to })
        s.formUnion(Checkers.stepMoves(board: activeBoard, from: sel, player: turn))
        return s
    }

    // ── Phase transitions ────────────────────────────────────────────────
    func startGame() {
        board = Checkers.initialBoard
        turn = .one
        selectedPiece = nil
        pendingBoard = nil
        mustContinueFrom = nil
        jumpOrigin = nil
        lastMove = nil
        gameResult = nil
        positionHistory = [Checkers.boardKey(board: board, turn: .one)]
        phase = .playing
    }

    func changeSettings() { phase = .setup }

    func replay() { startGame() }

    // ── Tap handler ──────────────────────────────────────────────────────
    func tapCell(_ idx: Int) {
        guard phase == .playing, !gameOver else { return }
        let b = activeBoard

        if let cont = mustContinueFrom {
            let hops = Checkers.immediateJumps(board: b, from: cont, player: turn)
            guard let hop = hops.first(where: { $0.to == idx }) else { return }
            var nb = b
            nb[hop.to] = nb[cont]
            nb[cont] = 0
            nb[hop.jumped] = 0
            let (toRow, _) = Checkers.rowCol(hop.to)
            let kinged = (turn == .one && toRow == 0 && nb[hop.to] == 1) ||
                         (turn == .two && toRow == 7 && nb[hop.to] == 2)
            if kinged {
                nb[hop.to] = turn == .one ? 3 : 4
                commitMove(nb, from: jumpOrigin ?? cont, to: hop.to)
                return
            }
            let more = Checkers.immediateJumps(board: nb, from: hop.to, player: turn)
            if more.isEmpty {
                commitMove(nb, from: jumpOrigin ?? cont, to: hop.to)
            } else {
                selectedPiece = hop.to
                pendingBoard = nb
                mustContinueFrom = hop.to
            }
            return
        }

        if Checkers.isPlayerPiece(b[idx], turn) {
            if forcedCapture {
                let moves = Checkers.validMoves(board: b, player: turn, enforceCapture: true)
                let hasJumps = moves.contains { !$0.jumped.isEmpty }
                if hasJumps && Checkers.immediateJumps(board: b, from: idx, player: turn).isEmpty { return }
            }
            selectedPiece = idx
            pendingBoard = nil
            mustContinueFrom = nil
            return
        }

        guard let sel = selectedPiece else { return }

        if let hop = Checkers.immediateJumps(board: b, from: sel, player: turn).first(where: { $0.to == idx }) {
            var nb = b
            nb[hop.to] = nb[sel]
            nb[sel] = 0
            nb[hop.jumped] = 0
            let (toRow, _) = Checkers.rowCol(hop.to)
            let kinged = (turn == .one && toRow == 0 && nb[hop.to] == 1) ||
                         (turn == .two && toRow == 7 && nb[hop.to] == 2)
            if kinged {
                nb[hop.to] = turn == .one ? 3 : 4
                commitMove(nb, from: sel, to: hop.to)
                return
            }
            let more = Checkers.immediateJumps(board: nb, from: hop.to, player: turn)
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
            if turn == .one && toRow == 0 && nb[idx] == 1 { nb[idx] = 3 }
            if turn == .two && toRow == 7 && nb[idx] == 2 { nb[idx] = 4 }
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

        let nextTurn: CheckersPlayer = turn == .one ? .two : .one
        if let winner = Checkers.checkWinner(board: newBoard, nextPlayer: nextTurn) {
            gameResult = .win(winner)
            return
        }
        positionHistory.append(Checkers.boardKey(board: newBoard, turn: nextTurn))
        if checkRepetitionDraw() { gameResult = .draw; return }
        turn = nextTurn
    }

    private func checkRepetitionDraw() -> Bool {
        let p1 = positionHistory.filter { $0.hasSuffix("1") }.suffix(3)
        let p2 = positionHistory.filter { $0.hasSuffix("2") }.suffix(3)
        return p1.count == 3 && p1.allSatisfy({ $0 == p1.first }) &&
               p2.count == 3 && p2.allSatisfy({ $0 == p2.first })
    }
}
