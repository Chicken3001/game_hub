import Foundation

struct TicTacToeGameRow: Codable, Identifiable, Equatable, Sendable, Hashable {
    let id: UUID
    let player_x: UUID
    let player_o: UUID?
    let board: [String]
    let current_turn: String
    let status: String
    let created_at: String
    let updated_at: String

    var boardCells: [TTTCell] { board.map { TTTCell(rawValue: $0) ?? .empty } }
    var turnSymbol: TTTSymbol { current_turn == "O" ? .o : .x }

    enum Status: String {
        case waiting, active, cancelled, draw
        case x_wins, o_wins
    }
    var statusEnum: Status { Status(rawValue: status) ?? .waiting }
}

enum TTTCell: String, Equatable {
    case empty = ""
    case x = "X"
    case o = "O"
}

enum TTTSymbol: String { case x = "X", o = "O"
    var cell: TTTCell { self == .x ? .x : .o }
    var other: TTTSymbol { self == .x ? .o : .x }
}

enum TTTResult: Equatable { case win(TTTSymbol), draw }

enum TTTLogic {
    static let winLines: [[Int]] = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6],
    ]

    static func emptyBoard() -> [TTTCell] { Array(repeating: .empty, count: 9) }

    static func checkWinner(_ b: [TTTCell]) -> TTTResult? {
        for line in winLines {
            let a = b[line[0]]
            if a != .empty && a == b[line[1]] && a == b[line[2]] {
                return .win(a == .x ? .x : .o)
            }
        }
        return b.allSatisfy { $0 != .empty } ? .draw : nil
    }

    private static func minimax(_ board: inout [TTTCell], isMaximizing: Bool, ai: TTTSymbol) -> Int {
        let human = ai.other
        if let r = checkWinner(board) {
            switch r {
            case .win(let s) where s == ai: return 10
            case .win(let s) where s == human: return -10
            case .draw: return 0
            default: break
            }
        }
        if isMaximizing {
            var best = Int.min
            for i in 0..<9 where board[i] == .empty {
                board[i] = ai.cell
                best = max(best, minimax(&board, isMaximizing: false, ai: ai))
                board[i] = .empty
            }
            return best
        } else {
            var best = Int.max
            for i in 0..<9 where board[i] == .empty {
                board[i] = human.cell
                best = min(best, minimax(&board, isMaximizing: true, ai: ai))
                board[i] = .empty
            }
            return best
        }
    }

    static func bestMove(_ board: [TTTCell], ai: TTTSymbol) -> Int {
        var b = board
        var bestVal = Int.min
        var bestMove = -1
        for i in 0..<9 where b[i] == .empty {
            b[i] = ai.cell
            let v = minimax(&b, isMaximizing: false, ai: ai)
            b[i] = .empty
            if v > bestVal { bestVal = v; bestMove = i }
        }
        return bestMove
    }
}
