import SwiftUI

struct CopyPatternView: View {
    @State private var viewModel = CopyPatternViewModel()

    var body: some View {
        ZStack {
            Color.hubBackground.ignoresSafeArea()

            switch viewModel.phase {
            case .idle:
                idleView
            case .watch, .input, .mistake:
                playingView
            case .won:
                wonView
            }
        }
        .navigationTitle("Copy the Pattern")
        .navigationBarTitleDisplayMode(.inline)
    }

    // MARK: - Idle / Title

    private var idleView: some View {
        VStack(spacing: 18) {
            Text("🎵")
                .font(.system(size: 72))

            VStack(spacing: 4) {
                Text("Copy the Pattern!")
                    .font(.system(size: 26, weight: .black))
                    .foregroundStyle(Color.hubInk)
                Text("Watch which animals light up,\nthen tap them in the same order.")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Color.hubAccent)
                    .multilineTextAlignment(.center)
            }

            LazyVGrid(
                columns: [
                    GridItem(.fixed(56), spacing: 8),
                    GridItem(.fixed(56), spacing: 8),
                ],
                spacing: 8
            ) {
                ForEach(CopyPatternConfig.pads) { pad in
                    ZStack {
                        RoundedRectangle(cornerRadius: 14)
                            .fill(pad.baseColor)
                            .frame(width: 56, height: 56)
                            .shadow(color: Color.black.opacity(0.1), radius: 4, y: 2)
                        Text(pad.emoji).font(.system(size: 30))
                    }
                }
            }

            VStack(spacing: 8) {
                Text("Pick a level:")
                    .font(.subheadline.bold())
                    .foregroundStyle(Color.hubAccent)
                HStack(spacing: 10) {
                    ForEach(CopyPatternViewModel.Difficulty.allCases) { diff in
                        difficultyButton(diff)
                    }
                }
            }
            .padding(.top, 4)

            Button {
                viewModel.soundOn.toggle()
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: viewModel.soundOn ? "speaker.wave.2.fill" : "speaker.slash.fill")
                    Text("Sound \(viewModel.soundOn ? "on" : "off")")
                        .font(.subheadline.bold())
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(Color.hubCardBg)
                .foregroundStyle(Color.hubAccent)
                .clipShape(Capsule())
                .overlay(Capsule().stroke(Color.hubCardBorder, lineWidth: 1.5))
            }
            .buttonStyle(.plain)
        }
        .padding(24)
    }

    private func difficultyButton(_ diff: CopyPatternViewModel.Difficulty) -> some View {
        Button {
            viewModel.startGame(diff)
        } label: {
            VStack(spacing: 2) {
                Text(diff.label)
                    .font(.subheadline.bold())
                    .foregroundStyle(Color.hubInk)
                Text("\(diff.targetLength) steps")
                    .font(.caption2)
                    .foregroundStyle(Color.hubAccent)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .background(Color.hubCardBg)
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(Color.hubCardBorder, lineWidth: 2)
            )
        }
        .buttonStyle(.plain)
    }

    // MARK: - Active gameplay

    private var playingView: some View {
        VStack(spacing: 12) {
            statusBar
            padGrid
            Button {
                viewModel.goToTitle()
            } label: {
                Text("Change difficulty")
                    .font(.subheadline.bold())
                    .foregroundStyle(Color.hubAccent)
            }
            .buttonStyle(.plain)
        }
        .padding(16)
    }

    private var statusBar: some View {
        HStack(spacing: 12) {
            Text(statusText)
                .font(.headline.bold())
                .foregroundStyle(statusColor)
            Spacer()
            Text("\(viewModel.sequence.count) / \(viewModel.targetLength)")
                .font(.subheadline.bold())
                .foregroundStyle(Color.hubInk)
                .monospacedDigit()
            Button {
                viewModel.soundOn.toggle()
            } label: {
                Image(systemName: viewModel.soundOn ? "speaker.wave.2.fill" : "speaker.slash.fill")
                    .foregroundStyle(Color.hubAccent)
                    .frame(width: 32, height: 32)
                    .background(Color.hubAccent.opacity(0.15))
                    .clipShape(Circle())
            }
            .buttonStyle(.plain)
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

    private var statusText: String {
        switch viewModel.phase {
        case .watch: return "👀 Watch!"
        case .input: return "👆 Your turn!"
        case .mistake: return "💪 Try again!"
        default: return ""
        }
    }

    private var statusColor: Color {
        switch viewModel.phase {
        case .mistake: return Color.hubRose
        case .input: return Color.hubEmerald
        default: return Color.hubAccent
        }
    }

    private var padGrid: some View {
        LazyVGrid(
            columns: [
                GridItem(.flexible(), spacing: 12),
                GridItem(.flexible(), spacing: 12),
            ],
            spacing: 12
        ) {
            ForEach(CopyPatternConfig.pads) { pad in
                padButton(for: pad)
            }
        }
        .padding(12)
        .background(Color.hubCardBg.opacity(0.6))
        .clipShape(RoundedRectangle(cornerRadius: 24))
        .overlay(
            RoundedRectangle(cornerRadius: 24)
                .stroke(Color.hubCardBorder, lineWidth: 2)
        )
        .modifier(ShakeIfMistake(active: viewModel.phase == .mistake))
    }

    private func padButton(for pad: CopyPad) -> some View {
        let isLit = viewModel.litPad == pad.id
        let disabled = viewModel.phase != .input
        return Button {
            viewModel.tap(pad.id)
        } label: {
            ZStack {
                RoundedRectangle(cornerRadius: 24)
                    .fill(isLit ? pad.litColor : pad.baseColor)
                    .overlay(
                        RoundedRectangle(cornerRadius: 24)
                            .stroke(Color.white.opacity(0.6), lineWidth: 4)
                    )
                    .shadow(
                        color: isLit ? Color.white.opacity(0.9) : Color.black.opacity(0.15),
                        radius: isLit ? 14 : 6,
                        y: isLit ? 0 : 4
                    )
                Text(pad.emoji)
                    .font(.system(size: 60))
                    .scaleEffect(isLit ? 1.15 : 1)
            }
            .aspectRatio(1, contentMode: .fit)
            .scaleEffect(isLit ? 1.05 : 1)
            .animation(.easeInOut(duration: 0.12), value: isLit)
        }
        .buttonStyle(.plain)
        .disabled(disabled)
        .allowsHitTesting(!disabled)
    }

    // MARK: - Won

    private var wonView: some View {
        VStack(spacing: 16) {
            Text("🎉").font(.system(size: 96))
            Text("You did it!")
                .font(.system(size: 32, weight: .black))
                .foregroundStyle(Color.hubInk)
            Text("You copied a \(viewModel.targetLength)-step pattern!")
                .font(.title3.bold())
                .foregroundStyle(Color.hubAccent)
                .multilineTextAlignment(.center)

            Button {
                viewModel.startGame(viewModel.difficulty)
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
            .buttonStyle(.plain)

            Button {
                viewModel.goToTitle()
            } label: {
                Text("Change difficulty")
                    .font(.subheadline.bold())
                    .foregroundStyle(Color.hubAccent)
            }
            .buttonStyle(.plain)
            .padding(.top, 4)
        }
        .padding(32)
    }
}

private struct ShakeIfMistake: ViewModifier {
    let active: Bool
    @State private var offset: CGFloat = 0

    func body(content: Content) -> some View {
        content
            .offset(x: offset)
            .onChange(of: active) { _, newValue in
                guard newValue else { return }
                let sequence: [CGFloat] = [-10, 10, -7, 7, 0]
                for (i, step) in sequence.enumerated() {
                    DispatchQueue.main.asyncAfter(deadline: .now() + Double(i) * 0.08) {
                        withAnimation(.easeInOut(duration: 0.08)) {
                            offset = step
                        }
                    }
                }
            }
    }
}
