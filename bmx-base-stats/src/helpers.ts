import { BigInt, TypedMap } from "@graphprotocol/graph-ts"
import {
  ChainlinkPrice,
  UniswapPrice
} from "../generated/schema"

export let BASIS_POINTS_DIVISOR = BigInt.fromI32(10000)
export let PRECISION = BigInt.fromI32(10).pow(30)

// tokens without prefix are axelar tokens except ftm

export let DAI = "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb"
export let ETH = "0x4200000000000000000000000000000000000006"
export let BTC = "0x1a35EE4640b0A3B87705B0A4B45D227Ba60Ca2ad"
export let USDC = "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA"
export let BMX = "0x548f93779fBC992010C07467cBaf329DD5F059B7"


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
  tokenDecimals.set(ETH, 18)
  tokenDecimals.set(BTC, 8)
  tokenDecimals.set(USDC, 6)
  tokenDecimals.set(DAI, 18)
  tokenDecimals.set(BMX, 18)

  return tokenDecimals.get(token) as u8
}

export function getTokenAmountUsd(token: String, amount: BigInt): BigInt {
  let decimals = getTokenDecimals(token)
  let denominator = BigInt.fromI32(10).pow(decimals)
  let price = getTokenPrice(token)
  return amount * price / denominator
}

export function getTokenPrice(token: String): BigInt {
  if (token != BMX) {
    let chainlinkPriceEntity = ChainlinkPrice.load(token)
    if (chainlinkPriceEntity != null) {
      // all chainlink prices have 8 decimals
      // adjusting them to fit GMX 30 decimals USD values
      return chainlinkPriceEntity.value * BigInt.fromI32(10).pow(22)
    }
  }

  if (token == BMX) {
    let uniswapPriceEntity = UniswapPrice.load(BMX)

    if (uniswapPriceEntity != null) {
      return uniswapPriceEntity.value
    }
  }

  let prices = new TypedMap<String, BigInt>()
  prices.set(ETH, BigInt.fromI32(1500) * PRECISION)
  prices.set(BTC, BigInt.fromI32(22000) * PRECISION)
  prices.set(DAI, PRECISION)
  prices.set(USDC, PRECISION)
  prices.set(BMX, PRECISION)

  return prices.get(token) as BigInt
}
