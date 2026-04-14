import SwiftUI

struct CategorySelectorView: View {
    var body: some View {
        ZStack {
            Color.hubBackground.ignoresSafeArea()

            ScrollView {
                VStack(spacing: 16) {
                    VStack(spacing: 6) {
                        Text("🐾")
                            .font(.system(size: 56))
                        Text("Animal Match")
                            .font(.system(size: 28, weight: .black))
                            .foregroundStyle(Color.hubInk)
                        Text("Choose a category")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(Color.hubAccent)
                    }
                    .padding(.top, 8)

                    LazyVGrid(columns: [GridItem(.flexible(), spacing: 14), GridItem(.flexible(), spacing: 14)], spacing: 14) {
                        ForEach(AnimalSets.all) { set in
                            NavigationLink {
                                AnimalMatchGameView(set: set)
                            } label: {
                                CategoryTile(set: set)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
                .padding(20)
            }
        }
        .navigationTitle("Animal Match")
        .navigationBarTitleDisplayMode(.inline)
    }
}

private struct CategoryTile: View {
    let set: AnimalSet

    var body: some View {
        VStack(spacing: 10) {
            Text(set.icon)
                .font(.system(size: 56))
            Text(set.name)
                .font(.headline)
                .foregroundStyle(Color.hubInk)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 24)
        .background(Color.hubCardBg)
        .clipShape(RoundedRectangle(cornerRadius: 20))
        .overlay(
            RoundedRectangle(cornerRadius: 20)
                .stroke(Color.hubCardBorder, lineWidth: 2)
        )
        .shadow(color: Color.hubAccent.opacity(0.1), radius: 10, y: 4)
    }
}
