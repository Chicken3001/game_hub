import SwiftUI

struct TicTacToeLocalView: View {
    @State private var viewModel = TicTacToeLocalViewModel()

    var body: some View {
        ZStack {
            Color.hubBackground.ignoresSafeArea()
            ScrollView {
                VStack(spacing: 20) {
                    statusText
                    boardGrid
                    if viewModel.gameOver { gameOverCard }
                    footer
                }
                .padding(20)
            }
        }
        .navigationTitle("Pass & Play")
        .navigationBarTitleDisplayMode(.inline)
    }

    @ViewBuilder
    private var statusText: some View {
        if !viewModel.gameOver {
            Text("\(viewModel.turn == .x ? "❌ X" : "⭕ O")'s turn!")
                .font(.title3.bold())
                .foregroundStyle(viewModel.turn == .x ? Color.hubIndigo : Color.hubRose)
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
        let cell = viewModel.board[i]
        let disabled = viewModel.gameOver || cell != .empty
        let isLast = viewModel.lastMove == i && cell != .empty
        let ringColor: Color = cell == .x ? Color.hubIndigo : Color.hubRose
        return Button {
            viewModel.tapCell(i)
        } label: {
            ZStack {
                RoundedRectangle(cornerRadius: 18)
                    .fill(Color.white)
                RoundedRectangle(cornerRadius: 18)
                    .stroke(isLast ? ringColor : Color.hubCardBorder, lineWidth: isLast ? 3 : 2)
                Text(cell.rawValue)
                    .font(.system(size: 56, weight: .black))
                    .foregroundStyle(cell == .x ? Color.hubIndigo : Color.hubRose)
            }
            .aspectRatio(1, contentMode: .fit)
            .opacity(viewModel.gameOver ? 0.85 : 1)
        }
        .buttonStyle(.plain)
        .allowsHitTesting(!disabled)
    }

    @ViewBuilder
    private var gameOverCard: some View {
        let isDraw = viewModel.winner == .draw
        let winSymbol: TTTSymbol? = {
            if case .win(let s) = viewModel.winner { return s }
            return nil
        }()
        let emoji = isDraw ? "🤝" : "🏆"
        let title: String = {
            if isDraw { return "It's a draw!" }
            guard let s = winSymbol else { return "" }
            return "\(s == .x ? "❌ X" : "⭕ O") wins!"
        }()
        let accentColor: Color = isDraw
            ? Color.hubCardBorder
            : (winSymbol == .x ? Color.hubIndigo : Color.hubRose)
        let titleColor: Color = isDraw
            ? Color.hubInk
            : (winSymbol == .x ? Color.hubIndigo : Color.hubRose)
        let bgColor: Color = isDraw
            ? Color.hubCardBg
            : (winSymbol == .x ? Color.hubIndigo.opacity(0.1) : Color.hubRoseBg)

        VStack(spacing: 12) {
            Text(emoji).font(.system(size: 48))
            Text(title)
                .font(.title2.bold())
                .foregroundStyle(titleColor)
            Button { viewModel.replay() } label: {
                Text("🔄 Play Again")
                    .font(.subheadline.bold())
                    .padding(.horizontal, 16).padding(.vertical, 10)
                    .background(Color.hubEmerald)
                    .foregroundStyle(.white)
                    .clipShape(Capsule())
            }
        }
        .padding(20)
        .frame(maxWidth: .infinity)
        .background(bgColor)
        .clipShape(RoundedRectangle(cornerRadius: 22))
        .overlay(RoundedRectangle(cornerRadius: 22).stroke(accentColor, lineWidth: 2))
    }

    private var footer: some View {
        HStack(spacing: 6) {
            Text("❌ X")
                .foregroundStyle(Color.hubIndigo)
                .fontWeight(.black)
            Text("vs").foregroundStyle(Color.hubInk.opacity(0.5))
            Text("⭕ O")
                .foregroundStyle(Color.hubRose)
                .fontWeight(.black)
            Text("• Pass the device").foregroundStyle(Color.hubInk.opacity(0.5))
        }
        .font(.subheadline)
    }
}
