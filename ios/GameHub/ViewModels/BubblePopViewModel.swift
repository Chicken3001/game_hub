import SwiftUI
import Observation

@Observable
@MainActor
final class BubblePopViewModel {
    enum Phase { case idle, playing, over }

    var phase: Phase = .idle
    var score: Int = 0
    var timeLeft: Int = BubbleConfig.gameDuration
    var bubbles: [Bubble] = []
    var bursts: [Burst] = []

    private var nextId: Int = 1
    private var spawnTask: Task<Void, Never>?
    private var countdownTask: Task<Void, Never>?
    private var cullTask: Task<Void, Never>?

    func start() {
        cancelTasks()
        bubbles = []
        bursts = []
        score = 0
        timeLeft = BubbleConfig.gameDuration
        phase = .playing

        spawn()
        spawnTask = Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: UInt64(BubbleConfig.spawnInterval * 1_000_000_000))
                if Task.isCancelled { return }
                await MainActor.run { self?.spawn() }
            }
        }

        countdownTask = Task { [weak self] in
            for _ in 0..<BubbleConfig.gameDuration {
                try? await Task.sleep(nanoseconds: 1_000_000_000)
                if Task.isCancelled { return }
                await MainActor.run {
                    guard let self else { return }
                    self.timeLeft -= 1
                    if self.timeLeft <= 0 {
                        self.endGame()
                    }
                }
            }
        }

        cullTask = Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 500_000_000)
                if Task.isCancelled { return }
                await MainActor.run {
                    guard let self else { return }
                    let now = Date()
                    self.bubbles.removeAll { now.timeIntervalSince($0.spawnedAt) > $0.duration + 0.5 }
                }
            }
        }
    }

    func pop(_ bubble: Bubble, at point: CGPoint) {
        guard phase == .playing else { return }
        bubbles.removeAll { $0.id == bubble.id }
        score += 1

        let burstId = nextId
        nextId += 1
        let burst = Burst(id: burstId, x: point.x, y: point.y, emoji: bubble.emoji)
        bursts.append(burst)

        Task { [weak self] in
            try? await Task.sleep(nanoseconds: 500_000_000)
            await MainActor.run { self?.bursts.removeAll { $0.id == burstId } }
        }
    }

    func reset() {
        cancelTasks()
        phase = .idle
        bubbles = []
        bursts = []
        score = 0
        timeLeft = BubbleConfig.gameDuration
    }

    private func endGame() {
        cancelTasks()
        bubbles = []
        phase = .over
    }

    private func spawn() {
        let id = nextId
        nextId += 1
        let bubble = Bubble(
            id: id,
            emoji: BubbleConfig.emojis.randomElement()!,
            color: BubbleConfig.colors.randomElement()!,
            size: CGFloat(Int.random(in: 60...90)),
            leftFraction: CGFloat.random(in: 0.05...0.85),
            duration: Double.random(in: BubbleConfig.speedMin...BubbleConfig.speedMax),
            spawnedAt: Date()
        )
        bubbles.append(bubble)
    }

    private func cancelTasks() {
        spawnTask?.cancel(); spawnTask = nil
        countdownTask?.cancel(); countdownTask = nil
        cullTask?.cancel(); cullTask = nil
    }
}
