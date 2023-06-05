import { BigInt, TypedMap } from "@graphprotocol/graph-ts"
import {
  ChainlinkPrice,
  UniswapPrice
} from "../generated/schema"

export let BASIS_POINTS_DIVISOR = BigInt.fromI32(10000)
export let PRECISION = BigInt.fromI32(10).pow(30)

export let WETH = "0x2170Ed0880ac9A755fd29B2688956BD959F933F8"  // bsc
export let BTC = "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c"   // bsc
export let WBNB = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c"  // BNB bsc
export let USDC = "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d"  // bsc
export let USDT = "0x55d398326f99059fF775485246999027B3197955"  // bsc
export let XRP = "0x1D2F0da169ceB9fC7B3144628dB156f3F6c60dBE"   // bsc
export let CAKE = "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82"  // bsc
export let ADA = "0x3EE2200Efb3400fAbB9AacF31297cBdD1d435D47"   // bsc
export let MPX = "0x66eed5ff1701e6ed8470dc391f05e27b1d0657eb"   // alxMPX ---

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
  tokenDecimals.set(BTC, 18)
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
  prices.set(WETH, BigInt.fromI32(1500) * PRECISION)
  prices.set(BTC, BigInt.fromI32(22000) * PRECISION)
  prices.set(XRP, PRECISION)
  prices.set(ADA, PRECISION)
  prices.set(USDC, PRECISION)
  prices.set(USDT, PRECISION)
  prices.set(CAKE, PRECISION)
  prices.set(WBNB, PRECISION)
  prices.set(MPX, PRECISION)

  return prices.get(token) as BigInt
}
