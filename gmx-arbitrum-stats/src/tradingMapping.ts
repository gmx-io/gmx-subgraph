import { Address, BigInt } from "@graphprotocol/graph-ts"

import {
  timestampToDay
} from "./helpers"

import {
  ClosePosition,
  IncreasePosition,
  DecreasePosition,
  LiquidatePosition
} from "../generated/Vault/Vault"

import {
  OpenInterestByToken,
  TradingStat
} from "../generated/schema"

let ZERO = BigInt.fromI32(0)

function _loadOrCreateEntity(id: string, period: string, timestamp: BigInt): TradingStat {
  let entity = TradingStat.load(id)
  if (entity == null) {
    entity = new TradingStat(id)
    entity.period = period
    entity.profit = BigInt.fromI32(0)
    entity.loss = BigInt.fromI32(0)
    entity.profitCumulative = BigInt.fromI32(0)
    entity.lossCumulative = BigInt.fromI32(0)

    entity.longOpenInterest = BigInt.fromI32(0)
    entity.shortOpenInterest = BigInt.fromI32(0)

    entity.liquidatedCollateral = BigInt.fromI32(0)
    entity.liquidatedCollateralCumulative = BigInt.fromI32(0)
  }
  entity.timestamp = timestamp.toI32()
  return entity as TradingStat
}

function _loadOrCreateOpenInterestByToken(id: string, period: string, timestamp: BigInt, indexToken: Address): OpenInterestByToken {
  let entity = OpenInterestByToken.load(id)
  if (entity == null) {
    entity = new OpenInterestByToken(id)
    entity.period = period
    entity.long = ZERO
    entity.short = ZERO
    entity.token = indexToken.toHexString()
  }
  entity.timestamp = timestamp.toI32()
  return entity as OpenInterestByToken;
}

function _updateOpenInterestByToken(timestamp: BigInt, increase: boolean, isLong: boolean, delta: BigInt, indexToken: Address): void {
  let id = indexToken.toHexString();
  let entity = _loadOrCreateOpenInterestByToken(id, "total", timestamp, indexToken)

  if (isLong) {
    entity.long = increase ? entity.long + delta : entity.long - delta
  } else {
    entity.short = increase ? entity.short + delta : entity.short - delta
  }
  entity.save()

  // update day open interest
  let dayTimestamp = timestampToDay(timestamp)
  let dayId = indexToken.toHexString() + ":" + dayTimestamp.toHexString()
  let dayEntity = _loadOrCreateOpenInterestByToken(dayId, "daily", dayTimestamp, indexToken)

  dayEntity.long = entity.long
  dayEntity.short = entity.short
  dayEntity.save()
}

function _updateOpenInterest(timestamp: BigInt, increase: boolean, isLong: boolean, delta: BigInt): void {
  let dayTimestamp = timestampToDay(timestamp)
  let totalId = "total"
  let totalEntity = _loadOrCreateEntity(totalId, "total", dayTimestamp)

  if (isLong) {
    totalEntity.longOpenInterest = increase ? totalEntity.longOpenInterest + delta : totalEntity.longOpenInterest - delta
  } else {
    totalEntity.shortOpenInterest = increase ? totalEntity.shortOpenInterest + delta : totalEntity.shortOpenInterest - delta
  }
  totalEntity.save()

  let id = dayTimestamp.toString()
  let entity = _loadOrCreateEntity(id, "daily", dayTimestamp)

  entity.longOpenInterest = totalEntity.longOpenInterest
  entity.shortOpenInterest = totalEntity.shortOpenInterest
  entity.save()
}

export function handleIncreasePosition(event: IncreasePosition): void {
  _updateOpenInterest(event.block.timestamp, true, event.params.isLong, event.params.sizeDelta)
  _updateOpenInterestByToken(event.block.timestamp, true, event.params.isLong, event.params.sizeDelta, event.params.indexToken)
}

export function handleLiquidatePosition(event: LiquidatePosition): void {
  _updateOpenInterest(event.block.timestamp, false, event.params.isLong, event.params.size)
  _updateOpenInterestByToken(event.block.timestamp, false, event.params.isLong, event.params.size, event.params.indexToken)
  _storePnl(event.block.timestamp, -event.params.collateral, true)
}

export function handleDecreasePosition(event: DecreasePosition): void {
  _updateOpenInterest(event.block.timestamp, false, event.params.isLong, event.params.sizeDelta)
  _updateOpenInterestByToken(event.block.timestamp, false, event.params.isLong, event.params.sizeDelta, event.params.indexToken)
}

export function handleClosePosition(event: ClosePosition): void {
  _storePnl(event.block.timestamp, event.params.realisedPnl, false)
}

function _storePnl(timestamp: BigInt, pnl: BigInt, isLiquidated: boolean): void {
  let dayTimestamp = timestampToDay(timestamp)

  let totalId = "total"
  let totalEntity = _loadOrCreateEntity(totalId, "total", dayTimestamp)
  if (pnl > ZERO) {
    totalEntity.profit += pnl
    totalEntity.profitCumulative += pnl
  } else {
    totalEntity.loss -= pnl
    totalEntity.lossCumulative -= pnl
    if (isLiquidated) {
      totalEntity.liquidatedCollateral -= pnl
      totalEntity.liquidatedCollateralCumulative -= pnl
    }
  }
  totalEntity.timestamp = dayTimestamp.toI32()
  totalEntity.save()

  let id = dayTimestamp.toString()
  let entity = _loadOrCreateEntity(id, "daily", dayTimestamp)

  if (pnl > ZERO) {
    entity.profit += pnl
  } else {
    entity.loss -= pnl
    if (isLiquidated) {
      entity.liquidatedCollateral -= pnl
    }
  }
  entity.profitCumulative = totalEntity.profitCumulative
  entity.lossCumulative = totalEntity.lossCumulative
  entity.liquidatedCollateralCumulative = totalEntity.liquidatedCollateralCumulative
  entity.save()
}
