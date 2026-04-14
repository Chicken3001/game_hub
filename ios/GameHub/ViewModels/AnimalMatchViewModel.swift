import SwiftUI
import Observation

enum CardSide: Hashable {
    case left, right
}

struct CardRef: Hashable {
    let side: CardSide
    let index: Int
}

struct MatchedPair: Identifiable, Hashable {
    let id = UUID()
    let leftIdx: Int
    let rightIdx: Int
    let colorIndex: Int

    var color: Color { PairPalette.at(colorIndex) }
}

@MainActor
@Observable
final class AnimalMatchViewModel {
    let set: AnimalSet

    private(set) var leftCards: [Animal] = []
    private(set) var rightCards: [Animal] = []
    private(set) var matched: [MatchedPair] = []
    private(set) var tries: Int = 0
    private(set) var isWon: Bool = false

    var selected: CardRef?
    var wrongPair: (CardRef, CardRef)?

    init(set: AnimalSet) {
        self.set = set
        reset()
    }

    var pairCount: Int { self.set.animals.count }

    func reset() {
        leftCards = set.animals.shuffled()
        rightCards = set.animals.shuffled()
        matched = []
        tries = 0
        isWon = false
        selected = nil
        wrongPair = nil
    }

    func isMatched(_ ref: CardRef) -> Bool {
        matched.contains { m in
            (ref.side == .left && m.leftIdx == ref.index) ||
            (ref.side == .right && m.rightIdx == ref.index)
        }
    }

    func matchedColor(for ref: CardRef) -> Color? {
        guard let m = matched.first(where: { m in
            (ref.side == .left && m.leftIdx == ref.index) ||
            (ref.side == .right && m.rightIdx == ref.index)
        }) else { return nil }
        return m.color
    }

    func isWrong(_ ref: CardRef) -> Bool {
        guard let wp = wrongPair else { return false }
        return wp.0 == ref || wp.1 == ref
    }

    func handleTap(_ ref: CardRef) {
        if isMatched(ref) { return }

        guard let sel = selected else {
            selected = ref
            return
        }

        if sel == ref {
            selected = nil
            return
        }

        tries += 1
        attemptMatch(first: sel, second: ref)
        selected = nil
    }

    /// Called when a drag ends on a different card.
    func handleDragEnd(from first: CardRef, to second: CardRef) {
        if first == second { return }
        if isMatched(first) || isMatched(second) { return }
        tries += 1
        attemptMatch(first: first, second: second)
        selected = nil
    }

    private func attemptMatch(first: CardRef, second: CardRef) {
        let firstAnimal = animal(for: first)
        let secondAnimal = animal(for: second)
        let isMatch = first.side != second.side && firstAnimal.name == secondAnimal.name
        if !isMatch {
            wrongPair = (first, second)
            Task { @MainActor in
                try? await Task.sleep(for: .milliseconds(600))
                self.wrongPair = nil
            }
            return
        }
        let leftIdx = first.side == .left ? first.index : second.index
        let rightIdx = first.side == .right ? first.index : second.index
        let pair = MatchedPair(leftIdx: leftIdx, rightIdx: rightIdx, colorIndex: matched.count)
        matched.append(pair)
        if matched.count == pairCount {
            Task { @MainActor in
                try? await Task.sleep(for: .milliseconds(500))
                self.isWon = true
            }
        }
    }

    func animal(for ref: CardRef) -> Animal {
        ref.side == .left ? leftCards[ref.index] : rightCards[ref.index]
    }
}
