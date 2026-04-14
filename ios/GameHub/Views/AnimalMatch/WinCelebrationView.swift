import SwiftUI

struct WinCelebrationView: View {
    let tries: Int
    let onPlayAgain: () -> Void

    private let confettiEmojis = ["🎉", "🎊", "⭐️", "🌟", "✨", "🎈"]

    var body: some View {
        ZStack {
            Color.black.opacity(0.25).ignoresSafeArea()

            GeometryReader { geo in
                ConfettiLayer(size: geo.size, emojis: confettiEmojis)
            }
            .allowsHitTesting(false)

            VStack(spacing: 12) {
                Text("🎉")
                    .font(.system(size: 72))
                Text("Amazing!")
                    .font(.system(size: 30, weight: .black))
                    .foregroundStyle(Color.hubEmerald)
                Text("You matched them all in \(tries) \(tries == 1 ? "try" : "tries")!")
                    .font(.headline)
                    .foregroundStyle(Color.hubInk)
                    .multilineTextAlignment(.center)

                Button {
                    onPlayAgain()
                } label: {
                    Text("Play again! 🔄")
                        .font(.headline)
                        .padding(.horizontal, 28)
                        .padding(.vertical, 14)
                        .background(
                            LinearGradient(
                                colors: [.hubAccent, .hubIndigo],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .foregroundStyle(.white)
                        .clipShape(Capsule())
                        .shadow(color: Color.hubAccent.opacity(0.3), radius: 10)
                }
                .padding(.top, 6)
            }
            .padding(28)
            .background(Color.hubCardBg)
            .clipShape(RoundedRectangle(cornerRadius: 28))
            .overlay(
                RoundedRectangle(cornerRadius: 28)
                    .stroke(Color.hubEmerald.opacity(0.4), lineWidth: 2)
            )
            .shadow(color: Color.hubEmerald.opacity(0.3), radius: 20)
            .padding(.horizontal, 36)
        }
    }
}

private struct ConfettiLayer: View {
    let size: CGSize
    let emojis: [String]

    @State private var particles: [Particle] = []

    private struct Particle: Identifiable {
        let id = UUID()
        let emoji: String
        let x: CGFloat
        let delay: Double
        let duration: Double
        let rotation: Double
    }

    var body: some View {
        ZStack {
            ForEach(particles) { p in
                ConfettiPiece(
                    emoji: p.emoji,
                    startX: p.x,
                    height: size.height,
                    delay: p.delay,
                    duration: p.duration,
                    rotation: p.rotation
                )
            }
        }
        .onAppear {
            particles = (0..<28).map { _ in
                Particle(
                    emoji: emojis.randomElement() ?? "🎉",
                    x: CGFloat.random(in: 0...size.width),
                    delay: Double.random(in: 0...1.2),
                    duration: Double.random(in: 2.4...3.6),
                    rotation: Double.random(in: -180...180)
                )
            }
        }
    }
}

private struct ConfettiPiece: View {
    let emoji: String
    let startX: CGFloat
    let height: CGFloat
    let delay: Double
    let duration: Double
    let rotation: Double

    @State private var animate = false

    var body: some View {
        Text(emoji)
            .font(.system(size: 28))
            .position(x: startX, y: animate ? height + 40 : -40)
            .rotationEffect(.degrees(animate ? rotation : 0))
            .onAppear {
                withAnimation(.easeIn(duration: duration).delay(delay).repeatForever(autoreverses: false)) {
                    animate = true
                }
            }
    }
}
