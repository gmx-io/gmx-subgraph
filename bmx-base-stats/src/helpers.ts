import { BigInt, TypedMap } from "@graphprotocol/graph-ts"
import {
  ChainlinkPrice,
  UniswapPrice
} from "../generated/schema"

export let BASIS_POINTS_DIVISOR = BigInt.fromI32(10000)
export let PRECISION = BigInt.fromI32(10).pow(30)

export let DAI = "0x50c5725949a6f0c72e6c4a641f24049a917db0cb"
export let ETH = "0x4200000000000000000000000000000000000006"
export let BTC = "0x1a35ee4640b0a3b87705b0a4b45d227ba60ca2ad"
export let cbETH = "0x2ae3f1ec7f1f5012cfeab0185bfc7aa3cf0dec22"
export let YFI = "0x9eaf8c1e34f05a589eda6bafdf391cf6ad3cb239"
export let AERO = "0x940181a94a35a4569e4529a3cdfb74e38fd98631"
export let MOG = "0x2da56acb9ea78330f947bd57c54119debda7af71"
export let EURC = "0x60a3e35cc302bfa44cb288bc5a4f316fdb1adb42"
export let cbBTC = "0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf"
export let WELL = "0xff8adec2221f9f4d8dfbafa6b9a297d17603493d"
export let USDbC = "0xd9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca"
export let USDC = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913"
export let BMX = "0x548f93779fbc992010c07467cbaf329dd5f059b7"


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
  if (token == USDbC) {
    token = USDC
  }

  let tokenDecimals = new Map<String, i32>()
  tokenDecimals.set(ETH, 18)
  tokenDecimals.set(BTC, 8)
  tokenDecimals.set(cbETH, 18)
  tokenDecimals.set(YFI, 18)
  tokenDecimals.set(AERO, 18)
  tokenDecimals.set(MOG, 18)
  tokenDecimals.set(EURC, 6)
  tokenDecimals.set(cbBTC, 8)
  tokenDecimals.set(WELL, 18)
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
  if (token == USDbC) {
    token = USDC
  }

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
  prices.set(cbETH, BigInt.fromI32(1600) * PRECISION)
  prices.set(YFI, BigInt.fromI32(5500) * PRECISION)
  prices.set(AERO, BigInt.fromI32(1) * PRECISION)
  prices.set(MOG, BigInt.fromI32(1) * PRECISION)
  prices.set(EURC, BigInt.fromI32(1) * PRECISION)
  prices.set(cbBTC, BigInt.fromI32(67500) * PRECISION)
  prices.set(WELL, BigInt.fromI32(1) * PRECISION)
  prices.set(DAI, PRECISION)
  prices.set(USDC, PRECISION)
  prices.set(BMX, PRECISION)

  return prices.get(token) as BigInt
}
