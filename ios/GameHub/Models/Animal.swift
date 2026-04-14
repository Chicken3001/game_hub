import SwiftUI

struct Animal: Identifiable, Hashable {
    let id = UUID()
    let emoji: String
    let name: String
    let colorHex: String

    var color: Color { Color(hex: colorHex) }
}

struct AnimalSet: Identifiable, Hashable {
    let id: String
    let name: String
    let icon: String
    let animals: [Animal]
}

enum AnimalSets {
    static let all: [AnimalSet] = [
        AnimalSet(id: "farm", name: "Farm Animals", icon: "🐄", animals: [
            Animal(emoji: "🐄", name: "Cow", colorHex: "#7B5C3A"),
            Animal(emoji: "🐷", name: "Pig", colorHex: "#D4607A"),
            Animal(emoji: "🐔", name: "Chicken", colorHex: "#C0811A"),
            Animal(emoji: "🐑", name: "Sheep", colorHex: "#7C9EC0"),
            Animal(emoji: "🐴", name: "Horse", colorHex: "#8B5E3C"),
            Animal(emoji: "🐐", name: "Goat", colorHex: "#7A9A5A"),
        ]),
        AnimalSet(id: "pets", name: "Pets", icon: "🐾", animals: [
            Animal(emoji: "🐶", name: "Dog", colorHex: "#A0522D"),
            Animal(emoji: "🐱", name: "Cat", colorHex: "#E07A30"),
            Animal(emoji: "🐰", name: "Rabbit", colorHex: "#C084C4"),
            Animal(emoji: "🐹", name: "Hamster", colorHex: "#D4A96A"),
            Animal(emoji: "🐠", name: "Fish", colorHex: "#2196F3"),
            Animal(emoji: "🦜", name: "Parrot", colorHex: "#16A34A"),
        ]),
        AnimalSet(id: "zoo", name: "Zoo Animals", icon: "🦁", animals: [
            Animal(emoji: "🦁", name: "Lion", colorHex: "#CA8A04"),
            Animal(emoji: "🐘", name: "Elephant", colorHex: "#6B7FA3"),
            Animal(emoji: "🦒", name: "Giraffe", colorHex: "#D97706"),
            Animal(emoji: "🦓", name: "Zebra", colorHex: "#6B7280"),
            Animal(emoji: "🐒", name: "Monkey", colorHex: "#92400E"),
            Animal(emoji: "🐧", name: "Penguin", colorHex: "#1E40AF"),
        ]),
        AnimalSet(id: "jungle", name: "Jungle Animals", icon: "🐯", animals: [
            Animal(emoji: "🐯", name: "Tiger", colorHex: "#EA580C"),
            Animal(emoji: "🦍", name: "Gorilla", colorHex: "#57534E"),
            Animal(emoji: "🐊", name: "Crocodile", colorHex: "#15803D"),
            Animal(emoji: "🐍", name: "Snake", colorHex: "#0D9488"),
            Animal(emoji: "🐸", name: "Frog", colorHex: "#65A30D"),
            Animal(emoji: "🐆", name: "Leopard", colorHex: "#D97706"),
        ]),
    ]

    static func find(id: String) -> AnimalSet? { all.first { $0.id == id } }
}

enum PairPalette {
    static let colors: [Color] = [
        Color(hex: "#81C784"),
        Color(hex: "#FFB74D"),
        Color(hex: "#F06292"),
        Color(hex: "#64B5F6"),
        Color(hex: "#FFD54F"),
        Color(hex: "#BA68C8"),
    ]

    static func at(_ index: Int) -> Color {
        colors[index % colors.count]
    }
}

extension Color {
    init(hex: String) {
        let trimmed = hex.hasPrefix("#") ? String(hex.dropFirst()) : hex
        var v: UInt64 = 0
        Scanner(string: trimmed).scanHexInt64(&v)
        let r = Double((v >> 16) & 0xFF) / 255
        let g = Double((v >> 8) & 0xFF) / 255
        let b = Double(v & 0xFF) / 255
        self.init(red: r, green: g, blue: b)
    }
}
