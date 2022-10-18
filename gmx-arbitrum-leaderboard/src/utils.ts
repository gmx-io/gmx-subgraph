import { Address, BigDecimal, BigInt } from "@graphprotocol/graph-ts";
import { Team, Competition, Account, AccountStat, Position } from "../generated/schema"

export function loadOrCreateCompetition(index: BigInt): Competition {
    let competition = Competition.load(index.toString())

    if (competition === null) {
        competition = new Competition(index.toString())
        competition.start = BigInt.fromI32(0);
        competition.end = BigInt.fromI32(0);
        competition.maxTeamSize = BigInt.fromI32(0);
        competition.canceled = false
        competition.save()
    }

    return <Competition>competition
}

export function loadOrCreateAccount(address: Address): Account {
    let account = Account.load(address.toHex())

    if (account === null) {
        account = new Account(address.toHex())
        account.address = address.toHex()
        account.save()
    }

    return <Account>account
}

export function loadOrCreateTeam(competitionIndex: BigInt, leader: Address): Team {
    let id = competitionIndex.toString() + "-" + leader.toHex()
    let team = Team.load(id)

    if (team === null) {
        let account = loadOrCreateAccount(leader)
        team = new Team(id)
        team.address = leader.toHex()
        team.competition = competitionIndex.toString()
        team.name = ""
        team.leader = account.id
        team.members = [account.id]
        team.save()
    }

    return <Team>team
}

export function loadOrCreateAccountStat(account: string, period: string, timestamp: BigInt): AccountStat {
    let id = `${account}:${period}:${timestamp}`
    
    let stat = AccountStat.load(id)
    if (stat === null) {
        stat = new AccountStat(id)
        stat.account = account
        stat.period = period
        stat.timestamp = timestamp
    }

    return <AccountStat>stat
}

export function getAccountActiveTeams(ts: BigInt, account: Account): Team[] {
    let result: Team[] = []
    let teams = account.teams

    for (let i = 0; i < teams.length; i++) {
        let team = <Team>Team.load(teams[i]);
        let competition = <Competition>Competition.load(team.competition)

        if (competition.end.le(ts) || competition.start.gt(ts)) {
            continue
        }

        result.push(team)
    }

    return result
}

export function getPositionId(account: string, market: string, collateralToken: string, isLong: boolean): string {
    return `${account}:${market}:${collateralToken}:${isLong}`
}

export function loadOrCreatePosition(account: string, market: string, collateralToken: string, isLong: boolean): Position {
    let id = getPositionId(account, market, collateralToken, isLong)
    let position = Position.load(id)

    if (position !== null) {
        return <Position>position
    }

    position = new Position(id)
    position.account = account
    position.market = market
    position.collateralToken = collateralToken
    position.isLong = isLong

    return <Position>position
}

export function getDayTimestamp(ts: BigInt): BigInt {
    return ts.minus(ts.mod(BigInt.fromI32(86400)))
}

export function getWeekTimestamp(ts: BigInt): BigInt {
    return ts.minus(ts.mod(BigInt.fromI32(86400 * 7)))
}

export function getMonthTimestamp(ts: BigInt): BigInt {
    return ts.minus(ts.mod(BigInt.fromI32(86400 * 30)))
}

export function getQuarterTimestamp(ts: BigInt): BigInt {
    return ts.minus(ts.mod(BigInt.fromI32(86400 * 90)))
}

export function getYearTimestamp(ts: BigInt): BigInt {
    return ts.minus(ts.mod(BigInt.fromI32(86400 * 365)))
}

export function toUSD(value: BigInt): BigDecimal {
    return value.divDecimal(
        BigInt.fromI32(10).pow(30).toBigDecimal()
    )
}