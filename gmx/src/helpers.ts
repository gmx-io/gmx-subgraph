import { BigInt, TypedMap } from "@graphprotocol/graph-ts"
import {
  ChainlinkPrice
} from "../generated/schema"

export let BASIS_POINTS_DIVISOR = BigInt.fromString("10000")
export let PRECISION = BigInt.fromString("10").pow(30)

export let WETH = "0x82af49447d8a07e3bd95bd0d56f35241523fbab1"
export let BTC = "0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f"
export let LINK = "0xf97f4df75117a78c1a5a0dbb814af92458539fb4"
export let UNI = "0xfa7f8980b0f1e64a2062791cc3b0871572f1f7f0"
export let USDT = "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9"
export let USDC = "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8"

export function getTokenDecimals(token: String): u8 {
  let tokenDecimals = new Map<String, i32>()
  tokenDecimals.set(WETH, 18)
  tokenDecimals.set(BTC, 8)
  tokenDecimals.set(LINK, 18)
  tokenDecimals.set(UNI, 18)
  tokenDecimals.set(USDC, 6)
  tokenDecimals.set(USDT, 6)

  return tokenDecimals.get(token) as u8
}

export function getTokenAmountUsd(token: String, amount: BigInt): BigInt {
  let decimals = getTokenDecimals(token)
  let denominator = BigInt.fromString("10").pow(decimals)
  let price = getTokenPrice(token)
  return amount * price / denominator
}

export function getTokenPrice(token: String): BigInt {
  let chainlinkPriceEntity = ChainlinkPrice.load(token)
  if (chainlinkPriceEntity != null) {
    // all chainlink prices have 8 decimals
    // adjusting them to fit GMX 30 decimals USD values
    return chainlinkPriceEntity.value * BigInt.fromString("10").pow(22)
  }

  let prices = new TypedMap<String, BigInt>()
  prices.set(WETH, BigInt.fromString("3350") * PRECISION)
  prices.set(BTC, BigInt.fromString("45000") * PRECISION)
  prices.set(LINK, BigInt.fromString("25") * PRECISION)
  prices.set(UNI, BigInt.fromString("23") * PRECISION)
  prices.set(USDC, PRECISION)
  prices.set(USDT, PRECISION)

  return prices.get(token) as BigInt
}
