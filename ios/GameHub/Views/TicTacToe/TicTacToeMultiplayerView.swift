import SwiftUI

struct TicTacToeMultiplayerView: View {
    @State private var viewModel: TicTacToeMultiplayerViewModel
    @Environment(\.dismiss) private var dismiss

    init(initialGame: TicTacToeGameRow) {
        let uid = AuthService.shared.currentUserId ?? ""
        _viewModel = State(initialValue: TicTacToeMultiplayerViewModel(initialGame: initialGame, currentUserId: uid))
    }

    var body: some View {
        ZStack {
            Color.hubBackground.ignoresSafeArea()
            ScrollView {
                VStack(spacing: 18) {
                    switch viewModel.game.statusEnum {
                    case .cancelled: cancelledCard
                    case .waiting:
                        if viewModel.joining { joiningCard }
                        else if viewModel.isSpectator { waitingAsVisitorCard }
                        else { waitingCard }
                    default:
                        gameBody
                    }
                }
                .padding(18)
            }
        }
        .navigationTitle("Game Room")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear { viewModel.onAppear() }
        .onDisappear { viewModel.onDisappear() }
        .navigationDestination(item: $viewModel.rematchGame) { row in
            TicTacToeMultiplayerView(initialGame: row)
        }
        .onChange(of: viewModel.forceDismiss) { _, shouldDismiss in
            if shouldDismiss { dismiss() }
        }
    }

