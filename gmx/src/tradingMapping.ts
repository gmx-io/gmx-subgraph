import { BigInt } from "@graphprotocol/graph-ts"

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
    entity.cumulativeProfit = BigInt.fromI32(0)
    entity.cumulativeLoss = BigInt.fromI32(0)
    entity.longOpenInterest = BigInt.fromI32(0)
    entity.shortOpenInterest = BigInt.fromI32(0)
  }
  entity.timestamp = timestamp.toI32()
  return entity as TradingStat
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
}

export function handleLiquidatePosition(event: LiquidatePosition): void {
  _updateOpenInterest(event.block.timestamp, false, event.params.isLong, event.params.size)
  _storePnl(event.block.timestamp, -event.params.collateral)
}

export function handleDecreasePosition(event: DecreasePosition): void {
  _updateOpenInterest(event.block.timestamp, false, event.params.isLong, event.params.sizeDelta)
}

export function handleClosePosition(event: ClosePosition): void {
  _storePnl(event.block.timestamp, event.params.realisedPnl)
}

function _storePnl(timestamp: BigInt, realisedPnl: BigInt): void {
  let dayTimestamp = timestampToDay(timestamp)

  let totalId = "total"
  let totalEntity = _loadOrCreateEntity(totalId, "total", dayTimestamp)
  let pnl = realisedPnl
  if (pnl > ZERO) {
    totalEntity.profit += pnl
    totalEntity.cumulativeProfit += pnl
  } else {
    totalEntity.loss -= pnl
    totalEntity.cumulativeLoss -= pnl
  }
  totalEntity.timestamp = dayTimestamp.toI32()
  totalEntity.save()

  let id = dayTimestamp.toString()
  let entity = _loadOrCreateEntity(id, "daily", dayTimestamp)

  if (pnl > ZERO) {
    entity.profit += pnl
  } else {
    entity.loss -= pnl
  }
  entity.cumulativeProfit = totalEntity.cumulativeProfit
  entity.cumulativeLoss = totalEntity.cumulativeLoss
  entity.save()
}
