import SwiftUI
import Observation

@Observable
@MainActor
final class TicTacToeViewModel {
    enum Phase { case chooseOrder, playing }

    var phase: Phase = .chooseOrder
    var board: [TTTCell] = TTTLogic.emptyBoard()
    var isComputerTurn: Bool = false
    var lastMove: Int? = nil
    var goFirst: Bool = true

    var mySymbol: TTTSymbol { goFirst ? .x : .o }
    var aiSymbol: TTTSymbol { goFirst ? .o : .x }
    var winner: TTTResult? { TTTLogic.checkWinner(board) }
    var gameOver: Bool { winner != nil }

    private var aiTask: Task<Void, Never>?

    func selectOrder(goFirst first: Bool) {
        goFirst = first
        board = TTTLogic.emptyBoard()
        lastMove = nil
        phase = .playing
        isComputerTurn = !first
        if isComputerTurn { scheduleAIMove() }
    }

    func tapCell(_ i: Int) {
        guard phase == .playing, !isComputerTurn, !gameOver, board[i] == .empty else { return }
        board[i] = mySymbol.cell
        lastMove = i
        if TTTLogic.checkWinner(board) == nil {
            isComputerTurn = true
            scheduleAIMove()
        }
    }

    func replay() {
        aiTask?.cancel()
        board = TTTLogic.emptyBoard()
        lastMove = nil
        isComputerTurn = !goFirst
        if isComputerTurn { scheduleAIMove() }
    }

    func changeOrder() {
        aiTask?.cancel()
        phase = .chooseOrder
        board = TTTLogic.emptyBoard()
        lastMove = nil
        isComputerTurn = false
    }

    private func scheduleAIMove() {
        aiTask?.cancel()
        aiTask = Task { [weak self] in
            try? await Task.sleep(nanoseconds: 400_000_000)
            if Task.isCancelled { return }
            await MainActor.run {
                guard let self, self.isComputerTurn, !self.gameOver else { return }
                let move = TTTLogic.bestMove(self.board, ai: self.aiSymbol)
                if move != -1 {
                    self.board[move] = self.aiSymbol.cell
                    self.lastMove = move
                }
                self.isComputerTurn = false
            }
        }
    }
}
