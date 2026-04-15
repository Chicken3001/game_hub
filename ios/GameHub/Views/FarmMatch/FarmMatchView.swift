import SwiftUI

struct FarmMatchView: View {
    @State private var viewModel = FarmMatchViewModel()

    private let purple = Color(red: 0xA8/255, green: 0x55/255, blue: 0xF7/255)
    private let violetBorder = Color(red: 0xE9/255, green: 0xD5/255, blue: 0xFF/255)
    private let emerald = Color(red: 0x34/255, green: 0xD3/255, blue: 0x99/255)
    private let emeraldDeep = Color(red: 0x05/255, green: 0x96/255, blue: 0x69/255)
    private let backInk = Color(red: 0x31/255, green: 0x2E/255, blue: 0x81/255)

    var body: some View {
        ZStack {
            Color.hubBackground.ignoresSafeArea()
            ScrollView {
                VStack(spacing: 16) {
                    statsBar
                    if viewModel.showWinCard {
                        winCard
                    } else {
                        grid
                    }
                }
                .padding(16)
            }
        }
        .navigationTitle("Animal Memory Match")
        .navigationBarTitleDisplayMode(.inline)
    }

    private var statsBar: some View {
        HStack {
            Text("✅ \(viewModel.pairsFound) / \(viewModel.totalPairs) pairs")
                .font(.headline.weight(.black))
                .foregroundStyle(backInk)
            Spacer()
            Button {
                withAnimation(.easeInOut(duration: 0.2)) { viewModel.reset() }
            } label: {
                Text("Shuffle 🔄")
                    .font(.subheadline.bold())
                    .padding(.horizontal, 14).padding(.vertical, 8)
                    .background(Color.white)
                    .foregroundStyle(backInk)
                    .clipShape(Capsule())
                    .overlay(Capsule().stroke(violetBorder, lineWidth: 2))
            }
        }
        .padding(.horizontal, 14).padding(.vertical, 10)
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: 18))
        .overlay(RoundedRectangle(cornerRadius: 18).stroke(violetBorder, lineWidth: 2))
    }

    private var grid: some View {
        let cols = Array(repeating: GridItem(.flexible(), spacing: 10), count: 4)
        return LazyVGrid(columns: cols, spacing: 10) {
            ForEach(Array(viewModel.deck.enumerated()), id: \.offset) { index, emoji in
                card(index: index, emoji: emoji)
            }
        }
    }

    private func card(index: Int, emoji: String) -> some View {
        let revealed = viewModel.flipped.contains(index) || viewModel.matched.contains(index)
        let isMatched = viewModel.matched.contains(index)
        return CardFlipView(
            revealed: revealed,
            isMatched: isMatched,
            emoji: emoji,
            emerald: emerald,
            emeraldDeep: emeraldDeep
        )
        .onTapGesture { viewModel.tap(index) }
    }

    private var winCard: some View {
        VStack(spacing: 10) {
            Text("🎉").font(.system(size: 72))
            Text("Amazing memory!")
                .font(.title.bold())
                .foregroundStyle(emeraldDeep)
            Text("You found all \(viewModel.totalPairs) pairs!")
                .font(.headline)
                .foregroundStyle(emeraldDeep.opacity(0.85))
            Button {
                withAnimation(.easeInOut(duration: 0.2)) { viewModel.reset() }
            } label: {
                Text("🔄 Play again!")
                    .font(.headline.bold())
                    .foregroundStyle(.white)
                    .padding(.horizontal, 24).padding(.vertical, 12)
                    .background(Color.hubIndigo)
                    .clipShape(Capsule())
            }
            .padding(.top, 8)
        }
        .padding(28)
        .frame(maxWidth: .infinity)
        .background(
            LinearGradient(
                colors: [Color(red: 0xD1/255, green: 0xFA/255, blue: 0xE5/255), Color(red: 0xCC/255, green: 0xFB/255, blue: 0xF1/255)],
                startPoint: .topLeading, endPoint: .bottomTrailing
            )
        )
        .clipShape(RoundedRectangle(cornerRadius: 28))
        .overlay(RoundedRectangle(cornerRadius: 28).stroke(emerald, lineWidth: 2))
    }
}

private struct CardFlipView: View {
    let revealed: Bool
    let isMatched: Bool
    let emoji: String
    let emerald: Color
    let emeraldDeep: Color

    var body: some View {
        let animal = FarmMatch.animal(for: emoji)
        let angle: Double = revealed ? 180 : 0

        return ZStack {
            // Back
            ZStack {
                RoundedRectangle(cornerRadius: 22)
                    .fill(
                        LinearGradient(
                            colors: [Color(red: 0x81/255, green: 0x8C/255, blue: 0xF8/255), Color(red: 0x8B/255, green: 0x5C/255, blue: 0xF6/255)],
                            startPoint: .topLeading, endPoint: .bottomTrailing
                        )
                    )
                    .overlay(RoundedRectangle(cornerRadius: 22).stroke(Color.white, lineWidth: 4))
                Text("⭐").font(.system(size: 44))
            }
            .opacity(revealed ? 0 : 1)

            // Front
            ZStack {
                RoundedRectangle(cornerRadius: 22)
                    .fill(animal.bg)
                RoundedRectangle(cornerRadius: 22)
                    .stroke(isMatched ? emerald : animal.border, lineWidth: 4)
                    .shadow(color: isMatched ? emerald.opacity(0.4) : .clear, radius: 4)
                Text(emoji).font(.system(size: 44))
            }
            .rotation3DEffect(.degrees(180), axis: (x: 0, y: 1, z: 0))
            .opacity(revealed ? 1 : 0)
        }
        .aspectRatio(1, contentMode: .fit)
        .rotation3DEffect(.degrees(angle), axis: (x: 0, y: 1, z: 0))
        .animation(.easeInOut(duration: 0.5), value: revealed)
        .shadow(color: .black.opacity(0.1), radius: 4, x: 0, y: 2)
    }
}
