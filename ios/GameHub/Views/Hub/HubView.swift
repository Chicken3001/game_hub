import SwiftUI

struct HubView: View {
    var body: some View {
        NavigationStack {
            ZStack {
                Color.hubBackground.ignoresSafeArea()

                VStack(spacing: 20) {
                    header

                    NavigationLink {
                        CategorySelectorView()
                    } label: {
                        GameCard()
                    }
                    .buttonStyle(.plain)

                    Spacer()
                }
                .padding(20)
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
    var body: some View {
        HStack(spacing: 16) {
            ZStack {
                RoundedRectangle(cornerRadius: 20)
                    .fill(
                        LinearGradient(
                            colors: [Color(hex: "#A78BFA"), Color(hex: "#818CF8")],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 72, height: 72)
                Text("🐾").font(.system(size: 40))
            }

            VStack(alignment: .leading, spacing: 4) {
                Text("Animal Match")
                    .font(.title2.bold())
                    .foregroundStyle(Color.hubInk)
                Text("Match animals across the grid")
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
