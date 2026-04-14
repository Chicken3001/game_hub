import SwiftUI

struct CardFramePreference: Equatable {
    var frames: [CardRef: CGRect] = [:]
}

struct CardFrameKey: PreferenceKey {
    static let defaultValue = CardFramePreference()
    static func reduce(value: inout CardFramePreference, nextValue: () -> CardFramePreference) {
        let next = nextValue()
        for (k, v) in next.frames { value.frames[k] = v }
    }
}

struct AnimalMatchGameView: View {
    @State private var viewModel: AnimalMatchViewModel

    @State private var cardFrames: [CardRef: CGRect] = [:]
    @State private var dragOrigin: CGPoint?
    @State private var dragCurrent: CGPoint?

    init(set: AnimalSet) {
        _viewModel = State(initialValue: AnimalMatchViewModel(set: set))
    }

    var body: some View {
        ZStack {
            Color.hubBackground.ignoresSafeArea()

            VStack(spacing: 12) {
                statsBar
                if let sel = viewModel.selected {
                    Text("✨ \(viewModel.animal(for: sel).name) selected — now tap its match!")
                        .font(.subheadline.bold())
                        .foregroundStyle(Color.hubAmber)
                        .multilineTextAlignment(.center)
                }

                gameArea

                Spacer(minLength: 0)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)

            if viewModel.isWon {
                WinCelebrationView(tries: viewModel.tries) {
                    viewModel.reset()
                }
                .transition(.opacity.combined(with: .scale))
            }
        }
        .navigationTitle(viewModel.set.name)
        .navigationBarTitleDisplayMode(.inline)
        .animation(.easeInOut(duration: 0.25), value: viewModel.isWon)
    }

    private var statsBar: some View {
        HStack {
            Text("✅ \(viewModel.matched.count)/\(viewModel.pairCount)  ·  🎯 \(viewModel.tries) tries")
                .font(.headline)
                .foregroundStyle(Color.hubInk)
            Spacer()
            Button {
                viewModel.reset()
            } label: {
                Text("Shuffle 🔄")
                    .font(.subheadline.bold())
                    .padding(.horizontal, 14)
                    .padding(.vertical, 8)
                    .background(Color.hubAccent.opacity(0.12))
                    .foregroundStyle(Color.hubAccent)
                    .clipShape(Capsule())
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .background(Color.hubCardBg)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color.hubCardBorder, lineWidth: 1.5)
        )
    }

    private var gameArea: some View {
        HStack(alignment: .top, spacing: 24) {
            columnView(side: .left, cards: viewModel.leftCards)
            columnView(side: .right, cards: viewModel.rightCards)
        }
        .frame(maxWidth: .infinity, alignment: .top)
        .padding(.vertical, 8)
        .coordinateSpace(name: "gameArea")
        .onPreferenceChange(CardFrameKey.self) { pref in
            cardFrames = pref.frames
        }
        .overlay {
            MatchLinesCanvas(
                frames: cardFrames,
                matched: viewModel.matched,
                dragOrigin: dragOrigin,
                dragCurrent: dragCurrent
            )
            .allowsHitTesting(false)
        }
    }

    @ViewBuilder
    private func columnView(side: CardSide, cards: [Animal]) -> some View {
        VStack(spacing: 10) {
            ForEach(Array(cards.enumerated()), id: \.offset) { idx, animal in
                let ref = CardRef(side: side, index: idx)
                AnimalCardView(
                    animal: animal,
                    isSelected: viewModel.selected == ref,
                    isMatched: viewModel.isMatched(ref),
                    isWrong: viewModel.isWrong(ref),
                    matchColor: viewModel.matchedColor(for: ref)
                )
                .background(
                    GeometryReader { geo in
                        Color.clear.preference(
                            key: CardFrameKey.self,
                            value: CardFramePreference(frames: [ref: geo.frame(in: .named("gameArea"))])
                        )
                    }
                )
                .gesture(cardGesture(for: ref))
            }
        }
    }

