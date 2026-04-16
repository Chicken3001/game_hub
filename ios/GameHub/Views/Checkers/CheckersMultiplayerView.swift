import SwiftUI

struct CheckersMultiplayerView: View {
    @State private var viewModel: CheckersMultiplayerViewModel
    @Environment(\.dismiss) private var dismiss

    init(initialGame: CheckersGameRow) {
        let uid = AuthService.shared.currentUserId ?? ""
        _viewModel = State(initialValue: CheckersMultiplayerViewModel(initialGame: initialGame, currentUserId: uid))
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
        .navigationTitle("Checkers")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear { viewModel.onAppear() }
        .onDisappear { viewModel.onDisappear() }
        .navigationDestination(item: $viewModel.rematchGame) { row in
            CheckersMultiplayerView(initialGame: row)
        }
        .onChange(of: viewModel.forceDismiss) { _, shouldDismiss in
            if shouldDismiss { dismiss() }
        }
    }

    // ── Waiting states ──────────────────────────────────────────────────
    private var waitingCard: some View {
        VStack(spacing: 14) {
            Text("⏳").font(.system(size: 56))
            Text("Waiting for opponent…")
                .font(.title3.bold())
                .foregroundStyle(Color.hubInk)
            Text("Your game is listed in the lobby — a friend can join from there.")
                .font(.subheadline)
                .foregroundStyle(Color.hubAccent)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 12)

            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Forced Capture")
                        .font(.subheadline.bold())
                        .foregroundStyle(Color.hubInk)
                    Text("Must jump when possible")
                        .font(.caption)
                        .foregroundStyle(Color.hubAccent.opacity(0.7))
                }
                Spacer()
                Toggle("", isOn: Binding(
                    get: { viewModel.game.forced_capture },
                    set: { _ in Task { await viewModel.toggleForcedCapture() } }
                ))
                .labelsHidden()
                .tint(Color.hubEmerald)
            }
            .padding(.top, 8)
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

    // ── Active game body ────────────────────────────────────────────────
    private var gameBody: some View {
        VStack(spacing: 14) {
            if viewModel.isSpectator && !viewModel.game.isGameOver { spectatorBadge }
            if viewModel.opponentGone && !viewModel.game.isGameOver && !viewModel.isSpectator,
               let n = viewModel.countdown {
                disconnectBanner(seconds: n)
            }
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
                interactive: viewModel.isMyTurn && !viewModel.game.isGameOver,
                onTap: { viewModel.tapCell($0) }
            )
            .frame(maxWidth: 380)
            if viewModel.game.isGameOver { gameOverCard }
            playerIndicator
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
        if !viewModel.game.isGameOver && viewModel.game.statusEnum == .active {
            let text: String = {
                if viewModel.isSpectator {
                    return "Player \(viewModel.game.current_turn)'s turn"
                }
                if viewModel.isMyTurn { return "🎯 Your turn!" }
                return "⏳ \(viewModel.opponentUsername ?? "Opponent")'s turn…"
            }()
            Text(text)
                .font(.title3.bold())
                .foregroundStyle(viewModel.isMyTurn ? Color.hubRose : Color.hubAccent.opacity(0.7))
        }
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
            return status == .p1_wins ? "🔴" : "⚫"
        }()
        let title: String = {
            if isDraw { return "It's a draw!" }
            if iWon { return "You win!" }
            if opponentWon { return "You lost!" }
            return status == .p1_wins ? "Red wins!" : "Black wins!"
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
    private var playerIndicator: some View {
        if let me = viewModel.myPlayer, viewModel.game.statusEnum != .waiting {
            HStack(spacing: 6) {
                Text("You").foregroundStyle(Color.hubInk.opacity(0.7))
                Text(me == .one ? "🔴 Red" : "⚫ Black")
                    .foregroundStyle(me == .one ? Color.hubRose : Color.hubInk)
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
