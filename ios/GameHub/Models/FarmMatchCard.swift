import SwiftUI

struct FarmMatchAnimal: Hashable, Sendable {
    let emoji: String
    let bg: Color
    let border: Color
}

enum FarmMatch {
    static let animals: [FarmMatchAnimal] = [
        .init(emoji: "🐄", bg: .init(hex: "#d1fae5"), border: .init(hex: "#34d399")),
        .init(emoji: "🐷", bg: .init(hex: "#fce7f3"), border: .init(hex: "#f472b6")),
        .init(emoji: "🐔", bg: .init(hex: "#fef9c3"), border: .init(hex: "#facc15")),
        .init(emoji: "🐑", bg: .init(hex: "#dbeafe"), border: .init(hex: "#60a5fa")),
        .init(emoji: "🐴", bg: .init(hex: "#ede9fe"), border: .init(hex: "#a78bfa")),
        .init(emoji: "🐕", bg: .init(hex: "#ffedd5"), border: .init(hex: "#fb923c")),
        .init(emoji: "🐈", bg: .init(hex: "#f5f3ff"), border: .init(hex: "#c4b5fd")),
        .init(emoji: "🐇", bg: .init(hex: "#fdf2f8"), border: .init(hex: "#f0abfc")),
        .init(emoji: "🦊", bg: .init(hex: "#fff7ed"), border: .init(hex: "#fdba74")),
        .init(emoji: "🐻", bg: .init(hex: "#fef3c7"), border: .init(hex: "#d97706")),
        .init(emoji: "🐼", bg: .init(hex: "#f0fdf4"), border: .init(hex: "#86efac")),
        .init(emoji: "🐨", bg: .init(hex: "#f0f9ff"), border: .init(hex: "#7dd3fc")),
        .init(emoji: "🦁", bg: .init(hex: "#fffbeb"), border: .init(hex: "#fbbf24")),
        .init(emoji: "🐯", bg: .init(hex: "#fff7ed"), border: .init(hex: "#fb923c")),
        .init(emoji: "🦒", bg: .init(hex: "#fefce8"), border: .init(hex: "#fde047")),
        .init(emoji: "🐘", bg: .init(hex: "#f1f5f9"), border: .init(hex: "#94a3b8")),
        .init(emoji: "🐸", bg: .init(hex: "#f0fdf4"), border: .init(hex: "#4ade80")),
        .init(emoji: "🦋", bg: .init(hex: "#faf5ff"), border: .init(hex: "#d8b4fe")),
        .init(emoji: "🐢", bg: .init(hex: "#ecfdf5"), border: .init(hex: "#34d399")),
        .init(emoji: "🦜", bg: .init(hex: "#fff1f2"), border: .init(hex: "#fb7185")),
        .init(emoji: "🦆", bg: .init(hex: "#ecfeff"), border: .init(hex: "#22d3ee")),
        .init(emoji: "🐬", bg: .init(hex: "#eff6ff"), border: .init(hex: "#60a5fa")),
        .init(emoji: "🐙", bg: .init(hex: "#fdf4ff"), border: .init(hex: "#e879f9")),
        .init(emoji: "🦀", bg: .init(hex: "#fff1f2"), border: .init(hex: "#f87171")),
    ]

    static func animal(for emoji: String) -> FarmMatchAnimal {
        animals.first(where: { $0.emoji == emoji }) ?? animals[0]
    }
}
