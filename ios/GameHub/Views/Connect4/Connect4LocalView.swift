import SwiftUI

struct Connect4LocalView: View {
    @State private var viewModel = Connect4LocalViewModel()

    var body: some View {
        ZStack {
            Color.hubBackground.ignoresSafeArea()
            ScrollView {
                VStack(spacing: 14) {
                    statusText
                    Connect4BoardView(
                        board: viewModel.board,
                        lastMove: viewModel.lastMove,
                        interactive: !viewModel.gameOver,
                        showArrows: !viewModel.gameOver,
                        onTap: { viewModel.dropInColumn($0) }
                    )
                    .frame(maxWidth: 380)
                    if viewModel.gameOver { gameOverCard }
                    playerIndicator
                }
                .padding(18)
            }
        }
        .navigationTitle("Connect 4 — Pass & Play")
        .navigationBarTitleDisplayMode(.inline)
    }

    @ViewBuilder
    private var statusText: some View {
        if !viewModel.gameOver {
            Text("\(viewModel.turn == .one ? "🔴 Red" : "🟡 Yellow")'s turn!")
                .font(.title3.bold())
                .foregroundStyle(viewModel.turn == .one ? Color.hubRose : Color.hubAmber)
        }
    }

    @ViewBuilder
    private var gameOverCard: some View {
        let isDraw = viewModel.gameResult == .draw
        let winner: Connect4Player? = {
            if case .win(let p) = viewModel.gameResult { return p }
            return nil
        }()
        let emoji = isDraw ? "🤝" : "🏆"
        let title: String = {
            if isDraw { return "It's a draw!" }
            guard let p = winner else { return "" }
            return "\(p == .one ? "🔴 Red" : "🟡 Yellow") wins!"
        }()
        let accentColor: Color = isDraw
            ? Color.hubCardBorder
            : (winner == .one ? Color.hubRose : Color.hubAmber)
        let titleColor: Color = isDraw
            ? Color.hubInk
            : (winner == .one ? Color.hubRose : Color.hubAmber)
        let bgColor: Color = isDraw
            ? Color.white
            : (winner == .one ? Color.hubRoseBg : Color.hubAmber.opacity(0.1))

        VStack(spacing: 12) {
            Text(emoji).font(.system(size: 48))
            Text(title).font(.title2.bold()).foregroundStyle(titleColor)
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

    private var playerIndicator: some View {
        HStack(spacing: 6) {
            Text("🔴 Red")
                .foregroundStyle(Color.hubRose)
                .fontWeight(.black)
            Text("vs").foregroundStyle(Color.hubInk.opacity(0.5))
            Text("🟡 Yellow")
                .foregroundStyle(Color.hubAmber)
                .fontWeight(.black)
            Text("• Pass the device").foregroundStyle(Color.hubInk.opacity(0.5))
        }
        .font(.subheadline)
    }
}
