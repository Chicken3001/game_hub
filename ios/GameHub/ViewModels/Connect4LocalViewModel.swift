import SwiftUI
import Observation

@Observable
@MainActor
final class Connect4LocalViewModel {
    enum GameResult: Equatable { case win(Connect4Player), draw }

    var board: [Int] = Connect4.emptyBoard
    var turn: Connect4Player = .one
    var lastMove: Int? = nil
    var gameResult: GameResult? = nil

    var gameOver: Bool { gameResult != nil }

    func dropInColumn(_ col: Int) {
        guard !gameOver else { return }
        let row = Connect4.dropRow(board: board, col: col)
        guard row != -1 else { return }
        let idx = row * Connect4.cols + col
        var next = board
        next[idx] = turn.rawValue
        board = next
        lastMove = idx

        if let w = Connect4.checkWinner(board: next) {
            switch w {
            case .player(let p): gameResult = .win(p)
            case .draw: gameResult = .draw
            }
            return
        }
        turn = turn.other
    }

    func replay() {
        board = Connect4.emptyBoard
        turn = .one
        lastMove = nil
        gameResult = nil
    }
}
