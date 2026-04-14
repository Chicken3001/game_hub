import SwiftUI

extension Color {
    static let hubBackground = Color(red: 245/255, green: 243/255, blue: 255/255)
    static let hubCardBg = Color.white
    static let hubCardBorder = Color(red: 224/255, green: 217/255, blue: 255/255)
    static let hubAccent = Color(red: 139/255, green: 92/255, blue: 246/255)
    static let hubAccentDeep = Color(red: 124/255, green: 58/255, blue: 237/255)
    static let hubIndigo = Color(red: 79/255, green: 70/255, blue: 229/255)
    static let hubInk = Color(red: 49/255, green: 46/255, blue: 129/255)
    static let hubAmber = Color(red: 251/255, green: 191/255, blue: 36/255)
    static let hubAmberBg = Color(red: 254/255, green: 249/255, blue: 195/255)
    static let hubRose = Color(red: 239/255, green: 68/255, blue: 68/255)
    static let hubRoseBg = Color(red: 254/255, green: 226/255, blue: 226/255)
    static let hubEmerald = Color(red: 16/255, green: 185/255, blue: 129/255)
}

extension View {
    func hubCard() -> some View {
        self
            .padding(20)
            .background(Color.hubCardBg)
            .clipShape(RoundedRectangle(cornerRadius: 20))
            .overlay(
                RoundedRectangle(cornerRadius: 20)
                    .stroke(Color.hubCardBorder, lineWidth: 2)
            )
            .shadow(color: Color.hubAccent.opacity(0.1), radius: 12, y: 4)
    }
}
