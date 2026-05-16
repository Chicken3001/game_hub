import SwiftUI
import Observation

@Observable
@MainActor
final class CopyPatternViewModel {
    enum Phase { case idle, watch, input, mistake, won }

    enum Difficulty: String, CaseIterable, Identifiable {
        case easy, medium, hard
        var id: String { rawValue }
        var label: String {
            switch self {
            case .easy: return "Easy"
            case .medium: return "Medium"
            case .hard: return "Hard"
            }
        }
        var targetLength: Int {
            switch self {
            case .easy: return 3
            case .medium: return 5
            case .hard: return 7
            }
        }
    }

    var phase: Phase = .idle
    var difficulty: Difficulty = .easy
    var sequence: [Int] = []
    var userIndex: Int = 0
    var litPad: Int? = nil
    var soundOn: Bool {
        didSet { UserDefaults.standard.set(soundOn, forKey: Self.soundKey) }
    }

    private static let soundKey = "copyPattern.soundOn"
    private let synth = ToneSynth()
    private var tasks: [Task<Void, Never>] = []

    init() {
        let defaults = UserDefaults.standard
        if defaults.object(forKey: Self.soundKey) != nil {
            self.soundOn = defaults.bool(forKey: Self.soundKey)
        } else {
            self.soundOn = true
        }
    }

    var targetLength: Int { difficulty.targetLength }

    func startGame(_ diff: Difficulty) {
        cancelTasks()
        difficulty = diff
        sequence = [Int.random(in: 0..<CopyPatternConfig.pads.count)]
        userIndex = 0
        litPad = nil
        phase = .watch
        synth.ensureStarted()
        playSequence()
    }

    func goToTitle() {
        cancelTasks()
        sequence = []
        userIndex = 0
        litPad = nil
        phase = .idle
    }

    func tap(_ padId: Int) {
        guard phase == .input else { return }
        let expected = sequence[userIndex]
        flashPad(padId)

        if padId != expected {
            phase = .mistake
            playSadTone()
            schedule(after: CopyPatternConfig.mistakeDelay) { [weak self] in
                guard let self else { return }
                self.userIndex = 0
                self.phase = .watch
                self.playSequence()
            }
            return
        }

        userIndex += 1
        if userIndex == sequence.count {
            if sequence.count >= difficulty.targetLength {
                schedule(after: CopyPatternConfig.nextRoundDelay) { [weak self] in
                    guard let self else { return }
                    self.playWinChime()
                    self.phase = .won
                }
            } else {
                schedule(after: CopyPatternConfig.nextRoundDelay) { [weak self] in
                    guard let self else { return }
                    self.sequence.append(Int.random(in: 0..<CopyPatternConfig.pads.count))
                    self.phase = .watch
                    self.playSequence()
                }
            }
        }
    }

    private func playSequence() {
        let seq = sequence
        let start = CopyPatternConfig.startDelay
        let lit = CopyPatternConfig.padLitDuration
        let gap = CopyPatternConfig.padGap

        for (idx, padId) in seq.enumerated() {
            let onAt = start + Double(idx) * (lit + gap)
            schedule(after: onAt) { [weak self] in
                self?.litPad = padId
                self?.playPadTone(padId)
            }
            schedule(after: onAt + lit) { [weak self] in
                if self?.litPad == padId { self?.litPad = nil }
            }
        }
        schedule(after: start + Double(seq.count) * (lit + gap)) { [weak self] in
            guard let self else { return }
            self.userIndex = 0
            self.litPad = nil
            self.phase = .input
        }
    }

    private func flashPad(_ padId: Int) {
        litPad = padId
        playPadTone(padId)
        schedule(after: CopyPatternConfig.padLitDuration) { [weak self] in
            if self?.litPad == padId { self?.litPad = nil }
        }
    }

    private func playPadTone(_ padId: Int) {
        guard soundOn else { return }
        synth.play(frequency: CopyPatternConfig.pads[padId].frequency)
    }

    private func playSadTone() {
        guard soundOn else { return }
        synth.playSweep(from: 330, to: 165, duration: 0.45)
    }

    private func playWinChime() {
        guard soundOn else { return }
        let notes: [Double] = [523.25, 659.25, 783.99, 1046.5]
        for (i, note) in notes.enumerated() {
            schedule(after: Double(i) * 0.13) { [weak self] in
                self?.synth.play(frequency: note, duration: 0.35)
            }
        }
    }

    private func schedule(after seconds: Double, _ work: @escaping @MainActor () -> Void) {
        let task = Task { @MainActor in
            try? await Task.sleep(nanoseconds: UInt64(seconds * 1_000_000_000))
            if Task.isCancelled { return }
            work()
        }
        tasks.append(task)
    }

    private func cancelTasks() {
        tasks.forEach { $0.cancel() }
        tasks.removeAll()
    }
}
