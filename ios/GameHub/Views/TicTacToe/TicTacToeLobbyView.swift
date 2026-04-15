import SwiftUI

struct TicTacToeLobbyView: View {
    @State private var viewModel = TicTacToeLobbyViewModel()

    var body: some View {
        ZStack {
            Color.hubBackground.ignoresSafeArea()
            ScrollView {
                VStack(spacing: 14) {
                    createButton
                    NavigationLink {
                        TicTacToeGameView()
                    } label: {
                        HStack {
                            Text("🤖 Play vs Computer")
                                .font(.headline)
                                .foregroundStyle(Color.hubInk)
                            Spacer()
                            Image(systemName: "chevron.right")
                                .foregroundStyle(Color.hubAccent.opacity(0.6))
                        }
                        .padding(.horizontal, 18).padding(.vertical, 14)
                        .background(Color.white)
                        .clipShape(RoundedRectangle(cornerRadius: 18))
                        .overlay(RoundedRectangle(cornerRadius: 18).stroke(Color.hubCardBorder, lineWidth: 1.5))
                    }
                    .buttonStyle(.plain)

                    Text("Open Lobbies")
                        .font(.headline)
                        .foregroundStyle(Color.hubInk)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.top, 6)

                    if viewModel.loading {
                        Text("Loading…")
                            .font(.subheadline)
                            .foregroundStyle(Color.hubAccent.opacity(0.7))
                    } else if viewModel.games.isEmpty {
                        Text("No open games yet — create one to get started!")
                            .font(.subheadline)
                            .foregroundStyle(Color.hubAccent.opacity(0.7))
                            .multilineTextAlignment(.center)
                            .frame(maxWidth: .infinity)
                            .padding(20)
                            .overlay(
                                RoundedRectangle(cornerRadius: 18)
                                    .stroke(Color.hubCardBorder, style: StrokeStyle(lineWidth: 2, dash: [6]))
                            )
                    } else {
                        ForEach(viewModel.games) { game in
                            lobbyRow(game)
                        }
                    }
                }
                .padding(16)
            }
        }
        .navigationTitle("Tic-Tac-Toe")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await viewModel.load()
            viewModel.subscribe()
        }
        .onDisappear { viewModel.unsubscribe() }
        .navigationDestination(item: $viewModel.createdGame) { row in
            TicTacToeMultiplayerView(initialGame: row)
        }
    }

    private var createButton: some View {
        Button {
            Task {
                if let userId = AuthService.shared.currentUserId {
                    await viewModel.createGame(userId: userId)
                }
            }
        } label: {
            Text(viewModel.creating ? "⏳ Creating…" : "➕ Create New Game")
                .font(.headline)
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(Color.hubIndigo)
                .clipShape(RoundedRectangle(cornerRadius: 18))
        }
        .disabled(viewModel.creating)
    }

    @ViewBuilder
    private func lobbyRow(_ game: TicTacToeGameRow) -> some View {
        let isMine = game.player_x.uuidString.lowercased() == (AuthService.shared.currentUserId ?? "").lowercased()
        let name = isMine ? "⭐ You" : "🎮 \(viewModel.usernames[game.player_x] ?? "Someone")"
        NavigationLink {
            TicTacToeMultiplayerView(initialGame: game)
        } label: {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(name)
                        .font(.subheadline.bold())
                        .foregroundStyle(Color.hubInk)
                    Text(game.created_at.prefix(16))
                        .font(.caption)
                        .foregroundStyle(Color.hubAccent.opacity(0.6))
                }
                Spacer()
                Text(isMine ? "Resume" : "Join")
                    .font(.subheadline.bold())
                    .foregroundStyle(isMine ? Color.hubIndigo : .white)
                    .padding(.horizontal, 14).padding(.vertical, 8)
                    .background(isMine ? Color.hubIndigo.opacity(0.1) : Color.hubEmerald)
                    .clipShape(Capsule())
            }
            .padding(.horizontal, 16).padding(.vertical, 12)
            .background(Color.white)
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color.hubCardBorder, lineWidth: 1.5))
        }
        .buttonStyle(.plain)
    }
}
