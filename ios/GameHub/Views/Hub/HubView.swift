import SwiftUI

private struct GameEntry: Identifiable {
    let id: String
    let title: String
    let subtitle: String
    let emoji: String
    let gradient: [Color]
}

struct HubView: View {
    private let games: [GameEntry] = [
        GameEntry(
            id: "animal-match",
            title: "Animal Match",
            subtitle: "Match animals across the grid",
            emoji: "🐾",
            gradient: [Color(hex: "#A78BFA"), Color(hex: "#818CF8")]
        ),
        GameEntry(
            id: "bubble-pop",
            title: "Bubble Pop",
            subtitle: "Pop bubbles before time runs out",
            emoji: "🫧",
            gradient: [Color(hex: "#67E8F9"), Color(hex: "#60A5FA")]
        ),
        GameEntry(
            id: "tic-tac-toe",
            title: "Tic-Tac-Toe",
            subtitle: "Play against the computer",
            emoji: "❌",
            gradient: [Color(hex: "#818CF8"), Color(hex: "#F472B6")]
        ),
        GameEntry(
            id: "shape-sorter",
            title: "Shape Sorter",
            subtitle: "Drag shapes into the right bin",
            emoji: "🔷",
            gradient: [Color(hex: "#A855F7"), Color(hex: "#6366F1")]
        ),
        GameEntry(
            id: "farm-match",
            title: "Animal Memory Match",
            subtitle: "Flip and find matching pairs",
            emoji: "🧠",
            gradient: [Color(hex: "#34D399"), Color(hex: "#2DD4BF")]
        ),
    ]

    var body: some View {
        NavigationStack {
            ZStack {
                Color.hubBackground.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 16) {
                        header
                            .padding(.bottom, 4)

                        ForEach(games) { game in
                            NavigationLink {
                                destination(for: game.id)
                            } label: {
                                GameCard(entry: game)
                            }
                            .buttonStyle(.plain)
                        }
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

private struct GameCard: View {
    let entry: GameEntry

    var body: some View {
        HStack(spacing: 16) {
            ZStack {
                RoundedRectangle(cornerRadius: 20)
                    .fill(
                        LinearGradient(
                            colors: entry.gradient,
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 72, height: 72)
                Text(entry.emoji).font(.system(size: 40))
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(entry.title)
                    .font(.title2.bold())
                    .foregroundStyle(Color.hubInk)
                Text(entry.subtitle)
                    .font(.subheadline)
                    .foregroundStyle(Color.hubAccent)
            }

            Spacer()

            Image(systemName: "chevron.right")
                .font(.headline)
                .foregroundStyle(Color.hubAccent.opacity(0.6))
        }
        .hubCard()
    }
}
