import { BigInt, TypedMap } from "@graphprotocol/graph-ts"
import {
  ChainlinkPrice,
  UniswapPrice
} from "../generated/schema"

export let BASIS_POINTS_DIVISOR = BigInt.fromI32(10000)
export let PRECISION = BigInt.fromI32(10).pow(30)

export let ReferralStorage = "0xb795e91daefd6a7edeac3060513d93ce7617370a"
export let WETH = "0x2170ed0880ac9a755fd29b2688956bd959f933f8"
export let WBTC = "0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c"
export let WBNB = "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c"
export let MPX = "0x94c6b279b5df54b335ae51866d6e2a56bf5ef9b7"
export let EsMPX = "0x620e501f70cc0989f7c6a700c457b0fa0207b51b"
export let MLP = "0xbd1dcec2103675c8f3953c34ae40ed907e1dcac2"
export let XRP = "0x1d2f0da169ceb9fc7b3144628db156f3f6c60dbe"
export let CAKE = "0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82"
export let ADA = "0x3ee2200efb3400fabb9aacf31297cbdd1d435d47"
export let USDC = "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d"
export let USDT = "0x55d398326f99059ff775485246999027b3197955"

export function timestampToDay(timestamp: BigInt): BigInt {
  return timestampToPeriod(timestamp, "daily")
}

export function timestampToPeriod(timestamp: BigInt, period: string): BigInt {
  let periodTime: BigInt

  if (period == "daily") {
    periodTime = BigInt.fromI32(86400)
  } else if (period == "hourly") {
    periodTime = BigInt.fromI32(3600)
  } else if (period == "weekly") {
    periodTime = BigInt.fromI32(86400 * 7)
  } else {
    throw new Error("Unsupported period " + period)
  }

  return timestamp / periodTime * periodTime
}

export function getTokenDecimals(token: String): u8 {
  let tokenDecimals = new Map<String, i32>()
  tokenDecimals.set(WETH, 18)
  tokenDecimals.set(WBTC, 18)
  tokenDecimals.set(XRP, 18)
  tokenDecimals.set(ADA, 18)
  tokenDecimals.set(USDC, 18)
  tokenDecimals.set(USDT, 18)
  tokenDecimals.set(CAKE, 18)
  tokenDecimals.set(WBNB, 18)
  tokenDecimals.set(MPX, 18)
  return tokenDecimals.get(token) as u8
}

export function getTokenAmountUsd(token: String, amount: BigInt): BigInt {
  let decimals = getTokenDecimals(token)
  let denominator = BigInt.fromI32(10).pow(decimals)
  let price = getTokenPrice(token)
  return amount * price / denominator
}

export function getTokenPrice(token: String): BigInt {
  if (token != MPX) {
    let chainlinkPriceEntity = ChainlinkPrice.load(token)
    if (chainlinkPriceEntity != null) {
      // all chainlink prices have 8 decimals
      // adjusting them to fit GMX 30 decimals USD values
      return chainlinkPriceEntity.value * BigInt.fromI32(10).pow(22)
    }
  }

  if (token == MPX) {
    let uniswapPriceEntity = UniswapPrice.load(MPX)

    if (uniswapPriceEntity != null) {
      return uniswapPriceEntity.value
    }
  }

  let prices = new TypedMap<String, BigInt>()
  prices.set(WETH, BigInt.fromI32(1800) * PRECISION)
  prices.set(WBTC, BigInt.fromI32(26000) * PRECISION)
  prices.set(XRP, PRECISION)
  prices.set(ADA, BigInt.fromI32(35) * PRECISION)
  prices.set(USDC, PRECISION)
  prices.set(USDT, PRECISION)
  prices.set(CAKE, PRECISION)
  prices.set(WBNB, PRECISION)
  prices.set(MPX, PRECISION)

  return prices.get(token) as BigInt
}
