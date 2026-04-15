import SwiftUI
import Observation

@Observable
@MainActor
final class ShapeSorterViewModel {
    static let totalShapes = 10

    var queue: [ShapeKind] = []
    var index: Int = 0
    var shaking: Bool = false
    var flashBin: ShapeKind? = nil
    var gameWon: Bool = false

    init() { queue = Self.makeQueue() }

    var currentShape: ShapeKind? { index < queue.count ? queue[index] : nil }
    var isBusy: Bool { shaking || flashBin != nil }

    func handleDrop(on bin: ShapeKind) {
        guard !isBusy, let current = currentShape else { return }
        if bin == current { handleCorrect(bin) }
        else { handleWrong() }
    }

    func handleMiss() {
        guard !isBusy, currentShape != nil else { return }
        handleWrong()
    }

    private func handleCorrect(_ shape: ShapeKind) {
        flashBin = shape
        Task { @MainActor in
            try? await Task.sleep(nanoseconds: 900_000_000)
            self.flashBin = nil
            let next = self.index + 1
            if next >= Self.totalShapes {
                self.gameWon = true
            } else {
                self.index = next
            }
        }
    }

    private func handleWrong() {
        shaking = true
        Task { @MainActor in
            try? await Task.sleep(nanoseconds: 900_000_000)
            self.shaking = false
        }
    }

    func reset() {
        queue = Self.makeQueue()
        index = 0
        shaking = false
        flashBin = nil
        gameWon = false
    }

    private static func makeQueue() -> [ShapeKind] {
        var pool = ShapeKind.allCases + ShapeKind.allCases
        pool.append(ShapeKind.allCases.randomElement()!)
        pool.append(ShapeKind.allCases.randomElement()!)
        return pool.shuffled()
    }
}
