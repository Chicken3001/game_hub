import Foundation

// MARK: - Cards

struct LifeCareer: Identifiable, Equatable, Sendable {
    let id: String
    let title: String
    let emoji: String
    let salary: Int
    let requiresCollege: Bool

    static let all: [LifeCareer] = [
        // No degree needed
        .init(id: "police", title: "Police Officer", emoji: "👮", salary: 20_000, requiresCollege: false),
        .init(id: "athlete", title: "Athlete", emoji: "🏅", salary: 30_000, requiresCollege: false),
        .init(id: "mechanic", title: "Mechanic", emoji: "🔧", salary: 20_000, requiresCollege: false),
        .init(id: "stylist", title: "Hair Stylist", emoji: "💇", salary: 30_000, requiresCollege: false),
        .init(id: "chef", title: "Chef", emoji: "👨‍🍳", salary: 25_000, requiresCollege: false),
        .init(id: "entertainer", title: "Entertainer", emoji: "🎤", salary: 40_000, requiresCollege: false),
        // Degree required
        .init(id: "doctor", title: "Doctor", emoji: "🩺", salary: 70_000, requiresCollege: true),
        .init(id: "lawyer", title: "Lawyer", emoji: "⚖️", salary: 60_000, requiresCollege: true),
        .init(id: "vet", title: "Veterinarian", emoji: "🐶", salary: 50_000, requiresCollege: true),
        .init(id: "engineer", title: "Computer Engineer", emoji: "💻", salary: 80_000, requiresCollege: true),
        .init(id: "teacher", title: "Teacher", emoji: "🍎", salary: 40_000, requiresCollege: true),
        .init(id: "scientist", title: "Scientist", emoji: "🔬", salary: 55_000, requiresCollege: true),
    ]

    static func find(_ id: String) -> LifeCareer? { all.first { $0.id == id } }

    /// The deck a player draws from. College grads get the high-salary careers.
    static func deck(college: Bool) -> [LifeCareer] {
        all.filter { $0.requiresCollege == college }
    }
}

struct LifeHouse: Identifiable, Equatable, Sendable {
    let id: String
    let title: String
    let emoji: String
    let cost: Int

    static let all: [LifeHouse] = [
        .init(id: "mobile", title: "Mobile Home", emoji: "🚐", cost: 60_000),
        .init(id: "cabin", title: "Log Cabin", emoji: "🪵", cost: 80_000),
        .init(id: "cottage", title: "Cottage", emoji: "🏡", cost: 120_000),
        .init(id: "split", title: "Split-Level", emoji: "🏘️", cost: 140_000),
        .init(id: "farm", title: "Farmhouse", emoji: "🚜", cost: 160_000),
        .init(id: "victorian", title: "Victorian", emoji: "🏛️", cost: 200_000),
        .init(id: "mansion", title: "Mansion", emoji: "🏰", cost: 240_000),
    ]

    static func find(_ id: String) -> LifeHouse? { all.first { $0.id == id } }
}

// MARK: - Board

struct LifeTile: Equatable, Sendable {
    enum Kind: String, Equatable, Sendable {
        case start, payday, event, marriage, baby, house, retire
    }

    let kind: Kind
    let title: String
    let emoji: String
    var amount: Int = 0
    var kids: Int = 0

    /// A tile the player must stop on and resolve before the turn can end.
    var isStop: Bool { kind == .house }
}

enum LifePath: String, Codable, Equatable, Hashable, Sendable {
    case career, college
}

enum LifeBoard {
    static let collegeTiles: [LifeTile] = [
        .init(kind: .start, title: "Start College", emoji: "🎓"),
        .init(kind: .event, title: "Tuition", emoji: "💸", amount: -2_000),
        .init(kind: .event, title: "Tuition", emoji: "💸", amount: -2_000),
        .init(kind: .event, title: "Scholarship!", emoji: "🏆", amount: 3_000),
        .init(kind: .event, title: "Tuition", emoji: "💸", amount: -2_000),
        .init(kind: .event, title: "Campus job", emoji: "📚", amount: 4_000),
        .init(kind: .event, title: "Tuition", emoji: "💸", amount: -2_000),
        .init(kind: .event, title: "Graduation!", emoji: "🎉", amount: 5_000),
    ]

