import SwiftUI

struct CopyPad: Identifiable, Equatable {
    let id: Int
    let baseColor: Color
    let litColor: Color
    let emoji: String
    let frequency: Double
}

enum CopyPatternConfig {
    static let pads: [CopyPad] = [
        CopyPad(id: 0, baseColor: Color(hex: "#F87171"), litColor: Color(hex: "#FECACA"), emoji: "🦁", frequency: 261.63),
        CopyPad(id: 1, baseColor: Color(hex: "#38BDF8"), litColor: Color(hex: "#BAE6FD"), emoji: "🐠", frequency: 329.63),
        CopyPad(id: 2, baseColor: Color(hex: "#FACC15"), litColor: Color(hex: "#FEF08A"), emoji: "🐤", frequency: 392.00),
        CopyPad(id: 3, baseColor: Color(hex: "#4ADE80"), litColor: Color(hex: "#BBF7D0"), emoji: "🐸", frequency: 523.25),
    ]

    static let padLitDuration: Double = 0.55
    static let padGap: Double = 0.25
    static let startDelay: Double = 0.6
    static let mistakeDelay: Double = 1.1
    static let nextRoundDelay: Double = 0.65
}
