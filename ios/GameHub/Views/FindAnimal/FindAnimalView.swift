import SwiftUI

struct FindAnimalView: View {
    @State private var viewModel = FindAnimalViewModel()

    var body: some View {
        ZStack {
            Color.hubBackground.ignoresSafeArea()
            ScrollView {
                content
                    .padding(18)
            }
        }
        .navigationTitle("Find the Animal")
        .navigationBarTitleDisplayMode(.inline)
    }

    @ViewBuilder
    private var content: some View {
        if viewModel.phase == .win {
            winCard
        } else if let target = viewModel.target {
            VStack(spacing: 16) {
                progressDots
                promptCard(target: target)
                choiceGrid(target: target)
            }
        } else {
            Text("Getting ready… 🎮")
                .font(.title3.bold())
                .foregroundStyle(Color.hubAccent.opacity(0.6))
                .frame(maxWidth: .infinity)
                .padding(.top, 60)
        }
    }

    private var progressDots: some View {
        HStack(spacing: 8) {
            ForEach(0..<FindAnimalViewModel.roundCount, id: \.self) { i in
                Circle()
                    .fill(dotColor(i: i))
                    .frame(width: 12, height: 12)
            }
        }
    }

    private func dotColor(i: Int) -> Color {
        if i < viewModel.roundIdx { return Color.hubEmerald }
        if i == viewModel.roundIdx { return Color(red: 0xF9/255, green: 0x73/255, blue: 0x16/255) } // orange-500
        return Color.hubCardBorder
    }

    private func promptCard(target: FindAnimal) -> some View {
        let isCorrect = viewModel.phase == .correct
        let isWrong = viewModel.phase == .wrong
        let borderColor: Color = isCorrect ? Color.hubEmerald : (isWrong ? Color.hubRose : Color.hubCardBorder)
        let bgColor: Color = isCorrect
            ? Color.hubEmerald.opacity(0.15)
            : (isWrong ? Color.hubRoseBg : Color.white)

        return VStack(spacing: 6) {
            Text("Find the animal!")
                .font(.subheadline.bold())
                .foregroundStyle(Color.hubIndigo)
            Text(target.emoji)
                .font(.system(size: 72))
            Text(target.name)
                .font(.title.bold())
                .foregroundStyle(Color.hubInk)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 20).padding(.horizontal, 16)
        .background(bgColor)
        .clipShape(RoundedRectangle(cornerRadius: 22))
        .overlay(RoundedRectangle(cornerRadius: 22).stroke(borderColor, lineWidth: 2))
        .modifier(ShakeEffect(animatableData: CGFloat(viewModel.wrongShakeCount)))
        .animation(.easeInOut(duration: 0.5), value: viewModel.wrongShakeCount)
    }

    private func choiceGrid(target: FindAnimal) -> some View {
        let cols = Array(repeating: GridItem(.flexible(), spacing: 12), count: 3)
        return LazyVGrid(columns: cols, spacing: 12) {
            ForEach(viewModel.choices, id: \.name) { animal in
                choiceButton(animal: animal, target: target)
            }
        }
    }

    private func choiceButton(animal: FindAnimal, target: FindAnimal) -> some View {
        let isTarget = animal.name == target.name
        let isWrongTap = viewModel.wrongChoice == animal.name
        let showGreen = (viewModel.phase == .correct || viewModel.phase == .wrong) && isTarget
        let borderColor: Color = showGreen
            ? Color.hubEmerald
            : (isWrongTap ? Color.hubRose : Color.hubCardBorder)
        let bgColor: Color = showGreen
            ? Color.hubEmerald.opacity(0.15)
            : (isWrongTap ? Color.hubRoseBg : Color.white)

        return Button {
            viewModel.tapChoice(animal)
        } label: {
            VStack(spacing: 4) {
                Text(animal.emoji).font(.system(size: 48))
                Text(animal.name)
                    .font(.caption.bold())
                    .foregroundStyle(Color.hubIndigo)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(bgColor)
            .clipShape(RoundedRectangle(cornerRadius: 18))
            .overlay(RoundedRectangle(cornerRadius: 18).stroke(borderColor, lineWidth: 3))
        }
        .buttonStyle(.plain)
        .disabled(viewModel.phase != .playing)
    }

    private var winCard: some View {
        VStack(spacing: 12) {
            Text("🌟").font(.system(size: 88))
            Text("You found them all!")
                .font(.title.bold())
                .foregroundStyle(Color.hubRose)
            Text("Amazing job! 🎉")
                .font(.headline)
                .foregroundStyle(Color.hubRose.opacity(0.8))
            Button {
                viewModel.startGame()
            } label: {
                Text("🔄 Play Again")
                    .font(.headline)
                    .foregroundStyle(.white)
                    .padding(.horizontal, 22).padding(.vertical, 12)
                    .background(Color.hubRose)
                    .clipShape(Capsule())
            }
            .padding(.top, 6)
        }
        .padding(28)
        .frame(maxWidth: .infinity)
        .background(Color.hubRoseBg)
        .clipShape(RoundedRectangle(cornerRadius: 24))
        .overlay(RoundedRectangle(cornerRadius: 24).stroke(Color.hubRose.opacity(0.3), lineWidth: 2))
    }
}

private struct ShakeEffect: GeometryEffect {
    var animatableData: CGFloat
    func effectValue(size: CGSize) -> ProjectionTransform {
        let amplitude: CGFloat = 6
        let shakes: CGFloat = 3
        let offset = sin(animatableData * .pi * shakes * 2) * amplitude
        return ProjectionTransform(CGAffineTransform(translationX: offset, y: 0))
    }
}