    private var waitingCard: some View {
        VStack(spacing: 10) {
            Text("⏳").font(.system(size: 56))
            Text("Waiting for opponent…")
                .font(.title3.bold())
                .foregroundStyle(Color.hubInk)
            Text("Your game is listed in the lobby — a friend can join from there.")
                .font(.subheadline)
                .foregroundStyle(Color.hubAccent)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 12)
        }
        .padding(24)
        .frame(maxWidth: .infinity)
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: 22))
        .overlay(RoundedRectangle(cornerRadius: 22).stroke(Color.hubCardBorder, lineWidth: 2))
    }

    private var joiningCard: some View {
        VStack(spacing: 10) {
            ProgressView().scaleEffect(1.4)
            Text("Joining game…")
                .font(.title3.bold())
                .foregroundStyle(Color.hubInk)
                .padding(.top, 6)
        }
        .padding(28)
        .frame(maxWidth: .infinity)
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: 22))
    }

    private var waitingAsVisitorCard: some View {
        VStack(spacing: 10) {
            Text("👀").font(.system(size: 48))
            Text("Waiting room")
                .font(.title3.bold())
                .foregroundStyle(Color.hubInk)
        }
        .padding(24)
        .frame(maxWidth: .infinity)
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: 22))
    }

    private var cancelledCard: some View {
        VStack(spacing: 10) {
            Text("🚫").font(.system(size: 56))
            Text("This game was cancelled")
                .font(.title3.bold())
                .foregroundStyle(Color.hubInk)
            Button("Back to Lobby") { dismiss() }
                .font(.subheadline.bold())
                .foregroundStyle(.white)
                .padding(.horizontal, 20).padding(.vertical, 10)
                .background(Color.hubIndigo)
                .clipShape(Capsule())
                .padding(.top, 6)
        }
        .padding(24)
        .frame(maxWidth: .infinity)
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: 22))
        .overlay(RoundedRectangle(cornerRadius: 22).stroke(Color.hubCardBorder, lineWidth: 2))
    }

    private var gameBody: some View {
        VStack(spacing: 16) {
            if viewModel.isSpectator && !viewModel.isGameOver { spectatorBadge }
            if viewModel.opponentGone && !viewModel.isGameOver && !viewModel.isSpectator, let n = viewModel.countdown {
                disconnectBanner(seconds: n)
            }
            statusText
            boardGrid
            if viewModel.isGameOver { gameOverCard }
            symbolIndicator
        }
    }

    private var spectatorBadge: some View {
        HStack(spacing: 8) {
            Text("👀")
            Text("You are spectating")
                .font(.subheadline.bold())
                .foregroundStyle(Color.hubAmber)
        }
        .padding(.horizontal, 14).padding(.vertical, 8)
        .background(Color.hubAmberBg)
        .clipShape(Capsule())
    }

    private func disconnectBanner(seconds: Int) -> some View {
        VStack(spacing: 8) {
            Text("⚠️ Opponent disconnected")
                .font(.headline)
                .foregroundStyle(Color.hubAmber)
            Text("Returning to lobby in \(seconds)s…")
                .font(.subheadline.bold())
                .foregroundStyle(Color.hubAmber.opacity(0.8))
            Button {
                Task { await viewModel.leaveNow() }
            } label: {
                Text("Return Now")
                    .font(.subheadline.bold())
                    .foregroundStyle(.white)
                    .padding(.horizontal, 18).padding(.vertical, 8)
                    .background(Color.hubAmber)
                    .clipShape(Capsule())
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity)
        .background(Color.hubAmberBg)
        .clipShape(RoundedRectangle(cornerRadius: 18))
        .overlay(RoundedRectangle(cornerRadius: 18).stroke(Color.hubAmber.opacity(0.5), lineWidth: 2))
    }

    @ViewBuilder
    private var statusText: some View {
        if !viewModel.isGameOver && viewModel.game.statusEnum == .active {
            let text: String = {
                if viewModel.isSpectator { return "\(viewModel.game.current_turn)'s turn" }
                if viewModel.isMyTurn { return "🎯 Your turn!" }
                return "⏳ \(viewModel.opponentUsername ?? "Opponent")'s turn…"
            }()
            Text(text)
                .font(.title3.bold())
                .foregroundStyle(viewModel.isMyTurn ? Color.hubIndigo : Color.hubAccent.opacity(0.7))
        }
    }

    private var boardGrid: some View {
        let cols = Array(repeating: GridItem(.flexible(), spacing: 12), count: 3)
        return LazyVGrid(columns: cols, spacing: 12) {
            ForEach(0..<9, id: \.self) { i in
                cellButton(i)
            }
        }
        .frame(maxWidth: 320)
    }

    private func cellButton(_ i: Int) -> some View {
        let cell = viewModel.game.boardCells[i]
        let disabled = !viewModel.isMyTurn || cell != .empty || viewModel.game.statusEnum != .active
        let isLast = viewModel.lastMove == i && cell != .empty
        let ringColor: Color = cell == .x ? Color.hubIndigo : Color.hubRose
        return Button {
            Task { await viewModel.tapCell(i) }
        } label: {
            ZStack {
                RoundedRectangle(cornerRadius: 18).fill(Color.white)
                RoundedRectangle(cornerRadius: 18)
                    .stroke(isLast ? ringColor : Color.hubCardBorder, lineWidth: isLast ? 3 : 2)
                Text(cell.rawValue)
                    .font(.system(size: 56, weight: .black))
                    .foregroundStyle(cell == .x ? Color.hubIndigo : Color.hubRose)
            }
            .aspectRatio(1, contentMode: .fit)
            .opacity(viewModel.isGameOver ? 0.85 : 1)
        }
        .disabled(disabled)
        .buttonStyle(.plain)
    }

    @ViewBuilder
    private var gameOverCard: some View {
        let status = viewModel.game.statusEnum
        let isDraw = status == .draw
        let iWon = viewModel.iWon
        let opponentWon = !iWon && !isDraw && !viewModel.isSpectator
        let emoji: String = {
            if isDraw { return "🤝" }
            if iWon { return "🏆" }
            if opponentWon { return "😢" }
            return status == .x_wins ? "❌" : "⭕"
        }()
        let title: String = {
            if isDraw { return "It's a draw!" }
            if iWon { return "You win!" }
            if opponentWon { return "You lost!" }
            return status == .x_wins ? "X wins!" : "O wins!"
        }()
        let borderColor: Color = isDraw ? Color.hubCardBorder : (iWon ? Color.hubEmerald : Color.hubRose)
        let titleColor: Color = isDraw ? Color.hubInk : (iWon ? Color.hubEmerald : Color.hubRose)
        let bgColor: Color = isDraw ? Color.white : (iWon ? Color.hubEmerald.opacity(0.1) : Color.hubRoseBg)

        VStack(spacing: 12) {
            Text(emoji).font(.system(size: 48))
            Text(title).font(.title2.bold()).foregroundStyle(titleColor)
            HStack(spacing: 10) {
                if !viewModel.isSpectator {
                    Button {
                        Task { await viewModel.startRematch() }
                    } label: {
                        Text(viewModel.rematching ? "⏳ Starting…" : "🔄 Rematch")
                            .font(.subheadline.bold())
                            .padding(.horizontal, 16).padding(.vertical, 10)
                            .background(Color.hubEmerald)
                            .foregroundStyle(.white)
                            .clipShape(Capsule())
                    }
                    .disabled(viewModel.rematching)
                }
                Button { dismiss() } label: {
                    Text("Lobby")
                        .font(.subheadline.bold())
                        .padding(.horizontal, 16).padding(.vertical, 10)
                        .background(Color.hubIndigo)
                        .foregroundStyle(.white)
                        .clipShape(Capsule())
                }
            }
        }
        .padding(20)
        .frame(maxWidth: .infinity)
        .background(bgColor)
        .clipShape(RoundedRectangle(cornerRadius: 22))
        .overlay(RoundedRectangle(cornerRadius: 22).stroke(borderColor, lineWidth: 2))
    }

    @ViewBuilder
    private var symbolIndicator: some View {
        if let mine = viewModel.mySymbol, viewModel.game.statusEnum != .waiting {
            HStack(spacing: 6) {
                Text("You").foregroundStyle(Color.hubInk.opacity(0.7))
                Text(mine == .x ? "❌ X" : "⭕ O")
                    .foregroundStyle(mine == .x ? Color.hubIndigo : Color.hubRose)
                    .fontWeight(.black)
                if let name = viewModel.opponentUsername {
                    Text("vs").foregroundStyle(Color.hubInk.opacity(0.5))
                    Text(name).fontWeight(.black).foregroundStyle(Color.hubInk)
                }
            }
            .font(.subheadline)
        }
    }
}
