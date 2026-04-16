import SwiftUI

struct Connect4ComputerView: View {
    @State private var viewModel = Connect4ComputerViewModel()

    var body: some View {
        ZStack {
            Color.hubBackground.ignoresSafeArea()
            ScrollView {
                VStack(spacing: 18) {
                    switch viewModel.phase {
                    case .setup: setupArea
                    case .playing: gameArea
                    }
                }
                .padding(18)
            }
        }
        .navigationTitle("Connect 4 vs Computer")
        .navigationBarTitleDisplayMode(.inline)
    }

    // ── Setup screen ────────────────────────────────────────────────────
    private var setupArea: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Difficulty")
                .font(.headline)
                .foregroundStyle(Color.hubInk)

            VStack(spacing: 10) {
                ForEach(Connect4Difficulty.allCases, id: \.self) { diff in
                    difficultyRow(diff)
                }
            }

            Text("Who goes first?")
                .font(.headline)
                .foregroundStyle(Color.hubInk)
                .padding(.top, 8)

            HStack(spacing: 10) {
                choiceButton(
                    title: "🔴 You",
                    subtitle: "Play Red",
                    selected: viewModel.goFirst
                ) { viewModel.goFirst = true }
                choiceButton(
                    title: "🤖 Computer",
                    subtitle: "You play Yellow",
                    selected: !viewModel.goFirst
                ) { viewModel.goFirst = false }
            }

            Button {
                viewModel.startGame()
            } label: {
                Text("▶️ Start Game")
                    .font(.headline)
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(Color.hubRose)
                    .clipShape(RoundedRectangle(cornerRadius: 18))
            }
            .padding(.top, 4)
        }
    }

    private func difficultyRow(_ diff: Connect4Difficulty) -> some View {
        let selected = viewModel.difficulty == diff
        return Button {
            viewModel.difficulty = diff
        } label: {
            HStack {
                Text(diff.emoji).font(.title3)
                Text(diff.label)
                    .font(.subheadline.bold())
                    .foregroundStyle(Color.hubInk)
                Spacer()
                if selected {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundStyle(Color.hubEmerald)
                }
            }
            .padding(.horizontal, 14).padding(.vertical, 12)
            .background(selected ? Color.hubEmerald.opacity(0.08) : Color.white)
            .clipShape(RoundedRectangle(cornerRadius: 14))
            .overlay(
                RoundedRectangle(cornerRadius: 14)
                    .stroke(selected ? Color.hubEmerald : Color.hubCardBorder, lineWidth: selected ? 2 : 1.5)
            )
        }
        .buttonStyle(.plain)
    }

    private func choiceButton(title: String, subtitle: String, selected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.subheadline.bold())
                    .foregroundStyle(selected ? .white : Color.hubInk)
                Text(subtitle).font(.caption)
                    .foregroundStyle(selected ? .white.opacity(0.85) : Color.hubAccent.opacity(0.7))
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(14)
            .background(selected ? Color.hubIndigo : Color.white)
            .clipShape(RoundedRectangle(cornerRadius: 14))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(selected ? Color.hubIndigo : Color.hubCardBorder, lineWidth: 1.5))
        }
        .buttonStyle(.plain)
    }

    // ── Game area ───────────────────────────────────────────────────────
    private var gameArea: some View {
        VStack(spacing: 14) {
            statusText
            Connect4BoardView(
                board: viewModel.board,
                lastMove: viewModel.lastMove,
                interactive: !viewModel.isComputerTurn && !viewModel.gameOver,
                showArrows: !viewModel.isComputerTurn && !viewModel.gameOver,
                onTap: { viewModel.dropInColumn($0) }
            )
            .frame(maxWidth: 380)
            if viewModel.gameOver { gameOverCard }
            playerIndicator
        }
    }

    @ViewBuilder
    private var statusText: some View {
        if !viewModel.gameOver {
            HStack(spacing: 8) {
                if viewModel.isThinking {
                    ProgressView().scaleEffect(0.8)
                }
                Text(viewModel.isComputerTurn
                     ? (viewModel.isThinking ? "🤖 Thinking…" : "🤖 Computer’s turn…")
                     : "🎯 Your turn!")
                .font(.title3.bold())
                .foregroundStyle(viewModel.isComputerTurn ? Color.hubAccent.opacity(0.7) : Color.hubRose)
            }
        }
    }

    @ViewBuilder
    private var gameOverCard: some View {
        let iWon = viewModel.gameResult == .humanWins
        let isDraw = viewModel.gameResult == .draw
        let emoji = isDraw ? "🤝" : (iWon ? "🏆" : "🤖")
        let title = isDraw ? "It's a draw!" : (iWon ? "You win!" : "Computer wins!")
        let borderColor: Color = isDraw ? Color.hubCardBorder : (iWon ? Color.hubEmerald : Color.hubRose)
        let titleColor: Color = isDraw ? Color.hubInk : (iWon ? Color.hubEmerald : Color.hubRose)
        let bgColor: Color = isDraw ? Color.white : (iWon ? Color.hubEmerald.opacity(0.1) : Color.hubRoseBg)

        VStack(spacing: 12) {
            Text(emoji).font(.system(size: 48))
            Text(title).font(.title2.bold()).foregroundStyle(titleColor)
            HStack(spacing: 10) {
                Button { viewModel.replay() } label: {
                    Text("🔄 Play Again")
                        .font(.subheadline.bold())
                        .padding(.horizontal, 16).padding(.vertical, 10)
                        .background(Color.hubEmerald)
                        .foregroundStyle(.white)
                        .clipShape(Capsule())
                }
                Button { viewModel.changeSettings() } label: {
                    Text("Change Settings")
                        .font(.subheadline.bold())
                        .padding(.horizontal, 16).padding(.vertical, 10)
                        .background(Color.white)
                        .foregroundStyle(Color.hubInk)
                        .clipShape(Capsule())
                        .overlay(Capsule().stroke(Color.hubCardBorder, lineWidth: 1.5))
                }
            }
        }
        .padding(20)
        .frame(maxWidth: .infinity)
        .background(bgColor)
        .clipShape(RoundedRectangle(cornerRadius: 22))
        .overlay(RoundedRectangle(cornerRadius: 22).stroke(borderColor, lineWidth: 2))
    }

    private var playerIndicator: some View {
        HStack(spacing: 6) {
            Text("You").foregroundStyle(Color.hubInk.opacity(0.7))
            Text(viewModel.humanPlayer == .one ? "🔴 Red" : "🟡 Yellow")
                .foregroundStyle(viewModel.humanPlayer == .one ? Color.hubRose : Color.hubAmber)
                .fontWeight(.black)
            Text("vs").foregroundStyle(Color.hubInk.opacity(0.5))
            Text("🤖 \(viewModel.difficulty.label)")
                .fontWeight(.black)
                .foregroundStyle(Color.hubInk)
        }
        .font(.subheadline)
    }
}
