import SwiftUI

struct CheckersLocalView: View {
    @State private var viewModel = CheckersLocalViewModel()

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
        .navigationTitle("Checkers — Over the Board")
        .navigationBarTitleDisplayMode(.inline)
    }

    // ── Setup ───────────────────────────────────────────────────────────
    private var setupArea: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Two players, one device — Red moves first")
                .font(.subheadline)
                .foregroundStyle(Color.hubAccent.opacity(0.8))
                .frame(maxWidth: .infinity, alignment: .center)

            settingRow(
                title: "Forced Capture",
                subtitle: "Must jump when possible",
                isOn: Binding(
                    get: { viewModel.forcedCapture },
                    set: { viewModel.forcedCapture = $0 }
                )
            )

            settingRow(
                title: "Flip board between turns",
                subtitle: "For passing the device — each player sees their pieces at the bottom",
                isOn: Binding(
                    get: { viewModel.flipBetweenTurns },
                    set: { viewModel.flipBetweenTurns = $0 }
                )
            )

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

    private func settingRow(title: String, subtitle: String, isOn: Binding<Bool>) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.subheadline.bold())
                    .foregroundStyle(Color.hubInk)
                Text(subtitle)
                    .font(.caption)
                    .foregroundStyle(Color.hubAccent.opacity(0.7))
            }
            Spacer()
            Toggle("", isOn: isOn)
                .labelsHidden()
                .tint(Color.hubEmerald)
        }
        .padding(14)
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color.hubCardBorder, lineWidth: 1.5))
    }

    // ── Game ────────────────────────────────────────────────────────────
    private var gameArea: some View {
        VStack(spacing: 14) {
            statusText
            if viewModel.mustContinueFrom != nil {
                Text("Multi-jump! Keep capturing.")
                    .font(.subheadline.bold())
                    .foregroundStyle(Color.hubAmber)
                    .padding(.horizontal, 12).padding(.vertical, 6)
                    .background(Color.hubAmberBg)
                    .clipShape(Capsule())
                    .overlay(Capsule().stroke(Color.hubAmber.opacity(0.5), lineWidth: 1))
            }
            CheckersBoardView(
                board: viewModel.activeBoard,
                selectedPiece: viewModel.selectedPiece,
                mustContinueFrom: viewModel.mustContinueFrom,
                validDestinations: viewModel.validDestinations,
                forcedPieces: viewModel.forcedPieces,
                lastMove: viewModel.lastMove,
                flip: viewModel.flipBoard,
                interactive: !viewModel.gameOver,
                onTap: { viewModel.tapCell($0) }
            )
            .frame(maxWidth: 380)
            if viewModel.gameOver { gameOverCard }
            playerIndicator
        }
    }

    @ViewBuilder
    private var statusText: some View {
        if !viewModel.gameOver {
            Text("\(viewModel.turn == .one ? "🔴 Red" : "⚫ Black")'s turn!")
                .font(.title3.bold())
                .foregroundStyle(viewModel.turn == .one ? Color.hubRose : Color.hubInk)
        }
    }

    @ViewBuilder
    private var gameOverCard: some View {
        let isDraw = viewModel.gameResult == .draw
        let winner: CheckersPlayer? = {
            if case .win(let p) = viewModel.gameResult { return p }
            return nil
        }()
        let emoji = isDraw ? "🤝" : "🏆"
        let title: String = {
            if isDraw { return "It's a draw!" }
            guard let p = winner else { return "" }
            return "\(p == .one ? "🔴 Red" : "⚫ Black") wins!"
        }()
        let accentColor: Color = isDraw
            ? Color.hubCardBorder
            : (winner == .one ? Color.hubRose : Color.hubInk)
        let titleColor: Color = isDraw
            ? Color.hubInk
            : (winner == .one ? Color.hubRose : Color.hubInk)
        let bgColor: Color = isDraw
            ? Color.white
            : (winner == .one ? Color.hubRoseBg : Color.hubCardBg)

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
        .overlay(RoundedRectangle(cornerRadius: 22).stroke(accentColor, lineWidth: 2))
    }

    private var playerIndicator: some View {
        HStack(spacing: 6) {
            Text("🔴 Red")
                .foregroundStyle(Color.hubRose)
                .fontWeight(.black)
            Text("vs").foregroundStyle(Color.hubInk.opacity(0.5))
            Text("⚫ Black")
                .foregroundStyle(Color.hubInk)
                .fontWeight(.black)
            Text(viewModel.flipBetweenTurns ? "• Flips each turn" : "• Over the board")
                .foregroundStyle(Color.hubInk.opacity(0.5))
        }
        .font(.subheadline)
    }
}