    static let mainTiles: [LifeTile] = [
        .init(kind: .start, title: "Start Career", emoji: "🚦"),
        .init(kind: .event, title: "First job bonus", emoji: "🎁", amount: 5_000),
        .init(kind: .payday, title: "Pay Day", emoji: "💰"),
        .init(kind: .event, title: "Buy a car", emoji: "🚗", amount: -2_000),
        .init(kind: .event, title: "Win talent show", emoji: "🎭", amount: 8_000),
        .init(kind: .marriage, title: "Get Married", emoji: "💍", amount: 10_000),
        .init(kind: .payday, title: "Pay Day", emoji: "💰"),
        .init(kind: .event, title: "Adopt a puppy", emoji: "🐕", amount: -3_000),
        .init(kind: .event, title: "Tax refund", emoji: "🧾", amount: 10_000),
        .init(kind: .payday, title: "Pay Day", emoji: "💰"),
        .init(kind: .house, title: "Buy a House", emoji: "🏠"),
        .init(kind: .event, title: "Home repairs", emoji: "🔨", amount: -4_000),
        .init(kind: .payday, title: "Pay Day", emoji: "💰"),
        .init(kind: .baby, title: "It's a baby!", emoji: "👶", amount: 5_000, kids: 1),
        .init(kind: .event, title: "Bonus at work", emoji: "📈", amount: 6_000),
        .init(kind: .payday, title: "Pay Day", emoji: "💰"),
        .init(kind: .event, title: "Family vacation", emoji: "🏖️", amount: -5_000),
        .init(kind: .baby, title: "It's a baby!", emoji: "👶", amount: 5_000, kids: 1),
        .init(kind: .payday, title: "Pay Day", emoji: "💰"),
        .init(kind: .event, title: "Lucky ticket", emoji: "🎟️", amount: 12_000),
        .init(kind: .event, title: "Car breaks down", emoji: "🔧", amount: -6_000),
        .init(kind: .payday, title: "Pay Day", emoji: "💰"),
        .init(kind: .baby, title: "Twins!", emoji: "👶", amount: 10_000, kids: 2),
        .init(kind: .event, title: "Sell old comics", emoji: "📚", amount: 7_000),
        .init(kind: .payday, title: "Pay Day", emoji: "💰"),
        .init(kind: .event, title: "Braces for the kids", emoji: "🦷", amount: -8_000),
        .init(kind: .event, title: "Promotion!", emoji: "🌟", amount: 15_000),
        .init(kind: .payday, title: "Pay Day", emoji: "💰"),
        .init(kind: .event, title: "Lost your phone", emoji: "📱", amount: -3_000),
        .init(kind: .baby, title: "It's a baby!", emoji: "👶", amount: 5_000, kids: 1),
        .init(kind: .payday, title: "Pay Day", emoji: "💰"),
        .init(kind: .event, title: "Garden show prize", emoji: "🌻", amount: 9_000),
        .init(kind: .event, title: "The roof leaks", emoji: "🌧️", amount: -7_000),
        .init(kind: .payday, title: "Pay Day", emoji: "💰"),
        .init(kind: .event, title: "Write a book", emoji: "✍️", amount: 20_000),
        .init(kind: .event, title: "Family reunion", emoji: "👨‍👩‍👧", amount: -5_000),
        .init(kind: .payday, title: "Pay Day", emoji: "💰"),
        .init(kind: .event, title: "Stocks go up", emoji: "📊", amount: 11_000),
        .init(kind: .event, title: "Trip to the dentist", emoji: "🪥", amount: -9_000),
        .init(kind: .payday, title: "Pay Day", emoji: "💰"),
        .init(kind: .event, title: "Your invention sells!", emoji: "💡", amount: 25_000),
        .init(kind: .event, title: "Speeding ticket", emoji: "🚔", amount: -4_000),
        .init(kind: .payday, title: "Pay Day", emoji: "💰"),
        .init(kind: .event, title: "Sell your paintings", emoji: "🎨", amount: 13_000),
        .init(kind: .event, title: "New furnace", emoji: "🔥", amount: -6_000),
        .init(kind: .payday, title: "Pay Day", emoji: "💰"),
        .init(kind: .event, title: "Land a big client", emoji: "🤝", amount: 30_000),
        .init(kind: .event, title: "Give to charity", emoji: "❤️", amount: -10_000),
        .init(kind: .payday, title: "Pay Day", emoji: "💰"),
        .init(kind: .event, title: "Retirement gift", emoji: "🎁", amount: 18_000),
        .init(kind: .payday, title: "Pay Day", emoji: "💰"),
        .init(kind: .retire, title: "Millionaire Estates", emoji: "🏆"),
    ]

