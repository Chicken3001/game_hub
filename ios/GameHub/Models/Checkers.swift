import Foundation

// 0=empty, 1=P1 piece (Red), 2=P2 piece (Black), 3=P1 king, 4=P2 king
typealias CheckersCell = Int

enum CheckersPlayer: Int, Sendable { case one = 1, two = 2
    var other: CheckersPlayer { self == .one ? .two : .one }
}

struct CheckersMove: Sendable, Equatable {
    let from: Int
    let to: Int
    let jumped: [Int]
}

struct CheckersGameRow: Codable, Identifiable, Equatable, Sendable, Hashable {
    let id: UUID
    let player_1: UUID
    let player_2: UUID?
    let board: [Int]
    let current_turn: Int
    let status: String
    let position_history: [String]
    let forced_capture: Bool
    let created_at: String
    let updated_at: String

    enum Status: String {
        case waiting, active, cancelled, draw
        case p1_wins, p2_wins
    }
    var statusEnum: Status { Status(rawValue: status) ?? .waiting }
    var turnPlayer: CheckersPlayer { current_turn == 2 ? .two : .one }
    var isGameOver: Bool {
        switch statusEnum { case .p1_wins, .p2_wins, .draw: return true; default: return false }
    }
}

enum Checkers {
    static let rows = 8
    static let cols = 8

    static func rowCol(_ idx: Int) -> (Int, Int) { (idx / cols, idx % cols) }
    static func isDark(_ idx: Int) -> Bool {
        let (r, c) = rowCol(idx); return (r + c) % 2 == 1
    }
    static func isPlayerPiece(_ cell: Int, _ player: CheckersPlayer) -> Bool {
        player == .one ? (cell == 1 || cell == 3) : (cell == 2 || cell == 4)
    }
    static func isKing(_ cell: Int) -> Bool { cell == 3 || cell == 4 }
    static func ownerOf(_ cell: Int) -> CheckersPlayer? {
        if cell == 1 || cell == 3 { return .one }
        if cell == 2 || cell == 4 { return .two }
        return nil
    }

    private static func moveDirections(_ cell: Int) -> [(Int, Int)] {
        if cell == 1 { return [(-1, -1), (-1, 1)] }
        if cell == 2 { return [(1, -1), (1, 1)] }
        return [(-1, -1), (-1, 1), (1, -1), (1, 1)]
    }

    static let initialBoard: [Int] = {
        var b = Array(repeating: 0, count: 64)
        for r in 0..<rows {
            for c in 0..<cols where (r + c) % 2 == 1 {
                let idx = r * cols + c
                if r < 3 { b[idx] = 2 }
                else if r > 4 { b[idx] = 1 }
            }
        }
        return b
    }()

    struct Jump: Equatable { let to: Int; let jumped: Int }

    static func immediateJumps(board: [Int], from idx: Int, player: CheckersPlayer) -> [Jump] {
        let cell = board[idx]
        guard isPlayerPiece(cell, player) else { return [] }
        let (row, col) = rowCol(idx)
        let dirs = moveDirections(cell)
        let opp = player.other
        var result: [Jump] = []
        for (dr, dc) in dirs {
            let midR = row + dr, midC = col + dc
            let landR = row + 2 * dr, landC = col + 2 * dc
            if midR < 0 || midR >= rows || midC < 0 || midC >= cols { continue }
            if landR < 0 || landR >= rows || landC < 0 || landC >= cols { continue }
            let midIdx = midR * cols + midC
            let landIdx = landR * cols + landC
            if !isPlayerPiece(board[midIdx], opp) { continue }
            if board[landIdx] != 0 { continue }
            result.append(Jump(to: landIdx, jumped: midIdx))
        }
        return result
    }

    static func stepMoves(board: [Int], from idx: Int, player: CheckersPlayer) -> [Int] {
        let cell = board[idx]
        guard isPlayerPiece(cell, player) else { return [] }
        let (row, col) = rowCol(idx)
        let dirs = moveDirections(cell)
        var result: [Int] = []
        for (dr, dc) in dirs {
            let nr = row + dr, nc = col + dc
            if nr < 0 || nr >= rows || nc < 0 || nc >= cols { continue }
            let ni = nr * cols + nc
            if board[ni] == 0 { result.append(ni) }
        }
        return result
    }

    static func allJumpSequences(board: [Int], from fromIdx: Int, player: CheckersPlayer) -> [CheckersMove] {
        func recurse(_ b: [Int], _ cur: Int, _ jumped: [Int]) -> [CheckersMove] {
            let cell = b[cur]
            let hops = immediateJumps(board: b, from: cur, player: player)
                .filter { !jumped.contains($0.jumped) }
            if hops.isEmpty {
                if jumped.isEmpty { return [] }
                return [CheckersMove(from: fromIdx, to: cur, jumped: jumped)]
            }
            var out: [CheckersMove] = []
            for hop in hops {
                var nb = b
                nb[hop.to] = cell
                nb[cur] = 0
                nb[hop.jumped] = 0
                let (toRow, _) = rowCol(hop.to)
                let kinged = (player == .one && toRow == 0 && cell == 1) ||
                             (player == .two && toRow == 7 && cell == 2)
                if kinged {
                    nb[hop.to] = player == .one ? 3 : 4
                    out.append(CheckersMove(from: fromIdx, to: hop.to, jumped: jumped + [hop.jumped]))
                } else {
                    out.append(contentsOf: recurse(nb, hop.to, jumped + [hop.jumped]))
                }
            }
            return out
        }
        return recurse(board, fromIdx, [])
    }

