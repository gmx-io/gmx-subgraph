import { BigDecimal, BigInt, store } from "@graphprotocol/graph-ts";
import { PositionDecrease, PositionIncrease } from "../generated/EventEmitter/EventEmitter"
import { Account, Position, Team, Trade } from "../generated/schema";
import { getAccountActiveTeams, getDayTimestamp, getMonthTimestamp, getPositionId, getQuarterTimestamp, getWeekTimestamp, getYearTimestamp, loadOrCreateAccount, loadOrCreateAccountStat, loadOrCreatePosition } from "./utils";

export function handlePositionIncrease(event: PositionIncrease): void {
    let account = loadOrCreateAccount(event.params.account)
    let position = loadOrCreatePosition(account.id, event.params.market.toHex(), event.params.collateralToken.toHex(), event.params.isLong)
    position.sizeInUsd = position.sizeInUsd.plus(event.params.sizeDeltaInUsd)
    position.collateral = position.collateral.plus(event.params.collateralDeltaAmount)
    position.save()
}

export function handlePositionDecrease(event: PositionDecrease): void {
    let account = <Account>Account.load(event.params.account.toHex())
    let position = <Position>Position.load(getPositionId(account.id, event.params.market.toHex(), event.params.collateralToken.toHex(), event.params.isLong))

    let realizedPnl = event.params.realizedPnlAmount.minus(position.pnl)

    position.sizeInUsd = position.sizeInUsd.minus(event.params.sizeDeltaInUsd)
    position.collateral = position.collateral.minus(event.params.collateralDeltaAmount)
    position.pnl = event.params.realizedPnlAmount

    updateAccountStats(event.block.timestamp, account, realizedPnl)
    updateAccountTeamsStats(event.block.timestamp, account, realizedPnl)

    let trade = new Trade(`${account.id}:${event.params.market.toHex()}:${event.params.collateralToken.toHex()}:${event.params.isLong?"1":"0"}`)
    trade.account = account.id
    trade.market = position.market
    trade.isLong = position.isLong
    trade.pnl = realizedPnl
    trade.pnlPercentage = realizedPnl.divDecimal(event.params.collateralDeltaAmount.toBigDecimal()).times(BigDecimal.fromString("100"))
    trade.timestamp = event.block.timestamp
    trade.save()

    if (position.sizeInUsd.isZero()) {
        store.remove("Position", position.id)
    }
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
    let teams = getAccountActiveTeams(ts, account)

    for (let i = 0; i < teams.length; i++) {
        let team = teams[i];
        team.pnl = team.pnl.plus(realizedPnl)
        team.save()
    }
}

function updateAccountStat(ts: BigInt, account: Account, period: string, realizedPnl: BigInt): void {
    let stat = loadOrCreateAccountStat(account.id, period, ts)
    stat.pnl = stat.pnl.plus(realizedPnl)
    stat.save()
}
