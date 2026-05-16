import SwiftUI
import Observation

@Observable
@MainActor
final class TowerOfHanoiViewModel {
    enum Phase { case idle, playing, won }

    var phase: Phase = .idle
    var ringCount: Int = 3
    var pegs: [[Int]] = [[], [], []]
    var selectedPeg: Int? = nil
    var moves: Int = 0
    var errorPeg: Int? = nil

    private var errorClearTask: Task<Void, Never>?

    var optimal: Int { TowerOfHanoiConfig.optimalMoves(ringCount) }

    func startGame(rings: Int) {
        ringCount = rings
        pegs = TowerOfHanoiViewModel.initialPegs(rings: rings)
        moves = 0
        selectedPeg = nil
        errorPeg = nil
        errorClearTask?.cancel()
        phase = .playing
    }

    func restart() {
        startGame(rings: ringCount)
    }

    func goToTitle() {
        phase = .idle
        selectedPeg = nil
        errorPeg = nil
        errorClearTask?.cancel()
    }

    func tap(peg pegId: Int) {
        guard phase == .playing else { return }

        if selectedPeg == nil {
            if pegs[pegId].isEmpty { return }
            selectedPeg = pegId
            return
        }

        if selectedPeg == pegId {
            selectedPeg = nil
            return
        }

        guard let source = selectedPeg else { return }
        let ring = pegs[source].last!
        let topOfTarget = pegs[pegId].last ?? Int.max

        if ring < topOfTarget {
            pegs[source].removeLast()
            pegs[pegId].append(ring)
            moves += 1
            selectedPeg = nil
            if pegs[2].count == ringCount {
                phase = .won
            }
        } else {
            flashError(peg: pegId)
        }
    }

    private func flashError(peg: Int) {
        errorPeg = peg
        errorClearTask?.cancel()
        errorClearTask = Task { @MainActor [weak self] in
            try? await Task.sleep(nanoseconds: 400_000_000)
            if Task.isCancelled { return }
            if self?.errorPeg == peg { self?.errorPeg = nil }
        }
    }

    private static func initialPegs(rings: Int) -> [[Int]] {
        var first: [Int] = []
        for size in stride(from: rings, through: 1, by: -1) {
            first.append(size)
        }
        return [first, [], []]
    }
}
