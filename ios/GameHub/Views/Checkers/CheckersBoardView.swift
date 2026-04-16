import SwiftUI

struct CheckersBoardView: View {
    let board: [Int]
    let selectedPiece: Int?
    let mustContinueFrom: Int?
    let validDestinations: Set<Int>
    let forcedPieces: Set<Int>
    let lastMove: (from: Int, to: Int)?
    let flip: Bool
    let interactive: Bool
    let onTap: (Int) -> Void

    private let boardBrown = Color(red: 0x78/255, green: 0x35/255, blue: 0x0F/255) // amber-900
    private let light = Color(red: 0xFE/255, green: 0xF3/255, blue: 0xC7/255) // amber-100
    private let dark = Color(red: 0x92/255, green: 0x40/255, blue: 0x0E/255) // amber-800
    private let darkHint = Color(red: 0xB4/255, green: 0x53/255, blue: 0x09/255) // amber-700
    private let darkDest = Color(red: 0xD9/255, green: 0x77/255, blue: 0x06/255) // amber-600
    private let goldDot = Color(red: 0xFD/255, green: 0xE0/255, blue: 0x47/255) // yellow-300
    private let redPiece = Color(red: 0xF4/255, green: 0x3F/255, blue: 0x5E/255) // rose-500
    private let redPieceBorder = Color(red: 0xBE/255, green: 0x12/255, blue: 0x3C/255) // rose-700
    private let blackPiece = Color(red: 0x1E/255, green: 0x29/255, blue: 0x3B/255) // slate-800
    private let blackPieceBorder = Color(red: 0x47/255, green: 0x55/255, blue: 0x69/255) // slate-600
    private let crown = Color(red: 0xFD/255, green: 0xE0/255, blue: 0x47/255)
    private let greenRing = Color(red: 0x4A/255, green: 0xDE/255, blue: 0x80/255) // green-400

    private func displayIndex(_ i: Int) -> Int {
        flip ? 63 - i : i
    }

    var body: some View {
        GeometryReader { geo in
            let side = min(geo.size.width, geo.size.height)
            let cell = side / 8
            VStack(spacing: 0) {
                ForEach(0..<8, id: \.self) { row in
                    HStack(spacing: 0) {
                        ForEach(0..<8, id: \.self) { col in
                            let visualIdx = row * 8 + col
                            let boardIdx = displayIndex(visualIdx)
                            cellView(boardIdx: boardIdx, size: cell)
                        }
                    }
                }
            }
            .frame(width: side, height: side)
            .background(boardBrown)
            .clipShape(RoundedRectangle(cornerRadius: 14))
            .padding(4)
            .background(boardBrown)
            .clipShape(RoundedRectangle(cornerRadius: 18))
            .frame(maxWidth: .infinity)
        }
        .aspectRatio(1, contentMode: .fit)
    }

    @ViewBuilder
    private func cellView(boardIdx i: Int, size: CGFloat) -> some View {
        let (r, c) = Checkers.rowCol(i)
        let isDark = (r + c) % 2 == 1
        let cellValue = board[i]
        let owner: CheckersPlayer? = cellValue == 0 ? nil : ((cellValue == 1 || cellValue == 3) ? .one : .two)
        let king = Checkers.isKing(cellValue)
        let isSelected = selectedPiece == i || mustContinueFrom == i
        let isValidDest = validDestinations.contains(i)
        let isForcedPiece = !isSelected && forcedPieces.contains(i)
        let isLastFrom = lastMove?.from == i && cellValue == 0
        let squareBg: Color = {
            if !isDark { return light }
            if isValidDest { return darkDest }
            if isLastFrom { return darkHint }
            return dark
        }()

        ZStack {
            Rectangle().fill(squareBg)
            if isDark && isValidDest && cellValue == 0 {
                Circle().fill(goldDot.opacity(0.8)).frame(width: 10, height: 10)
            }
            if isValidDest && isDark {
                Rectangle()
                    .stroke(goldDot, lineWidth: 2)
                    .padding(1)
            }
            if cellValue != 0, let owner = owner {
                pieceView(owner: owner, king: king, isSelected: isSelected,
                          isForcedPiece: isForcedPiece, isValidDest: isValidDest,
                          isLastTo: lastMove?.to == i)
                    .padding(size * 0.09)
            }
        }
        .frame(width: size, height: size)
        .contentShape(Rectangle())
        .onTapGesture {
            if interactive { onTap(i) }
        }
    }

    private func pieceView(
        owner: CheckersPlayer, king: Bool, isSelected: Bool,
        isForcedPiece: Bool, isValidDest: Bool, isLastTo: Bool
    ) -> some View {
        let fill = owner == .one ? redPiece : blackPiece
        let border = owner == .one ? redPieceBorder : blackPieceBorder
        let ringColor: Color? = {
            if isSelected { return goldDot }
            if isForcedPiece { return greenRing }
            if isLastTo { return Color.white.opacity(0.85) }
            if isValidDest { return goldDot }
            return nil
        }()
        let ringWidth: CGFloat = isSelected || isForcedPiece ? 3.5 : (isLastTo || isValidDest ? 2 : 0)

        return ZStack {
            Circle().fill(fill)
            Circle().stroke(border, lineWidth: 2)
            if let ring = ringColor, ringWidth > 0 {
                Circle().stroke(ring, lineWidth: ringWidth).padding(-1)
            }
            if king {
                Text("♛")
                    .font(.system(size: 18, weight: .black))
                    .foregroundStyle(crown)
            }
        }
        .shadow(color: .black.opacity(0.25), radius: 2, x: 0, y: 1)
    }
}