    static func tiles(for path: LifePath) -> [LifeTile] {
        path == .college ? collegeTiles : mainTiles
    }

    static var retireIndex: Int { mainTiles.count - 1 }
}

// MARK: - Player state (stored in the `players` jsonb column)

struct LifePlayerState: Codable, Equatable, Hashable, Sendable, Identifiable {
    var user_id: UUID
    var seat: Int
    var path: LifePath?
    var pos: Int
    var money: Int
    var career: String?
    var house: String?
    var spouse: Bool
    var kids: Int
    var retired: Bool

    var id: UUID { user_id }

    static let startingMoney = 10_000

    init(user_id: UUID, seat: Int) {
        self.user_id = user_id
        self.seat = seat
        self.path = nil
        self.pos = 0
        self.money = Self.startingMoney
        self.career = nil
        self.house = nil
        self.spouse = false
        self.kids = 0
        self.retired = false
    }

    var careerCard: LifeCareer? { career.flatMap(LifeCareer.find) }
    var houseCard: LifeHouse? { house.flatMap(LifeHouse.find) }
    var salary: Int { careerCard?.salary ?? 0 }

    /// Cash plus the value of an unsold house. Once retired the house is already sold into `money`.
    var netWorth: Int {
        money + (retired ? 0 : (houseCard?.cost ?? 0))
    }

    /// Pegs riding in the car: the player, maybe a spouse, plus kids.
    var pegCount: Int { 1 + (spouse ? 1 : 0) + kids }
}

// MARK: - Pending decisions

struct LifePending: Codable, Equatable, Hashable, Sendable {
    enum Kind: String, Codable, Equatable, Hashable, Sendable {
        case choosePath, chooseCareer, chooseHouse
    }

    let seat: Int
    let kind: Kind
    /// Ids the player may choose between. For `choosePath` these are LifePath raw values.
    let options: [String]
}

// MARK: - Row (matches the `life_games` table)

struct LifeGameRow: Codable, Identifiable, Equatable, Sendable, Hashable {
    let id: UUID
    let host: UUID
    let players: [LifePlayerState]
    let current_turn: Int
    let spin: Int?
    let pending: LifePending?
    let log: [String]
    let status: String
    let created_at: String
    let updated_at: String

    enum Status: String {
        case waiting, active, finished, cancelled
    }

    var statusEnum: Status { Status(rawValue: status) ?? .waiting }
    var isGameOver: Bool { statusEnum == .finished }
    var seats: Int { players.count }

    func player(seat: Int) -> LifePlayerState? { players.first { $0.seat == seat } }
    func player(userId: UUID) -> LifePlayerState? { players.first { $0.user_id == userId } }

    /// Richest player once everyone has retired. Nil until the game is finished.
    var winner: LifePlayerState? {
        guard statusEnum == .finished else { return nil }
        return players.max { $0.money < $1.money }
    }
}

// MARK: - Engine

/// The result of one engine step: the new state plus what to say about it.
struct LifeOutcome: Equatable, Sendable {
    var players: [LifePlayerState]
    var currentTurn: Int
    var pending: LifePending?
    var status: String
    var log: [String]
}

enum LifeEngine {
    static let minPlayers = 2
    static let maxPlayers = 4
    static let spinMin = 1
    static let spinMax = 10
    static let optionCount = 3

    static func randomSpin() -> Int { Int.random(in: spinMin...spinMax) }

    static func initialPlayers(userIds: [UUID]) -> [LifePlayerState] {
        userIds.enumerated().map { LifePlayerState(user_id: $1, seat: $0) }
    }

    /// The first thing that happens in a new game: seat 0 picks College or Career.
    static func openingPending() -> LifePending {
        LifePending(seat: 0, kind: .choosePath, options: [LifePath.career.rawValue, LifePath.college.rawValue])
    }

    static func careerOptions(college: Bool) -> [String] {
        LifeCareer.deck(college: college).shuffled().prefix(optionCount).map(\.id)
    }

