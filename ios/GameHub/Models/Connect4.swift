import Foundation

// 0=empty, 1=P1 (Red), 2=P2 (Yellow)
typealias Connect4Cell = Int

enum Connect4Player: Int, Sendable { case one = 1, two = 2
    var other: Connect4Player { self == .one ? .two : .one }
}

struct Connect4GameRow: Codable, Identifiable, Equatable, Sendable, Hashable {
    let id: UUID
    let player_1: UUID
    let player_2: UUID?
    let board: [Int]
    let current_turn: Int
    let status: String
    let created_at: String
    let updated_at: String

    enum Status: String {
        case waiting, active, cancelled, draw
        case p1_wins, p2_wins
    }
    var statusEnum: Status { Status(rawValue: status) ?? .waiting }
    var turnPlayer: Connect4Player { current_turn == 2 ? .two : .one }
    var isGameOver: Bool {
        switch statusEnum { case .p1_wins, .p2_wins, .draw: return true; default: return false }
    }
}

enum Connect4 {
    static let rows = 6
    static let cols = 7
    static let emptyBoard: [Int] = Array(repeating: 0, count: rows * cols)

    /// Returns the row index the piece will land in, or -1 if the column is full.
    static func dropRow(board: [Int], col: Int) -> Int {
        for r in stride(from: rows - 1, through: 0, by: -1) {
            if board[r * cols + col] == 0 { return r }
        }
        return -1
    }

    /// Center-first ordering dramatically improves alpha-beta pruning.
    static func validCols(board: [Int]) -> [Int] {
        [3, 2, 4, 1, 5, 0, 6].filter { board[$0] == 0 }
    }

    private static let winDirs: [(Int, Int)] = [(0, 1), (1, 0), (1, 1), (1, -1)]

    enum WinResult: Equatable { case player(Connect4Player), draw }

    static func checkWinner(board: [Int]) -> WinResult? {
        for r in 0..<rows {
            for c in 0..<cols {
                let v = board[r * cols + c]
                if v == 0 { continue }
                for (dr, dc) in winDirs {
                    var ok = true
                    for i in 1...3 {
                        let nr = r + dr * i, nc = c + dc * i
                        if nr < 0 || nr >= rows || nc < 0 || nc >= cols || board[nr * cols + nc] != v {
                            ok = false; break
                        }
                    }
                    if ok { return .player(v == 1 ? .one : .two) }
                }
            }
        }
        if board.allSatisfy({ $0 != 0 }) { return .draw }
        return nil
    }

    // ── AI: minimax w/ alpha-beta (heuristic mirrors web) ────────────────────

    static let difficultyDepths: [Connect4Difficulty: Int] = [
        .easy: 1, .medium: 2, .hard: 3, .veryHard: 4, .impossible: 5
    ]

    private static func scoreWindow(_ w: [Int], ai: Connect4Player) -> Int {
        let aiVal = ai.rawValue
        let opp = ai.other.rawValue
        let p = w.filter { $0 == aiVal }.count
        let o = w.filter { $0 == opp }.count
        let e = w.filter { $0 == 0 }.count
        if o > 0 && p > 0 { return 0 }
        if p == 4 { return 100 }
        if p == 3 && e == 1 { return 5 }
        if p == 2 && e == 2 { return 2 }
        if o == 3 && e == 1 { return -4 }
        return 0
    }

    private static func heuristic(board: [Int], ai: Connect4Player) -> Int {
        var s = 0
        let aiVal = ai.rawValue
        for r in 0..<rows where board[r * cols + 3] == aiVal { s += 3 }
        // Rows
        for r in 0..<rows {
            for c in 0...(cols - 4) {
                let w = (0..<4).map { board[r * cols + c + $0] }
                s += scoreWindow(w, ai: ai)
            }
        }
        // Cols
        for c in 0..<cols {
            for r in 0...(rows - 4) {
                let w = (0..<4).map { board[(r + $0) * cols + c] }
                s += scoreWindow(w, ai: ai)
            }
        }
        // Diag \
        for r in 0...(rows - 4) {
            for c in 0...(cols - 4) {
                let w = (0..<4).map { board[(r + $0) * cols + c + $0] }
                s += scoreWindow(w, ai: ai)
            }
        }
        // Diag /
        for r in 3..<rows {
            for c in 0...(cols - 4) {
                let w = (0..<4).map { board[(r - $0) * cols + c + $0] }
                s += scoreWindow(w, ai: ai)
            }
        }
        return s
    }

    private static func minimax(
        board: [Int], depth: Int, alpha: Int, beta: Int, maximizing: Bool, ai: Connect4Player
    ) -> Int {
        let human = ai.other
        if let w = checkWinner(board: board) {
            switch w {
            case .player(let p):
                if p == ai { return 1000 + depth }
                if p == human { return -1000 - depth }
                return 0
            case .draw: return 0
            }
        }
        if depth == 0 {
            return heuristic(board: board, ai: ai) - heuristic(board: board, ai: human)
        }
        var a = alpha, b = beta
        let cols = validCols(board: board)
        if maximizing {
            var best = Int.min
            for col in cols {
                var next = board
                next[dropRow(board: next, col: col) * Self.cols + col] = ai.rawValue
                best = max(best, minimax(board: next, depth: depth - 1, alpha: a, beta: b, maximizing: false, ai: ai))
                a = max(a, best)
                if b <= a { break }
            }
            return best
        } else {
            var best = Int.max
            for col in cols {
                var next = board
                next[dropRow(board: next, col: col) * Self.cols + col] = human.rawValue
                best = min(best, minimax(board: next, depth: depth - 1, alpha: a, beta: b, maximizing: true, ai: ai))
                b = min(b, best)
                if b <= a { break }
            }
            return best
        }
    }

    static func bestMove(board: [Int], ai: Connect4Player, depth: Int) -> Int {
        let cols = validCols(board: board)
        guard let first = cols.first else { return -1 }
        var bestVal = Int.min
        var bestCol = first
        for col in cols {
            var next = board
            next[dropRow(board: next, col: col) * Self.cols + col] = ai.rawValue
            let val = minimax(board: next, depth: depth - 1, alpha: Int.min, beta: Int.max, maximizing: false, ai: ai)
            if val > bestVal { bestVal = val; bestCol = col }
        }
        return bestCol
    }
}

enum Connect4Difficulty: String, CaseIterable, Sendable {
    case easy, medium, hard, veryHard = "very-hard", impossible
    var label: String {
        switch self {
        case .easy: return "Easy"
        case .medium: return "Medium"
        case .hard: return "Hard"
        case .veryHard: return "Very Hard"
        case .impossible: return "Impossible"
        }
    }
    var emoji: String {
        switch self {
        case .easy: return "🌱"
        case .medium: return "🌿"
        case .hard: return "🌳"
        case .veryHard: return "🔥"
        case .impossible: return "💀"
        }
    }
}
