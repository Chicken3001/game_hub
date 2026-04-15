import SwiftUI

enum ShapeKind: String, CaseIterable, Equatable, Hashable, Sendable {
    case circle, square, triangle, star

    var label: String {
        switch self {
        case .circle: return "Circle"
        case .square: return "Square"
        case .triangle: return "Triangle"
        case .star: return "Star"
        }
    }

    var color: Color {
        switch self {
        case .circle:   return Color(red: 0xFF/255, green: 0x6B/255, blue: 0x6B/255)
        case .square:   return Color(red: 0x4E/255, green: 0xCD/255, blue: 0xC4/255)
        case .triangle: return Color(red: 0x95/255, green: 0xE7/255, blue: 0x7E/255)
        case .star:     return Color(red: 0xFF/255, green: 0xD9/255, blue: 0x3D/255)
        }
    }
}

struct TriangleShape: Shape {
    func path(in rect: CGRect) -> Path {
        var p = Path()
        p.move(to: CGPoint(x: rect.midX, y: rect.minY + rect.height * 0.08))
        p.addLine(to: CGPoint(x: rect.maxX - rect.width * 0.06, y: rect.maxY - rect.height * 0.1))
        p.addLine(to: CGPoint(x: rect.minX + rect.width * 0.06, y: rect.maxY - rect.height * 0.1))
        p.closeSubpath()
        return p
    }
}

struct StarShape: Shape {
    func path(in rect: CGRect) -> Path {
        let pts: [(CGFloat, CGFloat)] = [
            (50, 5), (61, 35), (93, 36), (67, 56), (77, 86),
            (50, 68), (24, 86), (33, 56), (7, 36), (39, 35)
        ]
        let sx = rect.width / 100, sy = rect.height / 100
        var p = Path()
        for (i, pt) in pts.enumerated() {
            let cg = CGPoint(x: rect.minX + pt.0 * sx, y: rect.minY + pt.1 * sy)
            if i == 0 { p.move(to: cg) } else { p.addLine(to: cg) }
        }
        p.closeSubpath()
        return p
    }
}

struct ShapeIcon: View {
    let kind: ShapeKind
    let size: CGFloat
    let outline: Bool

    var body: some View {
        let color = kind.color
        Group {
            switch kind {
            case .circle:
                if outline { Circle().stroke(color, lineWidth: 5).padding(4) }
                else { Circle().fill(color) }
            case .square:
                if outline { RoundedRectangle(cornerRadius: 10).stroke(color, lineWidth: 5).padding(4) }
                else { RoundedRectangle(cornerRadius: 10).fill(color) }
            case .triangle:
                if outline { TriangleShape().stroke(color, style: StrokeStyle(lineWidth: 5, lineJoin: .round)) }
                else { TriangleShape().fill(color) }
            case .star:
                if outline { StarShape().stroke(color, style: StrokeStyle(lineWidth: 5, lineJoin: .round)) }
                else { StarShape().fill(color) }
            }
        }
        .frame(width: size, height: size)
    }
}