    static func houseOptions() -> [String] {
        LifeHouse.all.shuffled().prefix(optionCount).map(\.id)
    }

    // MARK: Turn order

    /// Next seat that still has playing to do. Returns nil when everyone has retired.
    static func nextSeat(after seat: Int, players: [LifePlayerState]) -> Int? {
        let n = players.count
        guard n > 0 else { return nil }
        for offset in 1...n {
            let candidate = (seat + offset) % n
            if let p = players.first(where: { $0.seat == candidate }), !p.retired {
                return candidate
            }
        }
        return nil
    }

    static func allRetired(_ players: [LifePlayerState]) -> Bool {
        players.allSatisfy(\.retired)
    }

    // MARK: Movement

    /// Walks `steps` tiles, collecting the tiles passed through and the tile landed on.
    /// College overflows onto the main path. The main path clamps at Millionaire Estates.
    static func advance(
        path: LifePath,
        pos: Int,
        steps: Int
    ) -> (path: LifePath, pos: Int, passed: [LifeTile], landed: LifeTile) {
        var passed: [LifeTile] = []

        if path == .college {
            let remainingInCollege = LifeBoard.collegeTiles.count - 1 - pos
            if steps <= remainingInCollege {
                let newPos = pos + steps
                if pos + 1 <= newPos - 1 {
                    passed = Array(LifeBoard.collegeTiles[(pos + 1)...(newPos - 1)])
                }
                return (.college, newPos, passed, LifeBoard.collegeTiles[newPos])
            }
            // Finish college, spill onto the main path.
            if pos + 1 < LifeBoard.collegeTiles.count {
                passed.append(contentsOf: LifeBoard.collegeTiles[(pos + 1)...])
            }
            let intoMain = steps - remainingInCollege - 1
            let landedIndex = min(intoMain, LifeBoard.retireIndex)
            if landedIndex > 0 {
                passed.append(contentsOf: LifeBoard.mainTiles[0...(landedIndex - 1)])
            }
            return (.career, landedIndex, passed, LifeBoard.mainTiles[landedIndex])
        }

        let landedIndex = min(pos + steps, LifeBoard.retireIndex)
        if pos + 1 <= landedIndex - 1 {
            passed = Array(LifeBoard.mainTiles[(pos + 1)...(landedIndex - 1)])
        }
        return (.career, landedIndex, passed, LifeBoard.mainTiles[landedIndex])
    }

    // MARK: Steps

    /// Resolve a pending decision. Returns nil if the choice is not legal.
    static func resolve(
        players: [LifePlayerState],
        currentTurn: Int,
        pending: LifePending,
        choice: String
    ) -> LifeOutcome? {
        guard pending.seat == currentTurn,
              let idx = players.firstIndex(where: { $0.seat == currentTurn })
        else { return nil }

        var players = players
        var log: [String] = []

        switch pending.kind {
        case .choosePath:
            guard let path = LifePath(rawValue: choice), pending.options.contains(choice) else { return nil }
            players[idx].path = path
            players[idx].pos = 0
            log.append(path == .college ? "🎓 Off to college!" : "🚦 Straight to work!")
            let next = LifePending(
                seat: currentTurn,
                kind: .chooseCareer,
                options: careerOptions(college: path == .college)
            )
            return LifeOutcome(players: players, currentTurn: currentTurn, pending: next, status: "active", log: log)

        case .chooseCareer:
            guard pending.options.contains(choice), let career = LifeCareer.find(choice) else { return nil }
            players[idx].career = career.id
            log.append("\(career.emoji) Became a \(career.title) — salary \(money(career.salary))")
            return LifeOutcome(players: players, currentTurn: currentTurn, pending: nil, status: "active", log: log)

        case .chooseHouse:
            if choice == "skip" {
                log.append("🏚️ Decided to rent for now.")
            } else {
                guard pending.options.contains(choice), let house = LifeHouse.find(choice) else { return nil }
                guard players[idx].money >= house.cost else { return nil }
                players[idx].money -= house.cost
                players[idx].house = house.id
                log.append("\(house.emoji) Bought a \(house.title) for \(money(house.cost))")
            }
            // Buying a house ends the turn.
            return endTurn(players: players, currentTurn: currentTurn, log: log)
        }
    }

