import SwiftUI

struct BubblePopGameView: View {
    @State private var viewModel = BubblePopViewModel()

    var body: some View {
        ZStack {
            Color.hubBackground.ignoresSafeArea()

            switch viewModel.phase {
            case .idle:
                idleView
            case .playing:
                playingView
            case .over:
                gameOverView
            }
        }
        .navigationTitle("Bubble Pop")
        .navigationBarTitleDisplayMode(.inline)
    }

    private var idleView: some View {
        VStack(spacing: 24) {
            Text("🫧")
                .font(.system(size: 96))
            VStack(spacing: 6) {
                Text("Bubble Pop!")
                    .font(.system(size: 28, weight: .black))
                    .foregroundStyle(Color.hubInk)
                Text("Pop as many bubbles as you can in \(BubbleConfig.gameDuration) seconds!")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Color.hubAccent)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 24)
            }
            Button {
                viewModel.start()
            } label: {
                Text("Start! 🚀")
                    .font(.title3.bold())
                    .padding(.horizontal, 32)
                    .padding(.vertical, 14)
                    .background(Color.hubAccent)
                    .foregroundStyle(.white)
                    .clipShape(Capsule())
                    .shadow(color: Color.hubAccent.opacity(0.4), radius: 10, y: 4)
            }
        }
        .padding(32)
    }

    private var gameOverView: some View {
        VStack(spacing: 16) {
            Text("🫧")
                .font(.system(size: 96))
            Text("Time's up!")
                .font(.system(size: 32, weight: .black))
                .foregroundStyle(Color.hubInk)
            Text("You popped \(viewModel.score) bubbles!")
                .font(.title3.bold())
                .foregroundStyle(Color.hubAccent)
            Text(praise(for: viewModel.score))
                .font(.headline)
                .foregroundStyle(Color.hubEmerald)
            Button {
                viewModel.start()
            } label: {
                Text("Play again! 🔄")
                    .font(.title3.bold())
                    .padding(.horizontal, 32)
                    .padding(.vertical, 14)
                    .background(Color.hubAccent)
                    .foregroundStyle(.white)
                    .clipShape(Capsule())
                    .shadow(color: Color.hubAccent.opacity(0.4), radius: 10, y: 4)
            }
            .padding(.top, 8)
        }
        .padding(32)
    }

    private var playingView: some View {
        VStack(spacing: 12) {
            statsBar
            gameArea
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }

    private var statsBar: some View {
        HStack {
            Text("🫧 \(viewModel.score) popped")
                .font(.headline)
                .foregroundStyle(Color.hubInk)
            Spacer()
            HStack(spacing: 8) {
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        Capsule()
                            .fill(Color.hubAccent.opacity(0.2))
                        Capsule()
                            .fill(Color.hubAccent)
                            .frame(width: geo.size.width * progress)
                    }
                }
                .frame(width: 80, height: 8)
                Text("\(viewModel.timeLeft)s")
                    .font(.headline)
                    .foregroundStyle(Color.hubAccent)
                    .monospacedDigit()
                    .frame(minWidth: 34, alignment: .trailing)
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .background(Color.hubCardBg)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color.hubCardBorder, lineWidth: 1.5)
        )
    }

    private var progress: CGFloat {
        CGFloat(viewModel.timeLeft) / CGFloat(BubbleConfig.gameDuration)
    }

    private var gameArea: some View {
        GeometryReader { geo in
            ZStack {
                LinearGradient(
                    colors: [Color(hex: "#dbeafe"), Color(hex: "#eff6ff")],
                    startPoint: .top,
                    endPoint: .bottom
                )

                TimelineView(.animation(minimumInterval: 1.0 / 60.0)) { context in
                    let now = context.date
                    ZStack {
                        ForEach(viewModel.bubbles) { bubble in
                            let elapsed = now.timeIntervalSince(bubble.spawnedAt)
                            let t = elapsed / bubble.duration
                            let travel = geo.size.height + bubble.size
                            let y = -bubble.size / 2 + CGFloat(t) * travel
                            let x = geo.size.width * bubble.leftFraction + bubble.size / 2

                            BubbleCircle(bubble: bubble)
                                .position(x: x, y: y)
                                .onTapGesture {
                                    viewModel.pop(bubble, at: CGPoint(x: x, y: y))
                                }
                        }

                        ForEach(viewModel.bursts) { burst in
                            BurstView(burst: burst)
                        }
                    }
                }

                if viewModel.bubbles.isEmpty {
                    Text("Bubbles coming… 🫧")
                        .font(.headline)
                        .foregroundStyle(Color.hubAccent.opacity(0.7))
                }
            }
            .clipShape(RoundedRectangle(cornerRadius: 24))
            .overlay(
                RoundedRectangle(cornerRadius: 24)
                    .stroke(Color.hubCardBorder, lineWidth: 2)
            )
        }
    }

    private func praise(for score: Int) -> String {
        if score >= 15 { return "Amazing! 🌟" }
        if score >= 8 { return "Great job! 🎉" }
        return "Keep trying! 💪"
    }
}

private struct BubbleCircle: View {
    let bubble: Bubble

    var body: some View {
        ZStack {
            Circle()
                .fill(bubble.color)
                .overlay(
                    Circle().stroke(Color.white.opacity(0.6), lineWidth: 2)
                )
                .shadow(color: Color.black.opacity(0.15), radius: 6, y: 2)
            Text(bubble.emoji)
                .font(.system(size: bubble.size * 0.5))
        }
        .frame(width: bubble.size, height: bubble.size)
        .contentShape(Circle())
    }
}

private struct BurstView: View {
    let burst: Burst
    @State private var scale: CGFloat = 1
    @State private var opacity: Double = 1

    var body: some View {
        Text(burst.emoji)
            .font(.system(size: 48))
            .scaleEffect(scale)
            .opacity(opacity)
            .position(x: burst.x, y: burst.y)
            .allowsHitTesting(false)
            .onAppear {
                withAnimation(.easeOut(duration: 0.5)) {
                    scale = 2
                    opacity = 0
                }
            }
    }
}
