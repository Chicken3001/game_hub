import SwiftUI

struct Bubble: Identifiable, Equatable {
    let id: Int
    let emoji: String
    let color: Color
    let size: CGFloat
    let leftFraction: CGFloat
    let duration: Double
    let spawnedAt: Date
}

struct Burst: Identifiable, Equatable {
    let id: Int
    let x: CGFloat
    let y: CGFloat
    let emoji: String
}

enum BubbleConfig {
    static let emojis = ["🐶", "🐱", "🐭", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐧", "🦆", "🐙", "🦋", "🌸", "⭐", "🍓"]

    static let colors: [Color] = [
        Color(hex: "#fde68a"), Color(hex: "#fca5a5"), Color(hex: "#a5f3fc"),
        Color(hex: "#bbf7d0"), Color(hex: "#ddd6fe"), Color(hex: "#fed7aa"),
        Color(hex: "#f9a8d4"), Color(hex: "#bae6fd"),
    ]

    static let gameDuration: Int = 30
    static let spawnInterval: Double = 1.2
    static let speedMin: Double = 5.0
    static let speedMax: Double = 8.0
}