    /// Spin the wheel and move. `spin` is injected so this stays deterministic and testable.
    static func takeTurn(
        players: [LifePlayerState],
        currentTurn: Int,
        spin: Int,
        houseOptionsProvider: () -> [String] = houseOptions
    ) -> LifeOutcome? {
        guard let idx = players.firstIndex(where: { $0.seat == currentTurn }),
              let path = players[idx].path,
              players[idx].career != nil,
              !players[idx].retired
        else { return nil }

        var players = players
        var log: [String] = ["🎡 Spun a \(spin)"]

        let move = advance(path: path, pos: players[idx].pos, steps: spin)
        players[idx].path = move.path
        players[idx].pos = move.pos

        // Passing a Pay Day still collects it.
        for tile in move.passed where tile.kind == .payday {
            players[idx].money += players[idx].salary
            log.append("💰 Passed Pay Day: +\(money(players[idx].salary))")
        }

        // Then resolve the tile actually landed on.
        let landed = move.landed
        switch landed.kind {
        case .start:
            break

        case .payday:
            players[idx].money += players[idx].salary
            log.append("💰 Pay Day! +\(money(players[idx].salary))")

        case .event:
            players[idx].money += landed.amount
            let sign = landed.amount >= 0 ? "+" : "-"
            log.append("\(landed.emoji) \(landed.title): \(sign)\(money(abs(landed.amount)))")

        case .marriage:
            if !players[idx].spouse {
                players[idx].spouse = true
                players[idx].money += landed.amount
                log.append("💍 Got married! Wedding gifts: +\(money(landed.amount))")
            } else {
                log.append("💍 Already married — happy anniversary!")
            }

        case .baby:
            players[idx].kids += landed.kids
            players[idx].money += landed.amount
            log.append("\(landed.emoji) \(landed.title) +\(money(landed.amount))")

        case .house:
            if players[idx].house == nil {
                let options = houseOptionsProvider()
                let pending = LifePending(seat: currentTurn, kind: .chooseHouse, options: options)
                log.append("🏠 Time to buy a house!")
                return LifeOutcome(
                    players: players, currentTurn: currentTurn,
                    pending: pending, status: "active", log: log
                )
            }
            log.append("🏠 You already own a home.")

        case .retire:
            players[idx].retired = true
            if let house = players[idx].houseCard {
                players[idx].money += house.cost
                log.append("🏠 Sold the \(house.title) for \(money(house.cost))")
            }
            log.append("🏆 Retired at Millionaire Estates with \(money(players[idx].money))!")
        }

        return endTurn(players: players, currentTurn: currentTurn, log: log)
    }

    /// Pass an away player's turn along without acting for them.
    /// Any decision they owed (e.g. an unresolved house purchase) is dropped.
    static func skipTurn(players: [LifePlayerState], currentTurn: Int) -> LifeOutcome {
        endTurn(players: players, currentTurn: currentTurn, log: ["⏭️ Skipped an away player's turn"])
    }

    /// Hand play to the next un-retired seat, or finish the game.
    private static func endTurn(
        players: [LifePlayerState],
        currentTurn: Int,
        log: [String]
    ) -> LifeOutcome {
        var log = log
        if allRetired(players) {
            if let winner = players.max(by: { $0.money < $1.money }) {
                log.append("🎉 Everyone retired! Player \(winner.seat + 1) wins with \(money(winner.money))")
            }
            return LifeOutcome(players: players, currentTurn: currentTurn, pending: nil, status: "finished", log: log)
        }
        guard let next = nextSeat(after: currentTurn, players: players) else {
            return LifeOutcome(players: players, currentTurn: currentTurn, pending: nil, status: "finished", log: log)
        }
        // A player who has not chosen a path yet must do so before spinning.
        let pending: LifePending? = players.first(where: { $0.seat == next })?.path == nil
            ? LifePending(seat: next, kind: .choosePath, options: [LifePath.career.rawValue, LifePath.college.rawValue])
            : nil
        return LifeOutcome(players: players, currentTurn: next, pending: pending, status: "active", log: log)
    }

    // MARK: Formatting

    static func money(_ amount: Int) -> String {
        let sign = amount < 0 ? "-" : ""
        let n = abs(amount)
        if n >= 1_000 && n % 1_000 == 0 { return "\(sign)$\(n / 1_000)k" }
        return "\(sign)$\(n)"
    }
}
