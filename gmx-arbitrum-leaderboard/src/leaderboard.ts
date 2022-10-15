import { BigInt } from "@graphprotocol/graph-ts";
import { PositionDecrease, PositionIncrease } from "../generated/EventEmitter/EventEmitter"
import { Account, Competition, Team, Trade } from "../generated/schema";
import { getDayTimestamp, getMonthTimestamp, getQuarterTimestamp, getWeekTimestamp, getYearTimestamp, loadOrCreateAccount, loadOrCreateAccountStat, loadOrCreatePosition, loadOrCreateTeamStat, toUSD } from "./utils";

export function handlePositionIncrease(event: PositionIncrease): void {
    let account = loadOrCreateAccount(event.params.account)
    let position = loadOrCreatePosition(account.id, event.params.market.toHex(), event.params.collateralToken.toHex(), event.params.isLong)

    position.sizeInUsd = position.sizeInUsd.plus(event.params.sizeDeltaInUsd)
    position.collateral = position.collateral.plus(event.params.collateralDeltaAmount)
    position.status = "opened"

    position.save()
}

export function handlePositionDecrease(event: PositionDecrease): void {
    let account = loadOrCreateAccount(event.params.account)
    let position = loadOrCreatePosition(account.id, event.params.market.toHex(), event.params.collateralToken.toHex(), event.params.isLong)

    position.sizeInUsd = position.sizeInUsd.minus(event.params.sizeDeltaInUsd)
    position.collateral = position.collateral.minus(event.params.collateralDeltaAmount)

    if (position.sizeInUsd.isZero()) {
        position.status = "closed"
    }

    position.save()

    updateAccountStats(event.block.timestamp, account, event.params.realizedPnlAmount)
    updateAccountTeamsStats(event.block.timestamp, account, event.params.realizedPnlAmount)

    if (position.status !== "closed") {
        return
    }

    let trade = new Trade(`${account.id}:${event.params.market.toHex()}:${event.params.collateralToken.toHex()}:${event.params.isLong?"1":"0"}`)
    trade.account = account.id
    trade.market = position.market
    trade.isLong = position.isLong
    trade.realizedPnl = event.params.realizedPnlAmount
    trade.timestamp = event.block.timestamp
    trade.save()
}

function updateAccountStats(ts: BigInt, account: Account, realizedPnl: BigInt): void {
    updateAccountStat(BigInt.fromI32(0), account, "any", realizedPnl)
    updateAccountStat(getDayTimestamp(ts), account, "daily", realizedPnl)
    updateAccountStat(getWeekTimestamp(ts), account, "weekly", realizedPnl)
    updateAccountStat(getMonthTimestamp(ts), account, "monthly", realizedPnl)
    updateAccountStat(getQuarterTimestamp(ts), account, "quarterly", realizedPnl)
    updateAccountStat(getYearTimestamp(ts), account, "yearly", realizedPnl)
}

function updateAccountTeamsStats(ts: BigInt, account: Account, realizedPnl: BigInt): void {
    let teams = account.teams
    for (let i = 0; i < teams.length; i++) {
        let team = <Team>Team.load(teams[i]);
        let competition = <Competition>Competition.load(team.competition)

        if (competition.end.le(ts) || competition.start.gt(ts)) {
            continue
        }

        updateTeamStats(ts, team, realizedPnl)
    }
}

function updateTeamStats(ts: BigInt, team: Team, realizedPnl: BigInt): void {
    updateTeamStat(BigInt.fromI32(0), team, "any", realizedPnl)
    updateTeamStat(getDayTimestamp(ts), team, "daily", realizedPnl)
    updateTeamStat(getWeekTimestamp(ts), team, "weekly", realizedPnl)
    updateTeamStat(getMonthTimestamp(ts), team, "monthly", realizedPnl)
    updateTeamStat(getQuarterTimestamp(ts), team, "quarterly", realizedPnl)
    updateTeamStat(getYearTimestamp(ts), team, "yearly", realizedPnl)
}

function updateAccountStat(ts: BigInt, account: Account, period: string, realizedPnl: BigInt): void {
    let stat = loadOrCreateAccountStat(account.id, period, ts)
    stat.realizedPnl = stat.realizedPnl.plus(realizedPnl)
    stat.save()
}

function updateTeamStat(ts: BigInt, team: Team, period: string, realizedPnl: BigInt): void {
    let stat = loadOrCreateTeamStat(team.id, period, ts)
    stat.realizedPnl = stat.realizedPnl.plus(realizedPnl)
    stat.save()
}