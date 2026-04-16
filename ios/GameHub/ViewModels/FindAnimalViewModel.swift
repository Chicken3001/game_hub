import SwiftUI
import Observation

struct FindAnimal: Equatable, Hashable, Sendable {
    let emoji: String
    let name: String
}

@Observable
@MainActor
final class FindAnimalViewModel {
    enum Phase { case playing, correct, wrong, win }

    static let roundCount = 6
    static let choiceCount = 3

    static let allAnimals: [FindAnimal] = [
        .init(emoji: "🐶", name: "Dog"),
        .init(emoji: "🐱", name: "Cat"),
        .init(emoji: "🐭", name: "Mouse"),
        .init(emoji: "🐹", name: "Hamster"),
        .init(emoji: "🐰", name: "Bunny"),
        .init(emoji: "🦊", name: "Fox"),
        .init(emoji: "🐻", name: "Bear"),
        .init(emoji: "🐼", name: "Panda"),
        .init(emoji: "🐨", name: "Koala"),
        .init(emoji: "🐯", name: "Tiger"),
        .init(emoji: "🦁", name: "Lion"),
        .init(emoji: "🐮", name: "Cow"),
        .init(emoji: "🐷", name: "Pig"),
        .init(emoji: "🐸", name: "Frog"),
        .init(emoji: "🐧", name: "Penguin"),
        .init(emoji: "🐦", name: "Bird"),
        .init(emoji: "🦆", name: "Duck"),
        .init(emoji: "🐙", name: "Octopus"),
    ]

    var queue: [FindAnimal] = []
    var roundIdx: Int = 0
    var choices: [FindAnimal] = []
    var phase: Phase = .playing
    var wrongChoice: String? = nil
    var wrongShakeCount: Int = 0

    private var advanceTask: Task<Void, Never>?

    var target: FindAnimal? { queue.indices.contains(roundIdx) ? queue[roundIdx] : nil }

    init() { startGame() }

    func startGame() {
        advanceTask?.cancel(); advanceTask = nil
        let picked = Self.pickAnimals(count: Self.roundCount)
        queue = picked
        roundIdx = 0
        phase = .playing
        wrongChoice = nil
        choices = Self.makeChoices(target: picked[0], pool: Self.allAnimals)
    }

    func tapChoice(_ animal: FindAnimal) {
        guard phase == .playing, let target else { return }
        if animal.name == target.name {
            phase = .correct
            wrongChoice = nil
            advanceTask = Task { [weak self] in
                try? await Task.sleep(nanoseconds: 900_000_000)
                if Task.isCancelled { return }
                await MainActor.run {
                    guard let self else { return }
                    let next = self.roundIdx + 1
                    if next >= Self.roundCount {
                        self.phase = .win
                    } else {
                        self.roundIdx = next
                        self.choices = Self.makeChoices(target: self.queue[next], pool: Self.allAnimals)
                        self.phase = .playing
                    }
                }
            }
        } else {
            phase = .wrong
            wrongChoice = animal.name
            wrongShakeCount += 1
            advanceTask = Task { [weak self] in
                try? await Task.sleep(nanoseconds: 700_000_000)
                if Task.isCancelled { return }
                await MainActor.run {
                    guard let self else { return }
                    self.phase = .playing
                    self.wrongChoice = nil
                }
            }
        }
    }

    private static func pickAnimals(count: Int) -> [FindAnimal] {
        Array(allAnimals.shuffled().prefix(count))
    }

    private static func makeChoices(target: FindAnimal, pool: [FindAnimal]) -> [FindAnimal] {
        let distractors = pool.filter { $0.name != target.name }.shuffled().prefix(choiceCount - 1)
        return (Array(distractors) + [target]).shuffled()
    }
}
