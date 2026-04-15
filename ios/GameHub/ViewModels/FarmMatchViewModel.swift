import SwiftUI
import Observation

@Observable
@MainActor
final class FarmMatchViewModel {
    static let pairs = 6

    var deck: [String] = []
    var flipped: Set<Int> = []
    var matched: Set<Int> = []
    var isChecking: Bool = false
    var showWinCard: Bool = false

    init() { deck = Self.createDeck() }

    var allMatched: Bool { !deck.isEmpty && matched.count == deck.count }
    var pairsFound: Int { matched.count / 2 }
    var totalPairs: Int { deck.count / 2 }

    func tap(_ index: Int) {
        guard !flipped.contains(index),
              !matched.contains(index),
              !isChecking,
              flipped.count < 2 else { return }

        flipped.insert(index)

        if flipped.count == 2 {
            isChecking = true
            let pair = Array(flipped)
            let isMatch = deck[pair[0]] == deck[pair[1]]
            if isMatch {
                matched.formUnion(pair)
                flipped.removeAll()
                isChecking = false
                if allMatched {
                    Task { @MainActor in
                        try? await Task.sleep(nanoseconds: 700_000_000)
                        self.showWinCard = true
                    }
                }
            } else {
                Task { @MainActor in
                    try? await Task.sleep(nanoseconds: 900_000_000)
                    self.flipped.removeAll()
                    self.isChecking = false
                }
            }
        }
    }

    func reset() {
        deck = Self.createDeck()
        flipped.removeAll()
        matched.removeAll()
        isChecking = false
        showWinCard = false
    }

    private static func createDeck() -> [String] {
        let picked = FarmMatch.animals.shuffled().prefix(pairs).map { $0.emoji }
        return (picked + picked).shuffled()
    }
}
