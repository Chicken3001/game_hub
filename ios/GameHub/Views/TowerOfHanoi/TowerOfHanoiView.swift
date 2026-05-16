import SwiftUI

struct TowerOfHanoiView: View {
    @State private var viewModel = TowerOfHanoiViewModel()

    var body: some View {
        ZStack {
            Color.hubBackground.ignoresSafeArea()

            switch viewModel.phase {
            case .idle:
                idleView
            case .playing:
                playingView
            case .won:
                wonView
            }
        }
        .navigationTitle("Tower of Hanoi")
        .navigationBarTitleDisplayMode(.inline)
    }

    // MARK: - Title

    private var idleView: some View {
        let sizes = Array(TowerOfHanoiConfig.minRings...TowerOfHanoiConfig.maxRings)
        return VStack(spacing: 18) {
            Text("🗼")
                .font(.system(size: 72))
            VStack(spacing: 4) {
                Text("Tower of Hanoi")
                    .font(.system(size: 26, weight: .black))
                    .foregroundStyle(Color.hubInk)
                Text("Move all the rings to the right peg.\nNever put a big ring on a small one!")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Color.hubAccent)
                    .multilineTextAlignment(.center)
            }

            VStack(spacing: 8) {
                Text("Pick your puzzle size:")
                    .font(.subheadline.bold())
                    .foregroundStyle(Color.hubAccent)
                LazyVGrid(
                    columns: Array(repeating: GridItem(.flexible(), spacing: 10), count: 3),
                    spacing: 10
                ) {
                    ForEach(sizes, id: \.self) { n in
                        sizeButton(n)
                    }
                }
            }
        }
        .padding(24)
    }

    private func sizeButton(_ n: Int) -> some View {
        let label: String? = {
            if n == TowerOfHanoiConfig.minRings { return "Easiest" }
            if n == TowerOfHanoiConfig.maxRings { return "Hardest" }
            return nil
        }()
        return Button {
            viewModel.startGame(rings: n)
        } label: {
            VStack(spacing: 2) {
                Text("\(n)")
                    .font(.title2.bold())
                    .foregroundStyle(Color.hubInk)
                Text("rings")
                    .font(.caption2)
                    .foregroundStyle(Color.hubAccent)
                Text("\(TowerOfHanoiConfig.optimalMoves(n)) moves")
                    .font(.caption2.bold())
                    .foregroundStyle(Color.hubAccent)
                if let label {
                    Text(label)
                        .font(.system(size: 10, weight: .black))
                        .foregroundStyle(Color.hubAmber)
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 10)
            .background(Color.hubCardBg)
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(Color.hubCardBorder, lineWidth: 2)
            )
        }
        .buttonStyle(.plain)
    }

    // MARK: - Playing

    private var playingView: some View {
        VStack(spacing: 12) {
            statsBar
            towerArea
            hintText
            controls
        }
        .padding(16)
    }

    private var statsBar: some View {
        HStack {
            HStack(spacing: 4) {
                Text("Moves:")
                    .font(.headline.bold())
                    .foregroundStyle(Color.hubInk)
                Text("\(viewModel.moves)")
                    .font(.headline.bold())
                    .foregroundStyle(Color.hubAccent)
                    .monospacedDigit()
            }
            Spacer()
            Text("\(viewModel.ringCount) rings · best \(viewModel.optimal)")
                .font(.subheadline.bold())
                .foregroundStyle(Color.hubAccent)
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

    private var towerArea: some View {
        let totalHeight: CGFloat = CGFloat(TowerOfHanoiConfig.maxRings) * TowerOfHanoiConfig.ringHeight + 60
        return GeometryReader { geo in
            ZStack(alignment: .bottom) {
                RoundedRectangle(cornerRadius: 24)
                    .fill(
                        LinearGradient(
                            colors: [Color(hex: "#f0f9ff"), Color(hex: "#f5f3ff")],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: 24)
                            .stroke(Color.hubCardBorder, lineWidth: 2)
                    )

                HStack(spacing: 0) {
                    ForEach(0..<3, id: \.self) { pegId in
                        pegColumn(pegId: pegId, columnWidth: (geo.size.width - 16) / 3)
                            .frame(maxWidth: .infinity)
                    }
                }
                .padding(.horizontal, 8)
                .padding(.bottom, 12)

                // Base bar
                RoundedRectangle(cornerRadius: 6)
                    .fill(
                        LinearGradient(
                            colors: [Color(hex: "#A5B4FC"), Color(hex: "#F0ABFC"), Color(hex: "#FBCFE8")],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .frame(height: 10)
                    .padding(.horizontal, 12)
                    .padding(.bottom, 6)
            }
        }
        .frame(height: totalHeight)
    }

    private func pegColumn(pegId: Int, columnWidth: CGFloat) -> some View {
        let stack = viewModel.pegs[pegId]
        let isSelected = viewModel.selectedPeg == pegId
        let isError = viewModel.errorPeg == pegId
        let liftedSize: Int? = isSelected ? stack.last : nil
        let visibleStack: [Int] = isSelected ? Array(stack.dropLast()) : stack

        return ZStack(alignment: .bottom) {
            Rectangle()
                .fill(isSelected ? Color.hubAccent.opacity(0.12) : Color.clear)
                .clipShape(RoundedRectangle(cornerRadius: 16))

            // Peg post
            VStack {
                RoundedRectangle(cornerRadius: 4)
                    .fill(Color.hubCardBorder)
                    .frame(width: 8)
            }
            .padding(.bottom, 8)

            // Lifted ring (at the top)
            if let liftedSize {
                let w = TowerOfHanoiConfig.ringWidthFraction(size: liftedSize, total: viewModel.ringCount) * columnWidth
                VStack {
                    RoundedRectangle(cornerRadius: TowerOfHanoiConfig.ringHeight / 2)
                        .fill(TowerOfHanoiConfig.ringColor(size: liftedSize, total: viewModel.ringCount))
                        .overlay(
                            RoundedRectangle(cornerRadius: TowerOfHanoiConfig.ringHeight / 2)
                                .stroke(Color.white.opacity(0.7), lineWidth: 2)
                        )
                        .frame(width: w, height: TowerOfHanoiConfig.ringHeight)
                        .shadow(color: Color.black.opacity(0.18), radius: 6, y: 3)
                    Spacer()
                }
                .padding(.top, 6)
                .transition(.opacity)
            }

            // Stacked rings (bottom-up)
            VStack(spacing: 2) {
                ForEach(Array(visibleStack.enumerated().reversed()), id: \.offset) { _, size in
                    let w = TowerOfHanoiConfig.ringWidthFraction(size: size, total: viewModel.ringCount) * columnWidth
                    RoundedRectangle(cornerRadius: TowerOfHanoiConfig.ringHeight / 2)
                        .fill(TowerOfHanoiConfig.ringColor(size: size, total: viewModel.ringCount))
                        .overlay(
                            RoundedRectangle(cornerRadius: TowerOfHanoiConfig.ringHeight / 2)
                                .stroke(Color.white.opacity(0.7), lineWidth: 2)
                        )
                        .frame(width: w, height: TowerOfHanoiConfig.ringHeight)
                        .shadow(color: Color.black.opacity(0.12), radius: 3, y: 1)
                }
            }
            .padding(.bottom, 8)
        }
        .contentShape(Rectangle())
        .onTapGesture {
            viewModel.tap(peg: pegId)
        }
        .modifier(ShakeIfError(active: isError))
        .animation(.easeInOut(duration: 0.15), value: viewModel.selectedPeg)
        .animation(.easeInOut(duration: 0.18), value: viewModel.pegs)
    }

    private var hintText: some View {
        Text(viewModel.selectedPeg == nil
             ? "Tap a peg to pick up its top ring."
             : "Tap another peg to drop it there.")
            .font(.caption.bold())
            .foregroundStyle(Color.hubAccent.opacity(0.8))
    }

    private var controls: some View {
        HStack(spacing: 10) {
            Button {
                viewModel.restart()
            } label: {
                Text("Restart 🔄")
                    .font(.subheadline.bold())
                    .padding(.horizontal, 18)
                    .padding(.vertical, 10)
                    .background(Color.hubAccent)
                    .foregroundStyle(.white)
                    .clipShape(Capsule())
            }
            .buttonStyle(.plain)

            Button {
                viewModel.goToTitle()
            } label: {
                Text("Change size")
                    .font(.subheadline.bold())
                    .foregroundStyle(Color.hubAccent)
            }
            .buttonStyle(.plain)
        }
    }

    // MARK: - Won

    private var wonView: some View {
        let perfect = viewModel.moves == viewModel.optimal
        return VStack(spacing: 14) {
            Text("🏆").font(.system(size: 96))
            Text("You did it!")
                .font(.system(size: 32, weight: .black))
                .foregroundStyle(Color.hubInk)
            VStack(spacing: 2) {
                Text("Solved in \(viewModel.moves) moves")
                    .font(.title3.bold())
                    .foregroundStyle(Color.hubAccent)
                Text("Best possible: \(viewModel.optimal)")
                    .font(.subheadline)
                    .foregroundStyle(Color.hubAccent.opacity(0.8))
            }
            if perfect {
                Text("Perfect! 🌟")
                    .font(.headline.bold())
                    .foregroundStyle(Color.hubAmber)
            }

            Button {
                viewModel.restart()
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
                Text("Change size")
                    .font(.subheadline.bold())
                    .foregroundStyle(Color.hubAccent)
            }
            .buttonStyle(.plain)
            .padding(.top, 2)
        }
        .padding(32)
    }
}

private struct ShakeIfError: ViewModifier {
    let active: Bool
    @State private var offset: CGFloat = 0

    func body(content: Content) -> some View {
        content
            .offset(x: offset)
            .onChange(of: active) { _, newValue in
                guard newValue else { return }
                let steps: [CGFloat] = [-8, 8, -6, 6, 0]
                for (i, step) in steps.enumerated() {
                    DispatchQueue.main.asyncAfter(deadline: .now() + Double(i) * 0.07) {
                        withAnimation(.easeInOut(duration: 0.07)) {
                            offset = step
                        }
                    }
                }
            }
    }
}
