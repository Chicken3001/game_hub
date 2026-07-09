import SwiftUI

struct LifeMultiplayerView: View {
    @State private var viewModel: LifeMultiplayerViewModel
    @Environment(\.dismiss) private var dismiss

    init(initialGame: LifeGameRow) {
        let uid = AuthService.shared.currentUserId ?? ""
        _viewModel = State(initialValue: LifeMultiplayerViewModel(initialGame: initialGame, currentUserId: uid))
    }

    var body: some View {
        ZStack {
            Color.hubBackground.ignoresSafeArea()
            ScrollView {
                VStack(spacing: 16) {
                    switch viewModel.game.statusEnum {
                    case .cancelled: cancelledCard
                    case .waiting:
                        if viewModel.joining { joiningCard } else { waitingRoom }
                    case .active, .finished:
                        gameBody
                    }
                }
                .padding(16)
            }
        }
        .navigationTitle("The Game of Life")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear { viewModel.onAppear() }
        .onDisappear { viewModel.onDisappear() }
        .navigationDestination(item: $viewModel.rematchGame) { row in
            LifeMultiplayerView(initialGame: row)
        }
        .onChange(of: viewModel.forceDismiss) { _, leave in
            if leave { dismiss() }
        }
    }

    // MARK: - Waiting room

