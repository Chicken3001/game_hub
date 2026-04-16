import SwiftUI

private enum GameCategory { case multiplayer, singlePlayer }

private struct GameEntry: Identifiable {
    let id: String
    let title: String
    let subtitle: String
    let emoji: String
    let gradient: [Color]
    let category: GameCategory
}

struct HubView: View {
    private let games: [GameEntry] = [
        GameEntry(
            id: "tic-tac-toe",
            title: "Tic-Tac-Toe",
            subtitle: "Classic 3-in-a-row",
            emoji: "❌",
            gradient: [Color(hex: "#818CF8"), Color(hex: "#F472B6")],
            category: .multiplayer
        ),
        GameEntry(
            id: "checkers",
            title: "Checkers",
            subtitle: "Classic red vs black",
            emoji: "🔴",
            gradient: [Color(hex: "#F43F5E"), Color(hex: "#B91C1C")],
            category: .multiplayer
        ),
        GameEntry(
            id: "connect4",
            title: "Connect 4",
            subtitle: "Line up four in a row",
            emoji: "🟡",
            gradient: [Color(hex: "#2563EB"), Color(hex: "#FACC15")],
            category: .multiplayer
        ),
        GameEntry(
            id: "animal-match",
            title: "Animal Match",
            subtitle: "Match animals across the grid",
            emoji: "🐾",
            gradient: [Color(hex: "#A78BFA"), Color(hex: "#818CF8")],
            category: .singlePlayer
        ),
        GameEntry(
            id: "bubble-pop",
            title: "Bubble Pop",
            subtitle: "Pop bubbles before time runs out",
            emoji: "🫧",
            gradient: [Color(hex: "#67E8F9"), Color(hex: "#60A5FA")],
            category: .singlePlayer
        ),
        GameEntry(
            id: "shape-sorter",
            title: "Shape Sorter",
            subtitle: "Drag shapes into the right bin",
            emoji: "🔷",
            gradient: [Color(hex: "#A855F7"), Color(hex: "#6366F1")],
            category: .singlePlayer
        ),
        GameEntry(
            id: "farm-match",
            title: "Animal Memory Match",
            subtitle: "Flip and find matching pairs",
            emoji: "🧠",
            gradient: [Color(hex: "#34D399"), Color(hex: "#2DD4BF")],
            category: .singlePlayer
        ),
        GameEntry(
            id: "find-animal",
            title: "Find the Animal",
            subtitle: "Spot the right critter",
            emoji: "🦊",
            gradient: [Color(hex: "#FB923C"), Color(hex: "#F472B6")],
            category: .singlePlayer
        ),
    ]

    private var multiplayerGames: [GameEntry] { games.filter { $0.category == .multiplayer } }
    private var singlePlayerGames: [GameEntry] { games.filter { $0.category == .singlePlayer } }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.hubBackground.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 20) {
                        header
                            .padding(.bottom, 4)

                        section(
                            title: "Multiplayer",
                            emoji: "👥",
                            games: multiplayerGames
                        )
                        section(
                            title: "Single Player",
                            emoji: "🎯",
                            games: singlePlayerGames
                        )
                    }
                    .padding(20)
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Sign Out") {
                        Task { try? await AuthService.shared.signOut() }
                    }
                    .foregroundStyle(Color.hubAccent)
                }
            }
        }
    }

    @ViewBuilder
    private func section(title: String, emoji: String, games: [GameEntry]) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 8) {
                Text(emoji).font(.title3)
                Text(title)
                    .font(.system(size: 20, weight: .black))
                    .foregroundStyle(Color.hubInk)
            }
            let cols = Array(repeating: GridItem(.flexible(), spacing: 14), count: 2)
            LazyVGrid(columns: cols, spacing: 14) {
                ForEach(games) { game in
                    NavigationLink {
                        destination(for: game.id)
                    } label: {
                        GameTile(entry: game)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    @ViewBuilder
    private func destination(for id: String) -> some View {
        switch id {
        case "animal-match":
            CategorySelectorView()
        case "bubble-pop":
            BubblePopGameView()
        case "tic-tac-toe":
            TicTacToeLobbyView()
        case "shape-sorter":
            ShapeSorterView()
        case "farm-match":
            FarmMatchView()
        case "checkers":
            CheckersLobbyView()
        case "connect4":
            Connect4LobbyView()
        case "find-animal":
            FindAnimalView()
        default:
            EmptyView()
        }
    }

    private var header: some View {
        HStack(spacing: 12) {
            Text("🎮")
                .font(.system(size: 36))
            VStack(alignment: .leading, spacing: 2) {
                Text("Game Hub")
                    .font(.system(size: 28, weight: .black))
                    .foregroundStyle(Color.hubInk)
                Text("Pick a game!")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Color.hubAccent)
            }
            Spacer()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

private struct GameTile: View {
    let entry: GameEntry

    var body: some View {
        VStack(spacing: 10) {
            ZStack {
                RoundedRectangle(cornerRadius: 18)
                    .fill(
                        LinearGradient(
                            colors: entry.gradient,
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(height: 80)
                Text(entry.emoji).font(.system(size: 44))
            }

            Text(entry.title)
                .font(.subheadline.bold())
                .foregroundStyle(Color.hubInk)
                .lineLimit(1)
                .minimumScaleFactor(0.8)

            Text(entry.subtitle)
                .font(.caption)
                .foregroundStyle(Color.hubAccent)
                .lineLimit(2)
                .multilineTextAlignment(.center)
                .frame(minHeight: 30, alignment: .top)
        }
        .padding(12)
        .background(Color.hubCardBg)
        .clipShape(RoundedRectangle(cornerRadius: 20))
        .overlay(
            RoundedRectangle(cornerRadius: 20)
                .stroke(Color.hubCardBorder, lineWidth: 2)
        )
        .shadow(color: Color.hubAccent.opacity(0.1), radius: 12, y: 4)
    }
}
