import SwiftUI

private struct BinFrames: Equatable {
    var frames: [ShapeKind: CGRect] = [:]
}

private struct BinFramesKey: PreferenceKey {
    static let defaultValue = BinFrames()
    static func reduce(value: inout BinFrames, nextValue: () -> BinFrames) {
        value.frames.merge(nextValue().frames, uniquingKeysWith: { $1 })
    }
}

struct ShapeSorterView: View {
    @State private var viewModel = ShapeSorterViewModel()
    @State private var binFrames: BinFrames = BinFrames()
    @State private var dragLocation: CGPoint = .zero
    @State private var isDragging: Bool = false

    private let shapeSize: CGFloat = 96
    private let purpleBorder = Color(red: 0xE9/255, green: 0xD5/255, blue: 0xFF/255)
    private let purpleMid = Color(red: 0xA8/255, green: 0x55/255, blue: 0xF7/255)
    private let purpleLight = Color(red: 0xF3/255, green: 0xE8/255, blue: 0xFF/255)
    private let rose = Color(red: 0xEF/255, green: 0x44/255, blue: 0x44/255)
    private let roseBg = Color(red: 0xFE/255, green: 0xE2/255, blue: 0xE2/255)
    private let emerald = Color(red: 0x4A/255, green: 0xDE/255, blue: 0x80/255)
    private let emeraldBg = Color(red: 0xF0/255, green: 0xFD/255, blue: 0xF4/255)

    var body: some View {
        ZStack {
            Color.hubBackground.ignoresSafeArea()
            ScrollView {
                VStack(spacing: 20) {
                    if viewModel.gameWon {
                        winCard
                    } else {
                        progressBar
                        dropZone
                        binsRow
                    }
                }
                .padding(20)
            }

            if isDragging, let shape = viewModel.currentShape {
                ShapeIcon(kind: shape, size: shapeSize, outline: false)
                    .shadow(color: .black.opacity(0.25), radius: 10, x: 0, y: 6)
                    .position(dragLocation)
                    .allowsHitTesting(false)
                    .transition(.identity)
            }
        }
        .navigationTitle("Shape Sorter")
        .navigationBarTitleDisplayMode(.inline)
        .coordinateSpace(name: "shapeSorter")
        .onPreferenceChange(BinFramesKey.self) { binFrames = $0 }
    }

