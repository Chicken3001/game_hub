import SwiftUI

struct Connect4BoardView: View {
    let board: [Int]
    let lastMove: Int?
    let interactive: Bool
    let showArrows: Bool
    let onTap: (Int) -> Void

    private let boardBlue = Color(red: 0x25/255, green: 0x63/255, blue: 0xEB/255)     // blue-600
    private let emptyBg = Color(red: 0xF1/255, green: 0xF5/255, blue: 0xF9/255)       // slate-100
    private let red = Color(red: 0xF4/255, green: 0x3F/255, blue: 0x5E/255)           // rose-500
    private let yellow = Color(red: 0xFA/255, green: 0xCC/255, blue: 0x15/255)        // yellow-400
    private let arrowColor = Color(red: 0xFB/255, green: 0x71/255, blue: 0x85/255)    // rose-400

    var body: some View {
        VStack(spacing: 8) {
            HStack(spacing: 6) {
                ForEach(0..<Connect4.cols, id: \.self) { col in
                    let full = Connect4.dropRow(board: board, col: col) == -1
                    ZStack {
                        Text("▼")
                            .font(.system(size: 16, weight: .black))
                            .foregroundStyle(arrowColor)
                            .opacity(showArrows && !full ? 1 : 0)
                    }
                    .frame(maxWidth: .infinity)
                }
            }
            .padding(.horizontal, 8)

            GeometryReader { geo in
                let side = geo.size.width
                let cell = (side - 16 - 6 * CGFloat(Connect4.cols - 1)) / CGFloat(Connect4.cols)
                VStack(spacing: 6) {
                    ForEach(0..<Connect4.rows, id: \.self) { row in
                        HStack(spacing: 6) {
                            ForEach(0..<Connect4.cols, id: \.self) { col in
                                cellView(row: row, col: col, size: cell)
                            }
                        }
                    }
                }
                .padding(8)
                .background(boardBlue)
                .clipShape(RoundedRectangle(cornerRadius: 18))
            }
            .aspectRatio(CGFloat(Connect4.cols) / CGFloat(Connect4.rows), contentMode: .fit)
        }
    }

    @ViewBuilder
    private func cellView(row: Int, col: Int, size: CGFloat) -> some View {
        let idx = row * Connect4.cols + col
        let value = board[idx]
        let colFull = Connect4.dropRow(board: board, col: col) == -1
        let fill: Color = value == 0 ? emptyBg : (value == 1 ? red : yellow)
        let showRing = lastMove == idx && value != 0
        ZStack {
            Circle().fill(fill)
            if showRing {
                Circle().stroke(Color.white.opacity(0.9), lineWidth: 2.5).padding(2)
            }
        }
        .frame(width: size, height: size)
        .contentShape(Rectangle())
        .onTapGesture {
            if interactive && !colFull { onTap(col) }
        }
    }
}
