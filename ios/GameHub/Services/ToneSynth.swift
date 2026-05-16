import AVFoundation
import Foundation

@MainActor
final class ToneSynth {
    private let engine = AVAudioEngine()
    private let player = AVAudioPlayerNode()
    private let sampleRate: Double = 44100
    private let format: AVAudioFormat
    private var toneCache: [Int: AVAudioPCMBuffer] = [:]
    private var started = false

    init() {
        self.format = AVAudioFormat(standardFormatWithSampleRate: sampleRate, channels: 1)!
        engine.attach(player)
        engine.connect(player, to: engine.mainMixerNode, format: format)
    }

    func ensureStarted() {
        guard !started else { return }
        do {
            try AVAudioSession.sharedInstance().setCategory(.ambient, mode: .default, options: [.mixWithOthers])
            try AVAudioSession.sharedInstance().setActive(true, options: [])
            try engine.start()
            player.play()
            started = true
        } catch {
            started = false
        }
    }

    func play(frequency: Double, duration: Double = 0.32) {
        ensureStarted()
        guard started else { return }
        let key = cacheKey(frequency: frequency, duration: duration)
        let buffer: AVAudioPCMBuffer
        if let cached = toneCache[key] {
            buffer = cached
        } else {
            buffer = renderTone(frequency: frequency, duration: duration)
            toneCache[key] = buffer
        }
        player.scheduleBuffer(buffer, at: nil, options: [], completionHandler: nil)
    }

    func playSweep(from startFreq: Double, to endFreq: Double, duration: Double = 0.45) {
        ensureStarted()
        guard started else { return }
        let buffer = renderSweep(from: startFreq, to: endFreq, duration: duration)
        player.scheduleBuffer(buffer, at: nil, options: [], completionHandler: nil)
    }

    private func cacheKey(frequency: Double, duration: Double) -> Int {
        Int(frequency * 100) &* 1000 &+ Int(duration * 1000)
    }

    private func renderTone(frequency: Double, duration: Double) -> AVAudioPCMBuffer {
        let frameCount = AVAudioFrameCount(sampleRate * duration)
        let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frameCount)!
        buffer.frameLength = frameCount
        guard let data = buffer.floatChannelData?[0] else { return buffer }
        let attack = sampleRate * 0.015
        let release = sampleRate * 0.08
        let peak: Float = 0.18
        let totalFrames = Double(frameCount)
        for i in 0..<Int(frameCount) {
            let t = Double(i) / sampleRate
            let sine = sin(2.0 * .pi * frequency * t)
            var env: Float = peak
            let frame = Double(i)
            if frame < attack {
                env *= Float(frame / attack)
            } else if frame > totalFrames - release {
                env *= Float((totalFrames - frame) / release)
            }
            data[i] = Float(sine) * env
        }
        return buffer
    }

    private func renderSweep(from startFreq: Double, to endFreq: Double, duration: Double) -> AVAudioPCMBuffer {
        let frameCount = AVAudioFrameCount(sampleRate * duration)
        let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frameCount)!
        buffer.frameLength = frameCount
        guard let data = buffer.floatChannelData?[0] else { return buffer }
        let logStart = log(startFreq)
        let logEnd = log(endFreq)
        var phase: Double = 0
        let peak: Float = 0.14
        let attack = sampleRate * 0.02
        let release = sampleRate * 0.05
        let totalFrames = Double(frameCount)
        for i in 0..<Int(frameCount) {
            let progress = Double(i) / max(totalFrames, 1)
            let freq = exp(logStart + (logEnd - logStart) * progress)
            phase += 2.0 * .pi * freq / sampleRate
            var env: Float = peak
            let frame = Double(i)
            if frame < attack {
                env *= Float(frame / attack)
            } else if frame > totalFrames - release {
                env *= Float((totalFrames - frame) / release)
            }
            data[i] = Float(sin(phase)) * env
        }
        return buffer
    }
}
