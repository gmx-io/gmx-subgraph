import { BigInt, TypedMap } from "@graphprotocol/graph-ts"
import {
  ChainlinkPrice
} from "../generated/schema"

export let BASIS_POINTS_DIVISOR = BigInt.fromString("10000")
export let PRECISION = BigInt.fromString("10").pow(30)

export let BTC = '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c'
export let ETH = '0x2170ed0880ac9a755fd29b2688956bd959f933f8'
export let WBNB = '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c'
export let BUSD = '0xe9e7cea3dedca5984780bafc599bd69add087d56'
export let USDC = '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d'
export let USDT = '0x55d398326f99059ff775485246999027b3197955'

export function getHourId(timestamp: BigInt): string {
  let hourTimestamp = timestamp.toI32() / 3600 * 3600
  return hourTimestamp.toString()
}

export function getDayId(timestamp: BigInt): string {
  return timestampToDay(timestamp).toString()
}

export function timestampToDay(timestamp: BigInt): BigInt {
  return timestamp / BigInt.fromI32(86400) * BigInt.fromI32(86400)
}

export function isStable(token: string): boolean {
  return token == BUSD || token == USDC || token == USDT
}

export function getTokenDecimals(token: String): u8 {
  let tokenDecimals = new Map<String, i32>()
  tokenDecimals.set(ETH, 18)
  tokenDecimals.set(BTC, 18)
  tokenDecimals.set(WBNB, 18)
  tokenDecimals.set(BUSD, 18)
  tokenDecimals.set(USDC, 18)
  tokenDecimals.set(USDT, 18)
  return tokenDecimals.get(token) as u8
}

export function getTokenAmountUsd(token: String, amount: BigInt): BigInt {
  let decimals = getTokenDecimals(token)
  let denominator = BigInt.fromString("10").pow(decimals)
  let price = getTokenPrice(token)
  return amount * price / denominator
}

export function getTokenPrice(token: String): BigInt {
  let entity = ChainlinkPrice.load(token)
  if (entity != null) {
    // all chainlink prices have 8 decimals
    // adjusting them to fit GMX 30 decimals USD values
    return entity.value * BigInt.fromString("10").pow(22)
  }
  let defaultPrices = new TypedMap<String, BigInt>()
  defaultPrices.set(ETH, BigInt.fromString("3300") * PRECISION)
  defaultPrices.set(BTC, BigInt.fromString("55000") * PRECISION)
  defaultPrices.set(WBNB, BigInt.fromString("550") * PRECISION)
  defaultPrices.set(BUSD, PRECISION)
  defaultPrices.set(USDC, PRECISION)
  defaultPrices.set(USDT, PRECISION)

  return defaultPrices.get(token) as BigInt
}
