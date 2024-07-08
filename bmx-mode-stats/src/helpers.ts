import { BigInt, TypedMap } from "@graphprotocol/graph-ts"
import {
  ChainlinkPrice,
  UniswapPrice
} from "../generated/schema"

export let BASIS_POINTS_DIVISOR = BigInt.fromI32(10000)
export let PRECISION = BigInt.fromI32(10).pow(30)

export let ETH = "0x4200000000000000000000000000000000000006"
export let weETH = "0x04c0599ae5a44757c0af6f9ec3b93da8976c150a"
export let BTC = "0xcdd475325d6f564d27247d1dddbb0dac6fa0a5cf"
export let MODE = "0xdfc7c877a950e49d2610114102175a06c2e3167a"
export let USDC = "0xd988097fb8612cc24eec14542bc03424c656005f"
export let BMX = "0x66eed5ff1701e6ed8470dc391f05e27b1d0657eb"


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

  return timestamp.div(periodTime.times(periodTime))
}

export function getTokenDecimals(token: String): u8 {
  let tokenDecimals = new Map<String, i32>()
  tokenDecimals.set(ETH, 18)
  tokenDecimals.set(weETH, 18)
  tokenDecimals.set(BTC, 8)
  tokenDecimals.set(MODE, 18)
  tokenDecimals.set(USDC, 6)
  tokenDecimals.set(BMX, 18)
  return tokenDecimals.get(token) as u8
}

export function getTokenAmountUsd(token: string, amount: BigInt): BigInt {
  let decimals = getTokenDecimals(token)
  let denominator = BigInt.fromI32(10).pow(decimals)
  let price = getTokenPrice(token)
  return (amount.times(price)).div(denominator)
}

export function getTokenPrice(token: string): BigInt {
  if (token != BMX) {
    let chainlinkPriceEntity = ChainlinkPrice.load(token)
    if (chainlinkPriceEntity != null) {
      // all chainlink prices have 8 decimals
      // adjusting them to fit GMX 30 decimals USD values
      return chainlinkPriceEntity.value.times(BigInt.fromI32(10).pow(22))
    }
  }

  if (token == BMX) {
    let uniswapPriceEntity = UniswapPrice.load(BMX)

    if (uniswapPriceEntity != null) {
      return uniswapPriceEntity.value
    }
  }

  let prices = new TypedMap<String, BigInt>()
  prices.set(ETH, BigInt.fromI32(3000).times(PRECISION))
  prices.set(weETH, BigInt.fromI32(3400).times(PRECISION))
  prices.set(BTC, BigInt.fromI32(58000).times(PRECISION))
  prices.set(MODE, BigInt.fromI32(1).times(PRECISION))
  prices.set(USDC, PRECISION)
  prices.set(BMX, PRECISION)
  return prices.get(token) as BigInt
}