    private var progressBar: some View {
        HStack {
            Text("Shapes sorted")
                .font(.subheadline.bold())
                .foregroundStyle(Color.hubIndigo)
            Spacer()
            HStack(spacing: 4) {
                ForEach(0..<ShapeSorterViewModel.totalShapes, id: \.self) { i in
                    Circle()
                        .fill(i < viewModel.index ? purpleMid : purpleLight)
                        .frame(width: 10, height: 10)
                }
            }
            Text("\(viewModel.index)/\(ShapeSorterViewModel.totalShapes)")
                .font(.subheadline.weight(.black))
                .foregroundStyle(purpleMid)
                .frame(minWidth: 40, alignment: .trailing)
        }
        .padding(.horizontal, 14).padding(.vertical, 10)
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: 18))
        .overlay(RoundedRectangle(cornerRadius: 18).stroke(purpleBorder, lineWidth: 1))
    }

    private var dropZone: some View {
        let wrong = viewModel.shaking
        let correct = viewModel.flashBin != nil
        let borderColor: Color = wrong ? rose : (correct ? emerald : purpleBorder)
        let bgColor: Color = wrong ? roseBg : (correct ? emeraldBg : Color.white)
        let highlight = wrong || correct
        let hint: String = {
            if wrong { return "Not quite — try another bin!" }
            if correct { return "Great job! 🎉" }
            return "Drag to the right bin ↓"
        }()
        let hintColor: Color = wrong ? rose : (correct ? emerald : Color(red: 0xD8/255, green: 0xB4/255, blue: 0xFE/255))

        return ZStack {
            RoundedRectangle(cornerRadius: 22)
                .fill(bgColor)
            RoundedRectangle(cornerRadius: 22)
                .strokeBorder(borderColor, style: StrokeStyle(lineWidth: highlight ? 3 : 2, dash: highlight ? [] : [6, 6]))

            Text(hint)
                .font(.caption.bold())
                .foregroundStyle(hintColor)
                .textCase(.uppercase)
                .frame(maxHeight: .infinity, alignment: .top)
                .padding(.top, 10)

            if let shape = viewModel.currentShape, viewModel.flashBin == nil {
                ShapeIcon(kind: shape, size: shapeSize, outline: false)
                    .opacity(isDragging ? 0 : 1)
                    .gesture(dragGesture)
                    .id(viewModel.index)
            }

            if correct {
                Text("✅")
                    .font(.system(size: 80))
                    .transition(.scale.combined(with: .opacity))
            }
        }
        .frame(height: 176)
        .animation(.easeInOut(duration: 0.2), value: wrong)
        .animation(.easeInOut(duration: 0.2), value: correct)
    }

    private var binsRow: some View {
        HStack(spacing: 8) {
            ForEach(ShapeKind.allCases, id: \.self) { bin in
                VStack(spacing: 6) {
                    ShapeIcon(kind: bin, size: 48, outline: true)
                    Text(bin.label)
                        .font(.system(size: 11, weight: .black))
                        .foregroundStyle(Color(red: 0x43/255, green: 0x38/255, blue: 0xCA/255))
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12).padding(.horizontal, 4)
                .background(
                    RoundedRectangle(cornerRadius: 18)
                        .fill(viewModel.flashBin == bin ? emeraldBg : Color.white)
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 18)
                        .stroke(viewModel.flashBin == bin ? emerald : purpleBorder, lineWidth: 2)
                )
                .scaleEffect(viewModel.flashBin == bin ? 1.08 : 1)
                .animation(.spring(response: 0.25, dampingFraction: 0.6), value: viewModel.flashBin)
                .background(
                    GeometryReader { geo in
                        Color.clear.preference(
                            key: BinFramesKey.self,
                            value: BinFrames(frames: [bin: geo.frame(in: .named("shapeSorter"))])
                        )
                    }
                )
            }
        }
    }

    private var dragGesture: some Gesture {
        DragGesture(minimumDistance: 0, coordinateSpace: .named("shapeSorter"))
            .onChanged { value in
                guard !viewModel.isBusy else { return }
                isDragging = true
                dragLocation = value.location
            }
            .onEnded { value in
                let endPoint = value.location
                isDragging = false
                guard !viewModel.isBusy else { return }
                if let hit = binFrames.frames.first(where: { $0.value.contains(endPoint) })?.key {
                    viewModel.handleDrop(on: hit)
                } else {
                    viewModel.handleMiss()
                }
            }
    }

    private var winCard: some View {
        VStack(spacing: 14) {
            Text("🎉").font(.system(size: 72))
            Text("You sorted them all!")
                .font(.title.bold())
                .foregroundStyle(Color.hubInk)
            Text("Amazing job! ⭐⭐⭐")
                .font(.headline)
                .foregroundStyle(purpleMid)
            Button {
                viewModel.reset()
            } label: {
                Text("🔄 Play Again!")
                    .font(.headline.bold())
                    .foregroundStyle(.white)
                    .padding(.horizontal, 24).padding(.vertical, 12)
                    .background(Color.hubIndigo)
                    .clipShape(Capsule())
            }
            .padding(.top, 6)
        }
        .padding(28)
        .frame(maxWidth: .infinity)
        .background(
            LinearGradient(
                colors: [purpleLight, Color(red: 0xED/255, green: 0xE9/255, blue: 0xFE/255)],
                startPoint: .topLeading, endPoint: .bottomTrailing
            )
        )
        .clipShape(RoundedRectangle(cornerRadius: 28))
        .overlay(RoundedRectangle(cornerRadius: 28).stroke(Color(red: 0xD8/255, green: 0xB4/255, blue: 0xFE/255), lineWidth: 2))
    }
}
