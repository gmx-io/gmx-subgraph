import { Address, BigInt } from "@graphprotocol/graph-ts"
import {
  FastPriceEvents,
  PriceUpdate
} from "../generated/FastPriceEvents/FastPriceEvents"
import { PriceCandle } from "../generated/schema"

function timestampToPeriodStart(timestamp: BigInt, period: string): BigInt {
  let seconds = periodToSeconds(period)
  return timestamp / seconds * seconds

}
function periodToSeconds(period: string): BigInt {
  let seconds: BigInt
  if (period == "5m") {
    seconds = BigInt.fromI32(5 * 60)
  } else if (period == "15m") {
    seconds = BigInt.fromI32(15 * 60)
  } else if (period == "1h") {
    seconds = BigInt.fromI32(60 * 60)
  } else if (period == "4h") {
    seconds = BigInt.fromI32(4 * 60 * 60)
  } else if (period == "1d") {
    seconds = BigInt.fromI32(24 * 60 * 60)
  } else {
    throw new Error("Invalid period")
  }
  return seconds
}

function getId(token: Address, period: string, periodStart: BigInt): string {
  return token.toHexString() + ":" + period + ":" + periodStart.toString()
}

function updateCandle(event: PriceUpdate, period: string): void {
  let periodStart = timestampToPeriodStart(event.block.timestamp, period)
  let id = getId(event.params.token, period, periodStart)
  let entity = PriceCandle.load(id)

  if (entity == null) {
    let prevId = getId(event.params.token, period, periodStart - periodToSeconds(period))
    let prevEntity = PriceCandle.load(prevId)
    
    entity = new PriceCandle(id)
    
    entity.period = period
    
    if (prevEntity == null) {
      entity.open = event.params.price
    } else {
      entity.open = prevEntity.close
    }
    entity.high = event.params.price
    entity.low = event.params.price
    entity.close = event.params.price
    entity.timestamp = periodStart.toI32()
    entity.token = event.params.token.toHexString()
  } else {
    if (entity.high < event.params.price) {
      entity.high = event.params.price
    }
    if (entity.low > event.params.price) {
      entity.low = event.params.price
    }
    entity.close = event.params.price
  }

  entity.save()
}

export function handlePriceUpdate(event: PriceUpdate): void {
  updateCandle(event, "5m")
  updateCandle(event, "15m")
  updateCandle(event, "1h")
  updateCandle(event, "4h")
  updateCandle(event, "1d")
}
