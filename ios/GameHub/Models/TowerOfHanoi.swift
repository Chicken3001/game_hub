import SwiftUI

enum TowerOfHanoiConfig {
    static let minRings: Int = 3
    static let maxRings: Int = 8
    static let ringHeight: CGFloat = 22
    static let ringMinWidthFraction: CGFloat = 0.30
    static let ringMaxWidthFraction: CGFloat = 0.95

    static func optimalMoves(_ rings: Int) -> Int {
        // 2^n - 1
        return (1 << rings) - 1
    }

    static func ringWidthFraction(size: Int, total: Int) -> CGFloat {
        guard total > 1 else { return ringMaxWidthFraction }
        let t = CGFloat(size - 1) / CGFloat(total - 1)
        return ringMinWidthFraction + t * (ringMaxWidthFraction - ringMinWidthFraction)
    }

    static func ringColor(size: Int, total: Int) -> Color {
        let t = Double(size - 1) / Double(max(total - 1, 1))
        let hue = 12.0 + t * 300.0
        return Color(hue: hue / 360.0, saturation: 0.78, brightness: 0.92)
    }
}
