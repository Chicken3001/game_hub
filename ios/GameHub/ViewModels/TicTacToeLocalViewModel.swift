import SwiftUI
import Observation

@Observable
@MainActor
final class TicTacToeLocalViewModel {
    var board: [TTTCell] = TTTLogic.emptyBoard()
    var turn: TTTSymbol = .x
    var lastMove: Int? = nil

    var winner: TTTResult? { TTTLogic.checkWinner(board) }
    var gameOver: Bool { winner != nil }

    func tapCell(_ i: Int) {
        guard !gameOver, board[i] == .empty else { return }
        board[i] = turn.cell
        lastMove = i
        if TTTLogic.checkWinner(board) == nil {
            turn = turn.other
        }
    }

    func replay() {
        board = TTTLogic.emptyBoard()
        lastMove = nil
        turn = .x
    }
}
