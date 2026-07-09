import SwiftUI

enum LifePalette {
    /// One car colour per seat.
    static let seatColors: [Color] = [
        Color(hex: "#EF4444"), // red
        Color(hex: "#3B82F6"), // blue
        Color(hex: "#10B981"), // green
        Color(hex: "#F59E0B"), // amber
    ]

    static func color(seat: Int) -> Color {
        seatColors[seat % seatColors.count]
    }

    static func tint(for kind: LifeTile.Kind) -> Color {
        switch kind {
        case .start: return Color(hex: "#94A3B8")
        case .payday: return Color(hex: "#22C55E")
        case .event: return Color(hex: "#A78BFA")
        case .marriage: return Color(hex: "#F472B6")
        case .baby: return Color(hex: "#38BDF8")
        case .house: return Color(hex: "#FB923C")
        case .retire: return Color(hex: "#FACC15")
        }
    }
}

struct LifeBoardView: View {
    let players: [LifePlayerState]
    let currentTurn: Int

    private var collegePlayers: [LifePlayerState] {
        players.filter { $0.path == .college }
    }
    private var showCollegeLane: Bool { !collegePlayers.isEmpty }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            if showCollegeLane {
                lane(
                    title: "🎓 College",
                    tiles: LifeBoard.collegeTiles,
                    path: .college,
                    anchorId: "college"
                )
            }
            lane(
                title: "🚦 Career Path",
                tiles: LifeBoard.mainTiles,
                path: .career,
                anchorId: "career"
            )
        }
    }

    @ViewBuilder
    private func lane(title: String, tiles: [LifeTile], path: LifePath, anchorId: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title)
                .font(.caption.bold())
                .foregroundStyle(Color.hubAccent)

            ScrollViewReader { proxy in
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(Array(tiles.enumerated()), id: \.offset) { index, tile in
                            tileChip(
                                tile: tile,
                                occupants: players.filter { $0.path == path && $0.pos == index }
                            )
                            .id("\(anchorId)-\(index)")
                        }
                    }
                    .padding(.horizontal, 4)
                    .padding(.vertical, 6)
                }
                .onChange(of: currentTurn) { _, _ in scroll(proxy, path: path, anchorId: anchorId) }
                .onAppear { scroll(proxy, path: path, anchorId: anchorId) }
            }
        }
    }

    private func scroll(_ proxy: ScrollViewProxy, path: LifePath, anchorId: String) {
        guard let p = players.first(where: { $0.seat == currentTurn }), p.path == path else { return }
        withAnimation(.easeInOut(duration: 0.35)) {
            proxy.scrollTo("\(anchorId)-\(p.pos)", anchor: .center)
        }
    }

    private func tileChip(tile: LifeTile, occupants: [LifePlayerState]) -> some View {
        let tint = LifePalette.tint(for: tile.kind)
        return VStack(spacing: 4) {
            // Pegs riding on this tile.
            HStack(spacing: -6) {
                ForEach(occupants) { p in
                    LifeCarBadge(seat: p.seat, pegs: p.pegCount)
                }
            }
            .frame(height: 22)

            VStack(spacing: 2) {
                Text(tile.emoji).font(.system(size: 20))
                Text(tile.title)
                    .font(.system(size: 9, weight: .bold))
                    .foregroundStyle(Color.hubInk)
                    .lineLimit(2)
                    .multilineTextAlignment(.center)
                    .frame(height: 22)
                if tile.kind == .event && tile.amount != 0 {
                    Text(LifeEngine.money(tile.amount))
                        .font(.system(size: 9, weight: .black))
                        .foregroundStyle(tile.amount > 0 ? Color.hubEmerald : Color.hubRose)
                } else if tile.kind == .payday {
                    Text("salary")
                        .font(.system(size: 9, weight: .black))
                        .foregroundStyle(Color.hubEmerald)
                } else {
                    Text(" ").font(.system(size: 9))
                }
            }
            .frame(width: 64)
            .padding(.vertical, 8)
            .background(tint.opacity(0.15))
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(tint.opacity(0.55), lineWidth: 1.5)
            )
        }
    }
}

/// A little car showing how many pegs are riding along.
struct LifeCarBadge: View {
    let seat: Int
    let pegs: Int

    var body: some View {
        HStack(spacing: 2) {
            Text("🚗").font(.system(size: 11))
            if pegs > 1 {
                Text("\(pegs)")
                    .font(.system(size: 9, weight: .black))
                    .foregroundStyle(.white)
            }
        }
        .padding(.horizontal, 5)
        .padding(.vertical, 3)
        .background(LifePalette.color(seat: seat))
        .clipShape(Capsule())
        .overlay(Capsule().stroke(.white, lineWidth: 1.5))
        .shadow(color: .black.opacity(0.15), radius: 2, y: 1)
    }
}