    private func cardGesture(for ref: CardRef) -> some Gesture {
        DragGesture(minimumDistance: 0, coordinateSpace: .named("gameArea"))
            .onChanged { value in
                if viewModel.isMatched(ref) { return }

                if dragOrigin == nil {
                    if let frame = cardFrames[ref] {
                        dragOrigin = CGPoint(x: frame.midX, y: frame.midY)
                    }
                    if viewModel.selected != ref {
                        viewModel.selected = ref
                    }
                }
                dragCurrent = value.location
            }
            .onEnded { value in
                defer {
                    dragOrigin = nil
                    dragCurrent = nil
                }
                if viewModel.isMatched(ref) { return }

                let translation = value.translation
                let moved = hypot(translation.width, translation.height)

                if moved < 8 {
                    // Treated as a tap.
                    viewModel.handleTap(ref)
                    return
                }

                // Drag — find card under release point.
                if let hit = cardFrames.first(where: { _, frame in frame.contains(value.location) })?.key {
                    if hit == ref {
                        // Released on same card — keep selected.
                        return
                    }
                    viewModel.handleDragEnd(from: ref, to: hit)
                } else {
                    viewModel.selected = nil
                }
            }
    }
}

struct AnimalCardView: View {
    let animal: Animal
    let isSelected: Bool
    let isMatched: Bool
    let isWrong: Bool
    let matchColor: Color?

    var body: some View {
        VStack(spacing: 2) {
            Text(animal.emoji)
                .font(.system(size: 30))
            Text(animal.name)
                .font(.caption.bold())
                .foregroundStyle(nameColor)
            if isMatched {
                Text("✓")
                    .font(.caption2.bold())
                    .foregroundStyle(Color.hubEmerald)
            }
        }
        .frame(width: 84, height: 76)
        .background(fillColor)
        .overlay(
            RoundedRectangle(cornerRadius: 18)
                .stroke(borderColor, lineWidth: 3)
        )
        .clipShape(RoundedRectangle(cornerRadius: 18))
        .shadow(color: shadowColor, radius: 8, y: 2)
        .scaleEffect(isSelected ? 1.08 : 1)
        .modifier(WrongShake(active: isWrong))
        .opacity(isMatched ? 0.9 : 1)
        .animation(.spring(response: 0.3, dampingFraction: 0.7), value: isSelected)
        .animation(.easeInOut(duration: 0.3), value: isMatched)
    }

    private var nameColor: Color {
        if let c = matchColor { return c }
        return animal.color
    }

    private var borderColor: Color {
        if let c = matchColor { return c }
        if isSelected { return Color.hubAmber }
        if isWrong { return Color.hubRose }
        return Color.hubCardBorder
    }

    private var fillColor: Color {
        if let c = matchColor { return c.opacity(0.18) }
        if isWrong { return Color.hubRoseBg }
        if isSelected { return Color.hubAmberBg }
        return Color.hubCardBg
    }

    private var shadowColor: Color {
        if isSelected { return Color.hubAmber.opacity(0.35) }
        if let c = matchColor { return c.opacity(0.25) }
        return Color.hubAccent.opacity(0.1)
    }
}

private struct WrongShake: ViewModifier {
    let active: Bool
    @State private var offset: CGFloat = 0

    func body(content: Content) -> some View {
        content
            .offset(x: offset)
            .onChange(of: active) { _, newValue in
                guard newValue else { return }
                withAnimation(.linear(duration: 0.08)) { offset = -6 }
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.08) {
                    withAnimation(.linear(duration: 0.08)) { offset = 6 }
                }
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.16) {
                    withAnimation(.linear(duration: 0.08)) { offset = -4 }
                }
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.24) {
                    withAnimation(.linear(duration: 0.08)) { offset = 0 }
                }
            }
    }
}

struct MatchLinesCanvas: View {
    let frames: [CardRef: CGRect]
    let matched: [MatchedPair]
    let dragOrigin: CGPoint?
    let dragCurrent: CGPoint?

    var body: some View {
        Canvas { context, _ in
            for pair in matched {
                let leftRef = CardRef(side: .left, index: pair.leftIdx)
                let rightRef = CardRef(side: .right, index: pair.rightIdx)
                guard let lf = frames[leftRef], let rf = frames[rightRef] else { continue }
                let p1 = CGPoint(x: lf.midX, y: lf.midY)
                let p2 = CGPoint(x: rf.midX, y: rf.midY)
                var path = Path()
                path.move(to: p1)
                path.addLine(to: p2)
                context.stroke(
                    path,
                    with: .color(pair.color),
                    style: StrokeStyle(lineWidth: 6, lineCap: .round)
                )
            }

            if let origin = dragOrigin, let current = dragCurrent {
                var path = Path()
                path.move(to: origin)
                path.addLine(to: current)
                context.stroke(
                    path,
                    with: .color(Color.hubAmber.opacity(0.85)),
                    style: StrokeStyle(lineWidth: 4, lineCap: .round, dash: [10, 7])
                )
            }
        }
    }
}