    private var waitingRoom: some View {
        VStack(spacing: 14) {
            Text("🚗").font(.system(size: 56))
            Text(viewModel.isHost ? "Your game room" : "Waiting to start…")
                .font(.title3.bold())
                .foregroundStyle(Color.hubInk)
            Text("\(viewModel.game.players.count) of \(LifeEngine.maxPlayers) players")
                .font(.subheadline.bold())
                .foregroundStyle(Color.hubAccent)

            VStack(spacing: 8) {
                ForEach(viewModel.game.players) { p in
                    HStack(spacing: 10) {
                        LifeCarBadge(seat: p.seat, pegs: 1)
                        Text(viewModel.username(p))
                            .font(.subheadline.bold())
                            .foregroundStyle(Color.hubInk)
                        if p.user_id == viewModel.game.host {
                            Text("HOST")
                                .font(.system(size: 9, weight: .black))
                                .foregroundStyle(.white)
                                .padding(.horizontal, 6).padding(.vertical, 2)
                                .background(Color.hubIndigo)
                                .clipShape(Capsule())
                        }
                        Spacer()
                    }
                    .padding(.horizontal, 12).padding(.vertical, 8)
                    .background(Color.hubBackground)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }
            }

            if viewModel.isHost {
                Button {
                    Task { await viewModel.startGame() }
                } label: {
                    Text(viewModel.starting ? "⏳ Starting…" : "▶️ Start Game")
                        .font(.headline)
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(viewModel.canStart ? Color.hubEmerald : Color.hubEmerald.opacity(0.4))
                        .clipShape(RoundedRectangle(cornerRadius: 18))
                }
                .buttonStyle(.plain)
                .disabled(!viewModel.canStart || viewModel.starting)

                if !viewModel.canStart {
                    Text("Need at least \(LifeEngine.minPlayers) players to start.")
                        .font(.caption)
                        .foregroundStyle(Color.hubAccent.opacity(0.7))
                }
            } else {
                Text("Waiting for the host to start the game…")
                    .font(.subheadline)
                    .foregroundStyle(Color.hubAccent)
                    .multilineTextAlignment(.center)
            }
        }
        .padding(24)
        .frame(maxWidth: .infinity)
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: 22))
        .overlay(RoundedRectangle(cornerRadius: 22).stroke(Color.hubCardBorder, lineWidth: 2))
    }

    private var joiningCard: some View {
        VStack(spacing: 10) {
            ProgressView().scaleEffect(1.4)
            Text("Joining game…")
                .font(.title3.bold())
                .foregroundStyle(Color.hubInk)
                .padding(.top, 6)
        }
        .padding(28)
        .frame(maxWidth: .infinity)
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: 22))
    }

    private var cancelledCard: some View {
        VStack(spacing: 10) {
            Text("🚫").font(.system(size: 56))
            Text("This game was cancelled")
                .font(.title3.bold())
                .foregroundStyle(Color.hubInk)
            Button("Back to Lobby") { dismiss() }
                .font(.subheadline.bold())
                .foregroundStyle(.white)
                .padding(.horizontal, 20).padding(.vertical, 10)
                .background(Color.hubIndigo)
                .clipShape(Capsule())
                .padding(.top, 6)
        }
        .padding(24)
        .frame(maxWidth: .infinity)
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: 22))
        .overlay(RoundedRectangle(cornerRadius: 22).stroke(Color.hubCardBorder, lineWidth: 2))
    }

    // MARK: - Active game

    private var gameBody: some View {
        VStack(spacing: 14) {
            if viewModel.isSpectator && !viewModel.game.isGameOver { spectatorBadge }
            if let n = viewModel.skipCountdown, !viewModel.game.isGameOver { awayBanner(seconds: n) }

            turnBanner

            LifeBoardView(players: viewModel.game.players, currentTurn: viewModel.game.current_turn)

            if viewModel.game.isGameOver {
                gameOverCard
            } else if let pending = viewModel.myPending {
                choiceCard(pending)
            } else {
                spinArea
            }

            playersPanel
            logFeed
        }
    }

    private var spectatorBadge: some View {
        HStack(spacing: 8) {
            Text("👀")
            Text("You are spectating")
                .font(.subheadline.bold())
                .foregroundStyle(Color.hubAmber)
        }
        .padding(.horizontal, 14).padding(.vertical, 8)
        .background(Color.hubAmberBg)
        .clipShape(Capsule())
    }

    private func awayBanner(seconds: Int) -> some View {
        let name = viewModel.currentPlayer.map { viewModel.username($0) } ?? "A player"
        return VStack(spacing: 6) {
            Text("⚠️ \(name) stepped away")
                .font(.headline)
                .foregroundStyle(Color.hubAmber)
            Text("Skipping their turn in \(seconds)s…")
                .font(.subheadline.bold())
                .foregroundStyle(Color.hubAmber.opacity(0.8))
        }
        .padding(14)
        .frame(maxWidth: .infinity)
        .background(Color.hubAmberBg)
        .clipShape(RoundedRectangle(cornerRadius: 18))
        .overlay(RoundedRectangle(cornerRadius: 18).stroke(Color.hubAmber.opacity(0.5), lineWidth: 2))
    }

    @ViewBuilder
    private var turnBanner: some View {
        if !viewModel.game.isGameOver, let current = viewModel.currentPlayer {
            HStack(spacing: 8) {
                LifeCarBadge(seat: current.seat, pegs: current.pegCount)
                Text(viewModel.isMyTurn ? "🎯 Your turn!" : "⏳ \(viewModel.username(current))'s turn")
                    .font(.title3.bold())
                    .foregroundStyle(viewModel.isMyTurn ? Color.hubEmerald : Color.hubAccent.opacity(0.75))
            }
        }
    }

    // MARK: Spin

    private var spinArea: some View {
        VStack(spacing: 10) {
            if let spin = viewModel.game.spin {
                Text("\(spin)")
                    .font(.system(size: 44, weight: .black))
                    .foregroundStyle(Color.hubIndigo)
                    .frame(width: 84, height: 84)
                    .background(Color.white)
                    .clipShape(Circle())
                    .overlay(Circle().stroke(Color.hubIndigo, lineWidth: 3))
                    .contentTransition(.numericText())
                    .animation(.snappy, value: spin)
            }

            Button {
                viewModel.spin()
            } label: {
                Text("🎡 Spin!")
                    .font(.title3.bold())
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(viewModel.canSpin ? Color.hubIndigo : Color.hubIndigo.opacity(0.35))
                    .clipShape(RoundedRectangle(cornerRadius: 18))
            }
            .buttonStyle(.plain)
            .disabled(!viewModel.canSpin)
        }
    }

    // MARK: Pending choices

    @ViewBuilder
    private func choiceCard(_ pending: LifePending) -> some View {
        VStack(spacing: 12) {
            Text(choiceTitle(pending))
                .font(.headline)
                .foregroundStyle(Color.hubInk)
                .multilineTextAlignment(.center)

            switch pending.kind {
            case .choosePath:
                HStack(spacing: 10) {
                    ForEach(pending.options, id: \.self) { option in
                        let isCollege = option == LifePath.college.rawValue
                        optionButton(
                            emoji: isCollege ? "🎓" : "🚦",
                            title: isCollege ? "College" : "Career",
                            subtitle: isCollege ? "Slower start, better jobs" : "Start earning now",
                            enabled: true
                        ) { viewModel.choose(option) }
                    }
                }

            case .chooseCareer:
                VStack(spacing: 8) {
                    ForEach(pending.options, id: \.self) { option in
                        if let career = LifeCareer.find(option) {
                            rowButton(
                                emoji: career.emoji,
                                title: career.title,
                                detail: "Salary \(LifeEngine.money(career.salary))",
                                enabled: true
                            ) { viewModel.choose(option) }
                        }
                    }
                }

            case .chooseHouse:
                VStack(spacing: 8) {
                    ForEach(pending.options, id: \.self) { option in
                        if let house = LifeHouse.find(option) {
                            let affordable = (viewModel.me?.money ?? 0) >= house.cost
                            rowButton(
                                emoji: house.emoji,
                                title: house.title,
                                detail: affordable
                                    ? LifeEngine.money(house.cost)
                                    : "\(LifeEngine.money(house.cost)) — too expensive",
                                enabled: affordable
                            ) { viewModel.choose(option) }
                        }
                    }
                    Button {
                        viewModel.choose("skip")
                    } label: {
                        Text("Rent for now →")
                            .font(.subheadline.bold())
                            .foregroundStyle(Color.hubAccent)
                    }
                    .buttonStyle(.plain)
                    .padding(.top, 2)
                }
            }
        }
        .padding(18)
        .frame(maxWidth: .infinity)
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: 20))
        .overlay(RoundedRectangle(cornerRadius: 20).stroke(Color.hubIndigo.opacity(0.4), lineWidth: 2))
    }

    private func choiceTitle(_ pending: LifePending) -> String {
        switch pending.kind {
        case .choosePath: return "Which road will you take?"
        case .chooseCareer: return "Pick your career"
        case .chooseHouse: return "Pick a house to buy"
        }
    }

    private func optionButton(
        emoji: String, title: String, subtitle: String, enabled: Bool, action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            VStack(spacing: 4) {
                Text(emoji).font(.system(size: 32))
                Text(title).font(.subheadline.bold()).foregroundStyle(Color.hubInk)
                Text(subtitle)
                    .font(.system(size: 10))
                    .foregroundStyle(Color.hubAccent)
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .background(Color.hubBackground)
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color.hubCardBorder, lineWidth: 2))
        }
        .buttonStyle(.plain)
        .disabled(!enabled)
    }

    private func rowButton(
        emoji: String, title: String, detail: String, enabled: Bool, action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            HStack(spacing: 10) {
                Text(emoji).font(.title3)
                VStack(alignment: .leading, spacing: 1) {
                    Text(title).font(.subheadline.bold()).foregroundStyle(Color.hubInk)
                    Text(detail)
                        .font(.caption)
                        .foregroundStyle(enabled ? Color.hubAccent : Color.hubRose)
                }
                Spacer()
                if enabled {
                    Image(systemName: "chevron.right")
                        .foregroundStyle(Color.hubAccent.opacity(0.6))
                }
            }
            .padding(.horizontal, 14).padding(.vertical, 10)
            .frame(maxWidth: .infinity)
            .background(Color.hubBackground)
            .clipShape(RoundedRectangle(cornerRadius: 14))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color.hubCardBorder, lineWidth: 1.5))
            .opacity(enabled ? 1 : 0.55)
        }
        .buttonStyle(.plain)
        .disabled(!enabled)
    }

    // MARK: Players

    private var playersPanel: some View {
        VStack(spacing: 8) {
            ForEach(viewModel.game.players) { p in
                HStack(spacing: 10) {
                    LifeCarBadge(seat: p.seat, pegs: p.pegCount)
                    VStack(alignment: .leading, spacing: 1) {
                        HStack(spacing: 4) {
                            Text(viewModel.username(p))
                                .font(.subheadline.bold())
                                .foregroundStyle(Color.hubInk)
                            if p.retired {
                                Text("🏆").font(.caption)
                            }
                        }
                        Text(subtitle(for: p))
                            .font(.caption2)
                            .foregroundStyle(Color.hubAccent.opacity(0.8))
                    }
                    Spacer()
                    VStack(alignment: .trailing, spacing: 1) {
                        Text(LifeEngine.money(p.money))
                            .font(.subheadline.bold())
                            .foregroundStyle(p.money < 0 ? Color.hubRose : Color.hubEmerald)
                            .monospacedDigit()
                        if !p.retired, let house = p.houseCard {
                            Text("\(house.emoji) \(LifeEngine.money(house.cost))")
                                .font(.system(size: 9))
                                .foregroundStyle(Color.hubAccent.opacity(0.7))
                        }
                    }
                }
                .padding(.horizontal, 12).padding(.vertical, 10)
                .background(p.seat == viewModel.game.current_turn && !viewModel.game.isGameOver
                            ? LifePalette.color(seat: p.seat).opacity(0.10)
                            : Color.white)
                .clipShape(RoundedRectangle(cornerRadius: 14))
                .overlay(
                    RoundedRectangle(cornerRadius: 14)
                        .stroke(p.seat == viewModel.game.current_turn && !viewModel.game.isGameOver
                                ? LifePalette.color(seat: p.seat)
                                : Color.hubCardBorder,
                                lineWidth: 1.5)
                )
            }
        }
    }

    private func subtitle(for p: LifePlayerState) -> String {
        var bits: [String] = []
        if let career = p.careerCard { bits.append("\(career.emoji) \(career.title)") }
        else if let path = p.path { bits.append(path == .college ? "🎓 Studying" : "🚦 Job hunting") }
        else { bits.append("Choosing a path") }
        if p.spouse { bits.append("💍") }
        if p.kids > 0 { bits.append("👶×\(p.kids)") }
        return bits.joined(separator: " · ")
    }

    // MARK: Log

    @ViewBuilder
    private var logFeed: some View {
        if !viewModel.game.log.isEmpty {
            VStack(alignment: .leading, spacing: 4) {
                Text("What just happened")
                    .font(.caption.bold())
                    .foregroundStyle(Color.hubAccent)
                ForEach(Array(viewModel.game.log.suffix(6).enumerated().reversed()), id: \.offset) { _, line in
                    Text(line)
                        .font(.caption)
                        .foregroundStyle(Color.hubInk.opacity(0.8))
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color.white)
            .clipShape(RoundedRectangle(cornerRadius: 14))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color.hubCardBorder, lineWidth: 1.5))
        }
    }

    // MARK: Game over

    @ViewBuilder
    private var gameOverCard: some View {
        let winner = viewModel.game.winner
        let iWon = viewModel.iWon
        VStack(spacing: 12) {
            Text(iWon ? "🏆" : "🎉").font(.system(size: 48))
            Text(iWon ? "You win!" : "\(winner.map { viewModel.username($0) } ?? "Someone") wins!")
                .font(.title2.bold())
                .foregroundStyle(iWon ? Color.hubEmerald : Color.hubInk)
            if let winner {
                Text("Retired with \(LifeEngine.money(winner.money))")
                    .font(.subheadline.bold())
                    .foregroundStyle(Color.hubAccent)
            }
            HStack(spacing: 10) {
                if !viewModel.isSpectator {
                    Button {
                        Task { await viewModel.startRematch() }
                    } label: {
                        Text(viewModel.rematching ? "⏳ Starting…" : "🔄 Rematch")
                            .font(.subheadline.bold())
                            .padding(.horizontal, 16).padding(.vertical, 10)
                            .background(Color.hubEmerald)
                            .foregroundStyle(.white)
                            .clipShape(Capsule())
                    }
                    .buttonStyle(.plain)
                    .disabled(viewModel.rematching)
                }
                Button { dismiss() } label: {
                    Text("Lobby")
                        .font(.subheadline.bold())
                        .padding(.horizontal, 16).padding(.vertical, 10)
                        .background(Color.hubIndigo)
                        .foregroundStyle(.white)
                        .clipShape(Capsule())
                }
                .buttonStyle(.plain)
            }
        }
        .padding(20)
        .frame(maxWidth: .infinity)
        .background(iWon ? Color.hubEmerald.opacity(0.1) : Color.white)
        .clipShape(RoundedRectangle(cornerRadius: 22))
        .overlay(
            RoundedRectangle(cornerRadius: 22)
                .stroke(iWon ? Color.hubEmerald : Color.hubCardBorder, lineWidth: 2)
        )
    }
}