    static func validMoves(board: [Int], player: CheckersPlayer, enforceCapture: Bool = true) -> [CheckersMove] {
        var jumps: [CheckersMove] = []
        var steps: [CheckersMove] = []
        for i in 0..<64 where isPlayerPiece(board[i], player) {
            jumps.append(contentsOf: allJumpSequences(board: board, from: i, player: player))
        }
        if enforceCapture && !jumps.isEmpty { return jumps }
        for i in 0..<64 where isPlayerPiece(board[i], player) {
            for to in stepMoves(board: board, from: i, player: player) {
                steps.append(CheckersMove(from: i, to: to, jumped: []))
            }
        }
        return jumps + steps
    }

    static func applyMove(board: [Int], move: CheckersMove) -> [Int] {
        var nb = board
        let piece = nb[move.from]
        nb[move.to] = piece
        nb[move.from] = 0
        for j in move.jumped { nb[j] = 0 }
        let (toRow, _) = rowCol(move.to)
        if piece == 1 && toRow == 0 { nb[move.to] = 3 }
        if piece == 2 && toRow == 7 { nb[move.to] = 4 }
        return nb
    }

    static func boardKey(board: [Int], turn: CheckersPlayer) -> String {
        board.map { String($0) }.joined() + "\(turn.rawValue)"
    }

    /// Returns the winner if `nextPlayer` has no pieces or no legal moves.
    static func checkWinner(board: [Int], nextPlayer: CheckersPlayer) -> CheckersPlayer? {
        if !board.contains(where: { isPlayerPiece($0, nextPlayer) }) { return nextPlayer.other }
        if validMoves(board: board, player: nextPlayer).isEmpty { return nextPlayer.other }
        return nil
    }

    // ── AI: minimax w/ alpha-beta ────────────────────────────────────────────
    static let difficultyDepths: [CheckersDifficulty: Int] = [
        .easy: 1, .medium: 2, .hard: 3, .veryHard: 4, .impossible: 5
    ]

    private static func heuristic(board: [Int], ai: CheckersPlayer) -> Double {
        var score: Double = 0
        let human = ai.other
        for i in 0..<64 {
            let cell = board[i]
            if cell == 0 { continue }
            guard let owner = ownerOf(cell) else { continue }
            let king = isKing(cell)
            let (row, col) = rowCol(i)
            let sign: Double = owner == ai ? 1 : -1
            score += sign * (king ? 3 : 1)
            if !king {
                let adv = Double(owner == .one ? (7 - row) : row)
                score += sign * adv * 0.05
            }
            let centerDist = abs(Double(col) - 3.5)
            score += sign * (3.5 - centerDist) * 0.05
        }
        let aiMoves = Double(validMoves(board: board, player: ai, enforceCapture: true).count)
        let humanMoves = Double(validMoves(board: board, player: human, enforceCapture: true).count)
        score += (aiMoves - humanMoves) * 0.1
        return score
    }

    private static func minimax(
        board: [Int], depth: Int, alpha: Double, beta: Double, maximizing: Bool,
        ai: CheckersPlayer, enforceCapture: Bool
    ) -> Double {
        let human = ai.other
        let currentPlayer = maximizing ? ai : human
        let moves = validMoves(board: board, player: currentPlayer, enforceCapture: enforceCapture)
        if moves.isEmpty {
            return maximizing ? -(10000.0 + Double(depth)) : (10000.0 + Double(depth))
        }
        if depth == 0 { return heuristic(board: board, ai: ai) }

        var a = alpha, b = beta
        if maximizing {
            var best = -Double.infinity
            for m in moves {
                let v = minimax(board: applyMove(board: board, move: m), depth: depth - 1,
                                alpha: a, beta: b, maximizing: false, ai: ai, enforceCapture: enforceCapture)
                best = max(best, v); a = max(a, best)
                if b <= a { break }
            }
            return best
        } else {
            var best = Double.infinity
            for m in moves {
                let v = minimax(board: applyMove(board: board, move: m), depth: depth - 1,
                                alpha: a, beta: b, maximizing: true, ai: ai, enforceCapture: enforceCapture)
                best = min(best, v); b = min(b, best)
                if b <= a { break }
            }
            return best
        }
    }

    static func bestMove(board: [Int], ai: CheckersPlayer, depth: Int, enforceCapture: Bool) -> CheckersMove? {
        let moves = validMoves(board: board, player: ai, enforceCapture: enforceCapture)
        guard let first = moves.first else { return nil }
        var bestVal = -Double.infinity
        var best = first
        for m in moves {
            let v = minimax(board: applyMove(board: board, move: m), depth: depth - 1,
                            alpha: -Double.infinity, beta: .infinity, maximizing: false,
                            ai: ai, enforceCapture: enforceCapture)
            if v > bestVal { bestVal = v; best = m }
        }
        return best
    }
}

enum CheckersDifficulty: String, CaseIterable, Sendable {
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
