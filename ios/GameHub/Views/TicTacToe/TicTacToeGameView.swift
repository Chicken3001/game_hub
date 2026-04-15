import SwiftUI

struct TicTacToeGameView: View {
    @State private var viewModel = TicTacToeViewModel()

    var body: some View {
        ZStack {
            Color.hubBackground.ignoresSafeArea()
            ScrollView {
                VStack(spacing: 20) {
                    switch viewModel.phase {
                    case .chooseOrder: orderPicker
                    case .playing: gameArea
                    }
                }
                .padding(20)
            }
        }
        .navigationTitle("Tic-Tac-Toe")
        .navigationBarTitleDisplayMode(.inline)
    }

    private var orderPicker: some View {
        VStack(spacing: 14) {
            Text("Who goes first?")
                .font(.headline)
                .foregroundStyle(Color.hubAccent)
                .padding(.top, 8)
            Button {
                viewModel.selectOrder(goFirst: true)
            } label: {
                VStack(alignment: .leading, spacing: 4) {
                    Text("❌ You go first")
                        .font(.title3.bold())
                        .foregroundStyle(.white)
                    Text("You play X and make the first move")
                        .font(.subheadline)
                        .foregroundStyle(.white.opacity(0.85))
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(20)
                .background(Color.hubIndigo)
                .clipShape(RoundedRectangle(cornerRadius: 20))
            }
            Button {
                viewModel.selectOrder(goFirst: false)
            } label: {
                VStack(alignment: .leading, spacing: 4) {
                    Text("🤖 Computer goes first")
                        .font(.title3.bold())
                        .foregroundStyle(Color.hubInk)
                    Text("You play O and respond")
                        .font(.subheadline)
                        .foregroundStyle(Color.hubAccent)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .hubCard()
            }
        }
    }

    private var gameArea: some View {
        VStack(spacing: 18) {
            statusText
            boardGrid
            if viewModel.gameOver { gameOverCard }
            symbolIndicator
        }
    }

    @ViewBuilder
    private var statusText: some View {
        if !viewModel.gameOver {
            Text(viewModel.isComputerTurn ? "🤖 Computer is thinking…" : "🎯 Your turn!")
                .font(.title3.bold())
                .foregroundStyle(viewModel.isComputerTurn ? Color.hubAccent.opacity(0.7) : Color.hubIndigo)
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
        let disabled = viewModel.isComputerTurn || viewModel.gameOver || cell != .empty
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
        .disabled(disabled)
        .buttonStyle(.plain)
    }

    @ViewBuilder
    private var gameOverCard: some View {
        let iWon: Bool = {
            if case .win(let s) = viewModel.winner { return s == viewModel.mySymbol }
            return false
        }()
        let isDraw = viewModel.winner == .draw
        let emoji = isDraw ? "🤝" : (iWon ? "🏆" : "🤖")
        let title = isDraw ? "It's a draw!" : (iWon ? "You win!" : "Computer wins!")
        let borderColor: Color = isDraw ? Color.hubCardBorder : (iWon ? Color.hubEmerald : Color.hubRose)
        let titleColor: Color = isDraw ? Color.hubInk : (iWon ? Color.hubEmerald : Color.hubRose)
        let bgColor: Color = isDraw ? Color.hubCardBg : (iWon ? Color.hubEmerald.opacity(0.1) : Color.hubRoseBg)

        VStack(spacing: 12) {
            Text(emoji).font(.system(size: 48))
            Text(title)
                .font(.title2.bold())
                .foregroundStyle(titleColor)
            HStack(spacing: 10) {
                Button { viewModel.replay() } label: {
                    Text("🔄 Play Again")
                        .font(.subheadline.bold())
                        .padding(.horizontal, 16).padding(.vertical, 10)
                        .background(Color.hubEmerald)
                        .foregroundStyle(.white)
                        .clipShape(Capsule())
                }
                Button { viewModel.changeOrder() } label: {
                    Text("Change Order")
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
        .overlay(RoundedRectangle(cornerRadius: 22).stroke(borderColor, lineWidth: 2))
    }

    private var symbolIndicator: some View {
        let mine = viewModel.mySymbol
        let ai = viewModel.aiSymbol
        return HStack(spacing: 6) {
            Text("You")
                .foregroundStyle(Color.hubInk.opacity(0.7))
            Text(mine == .x ? "❌ X" : "⭕ O")
                .foregroundStyle(mine == .x ? Color.hubIndigo : Color.hubRose)
                .fontWeight(.black)
            Text("vs").foregroundStyle(Color.hubInk.opacity(0.5))
            Text("🤖").fontWeight(.black)
            Text("(\(ai == .x ? "❌ X" : "⭕ O"))")
                .foregroundStyle(ai == .x ? Color.hubIndigo : Color.hubRose)
                .fontWeight(.black)
        }
        .font(.subheadline)
    }
}
