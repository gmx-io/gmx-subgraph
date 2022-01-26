import { BigInt, TypedMap } from "@graphprotocol/graph-ts"
import {
  ChainlinkPrice,
  UniswapPrice
} from "../generated/schema"

export let BASIS_POINTS_DIVISOR = BigInt.fromI32(10000)
export let PRECISION = BigInt.fromI32(10).pow(30)

export let WETH = "0x49d5c2bdffac6ce2bfdb6640f4f80f226bc10bab"
export let BTC = "0x50b7545627a5162f82a992c33b87adc75187b218"
export let AVAX = "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7"
// export let LINK = ""
// export let UNI = ""
// export let USDT = ""
// export let USDC = ""
export let MIM = "0x130966628846bfd36ff31a822705796e8cb8c18d"
// export let SPELL = ""
// export let SUSHI = ""
// export let FRAX = ""
// export let DAI = ""
export let GMX = "0x62edc0692bd897d2295872a9ffcac5425011c661"
export let USDC_E = "0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664"
export let USDC = "0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e"

export function timestampToDay(timestamp: BigInt): BigInt {
  return timestampToPeriod(timestamp, "daily")
}

export function timestampToPeriod(timestamp: BigInt, period: string): BigInt {
  let periodTime: BigInt

  if (period == "daily") {
    periodTime = BigInt.fromI32(86400)
  } else if (period == "hourly") {
    periodTime = BigInt.fromI32(3600)
  } else if (period == "weekly" ){
    periodTime = BigInt.fromI32(86400 * 7)
  }

  return timestamp / periodTime * periodTime
}

export function getTokenDecimals(token: String): u8 {
  let tokenDecimals = new Map<String, i32>()
  tokenDecimals.set(WETH, 18)
  tokenDecimals.set(BTC, 8)
  tokenDecimals.set(MIM, 18)
  tokenDecimals.set(AVAX, 18)
  tokenDecimals.set(USDC_E, 6)
  tokenDecimals.set(USDC, 6)
  tokenDecimals.set(GMX, 18)

  return tokenDecimals.get(token) as u8
}

export function getTokenAmountUsd(token: String, amount: BigInt): BigInt {
  let decimals = getTokenDecimals(token)
  let denominator = BigInt.fromI32(10).pow(decimals)
  let price = getTokenPrice(token)
  return amount * price / denominator
}

export function getTokenPrice(token: String): BigInt {
  if (token != GMX) {
    let chainlinkPriceEntity = ChainlinkPrice.load(token)
    if (chainlinkPriceEntity != null) {
      // all chainlink prices have 8 decimals
      // adjusting them to fit GMX 30 decimals USD values
      return chainlinkPriceEntity.value * BigInt.fromI32(10).pow(22)
    }
  }

  if (token == GMX) {
    let uniswapPriceEntity = UniswapPrice.load(GMX)

    if (uniswapPriceEntity != null) {
      return uniswapPriceEntity.value
    }
  }

  let prices = new TypedMap<String, BigInt>()
  prices.set(WETH, BigInt.fromI32(4000) * PRECISION)
  prices.set(BTC, BigInt.fromI32(50000) * PRECISION)
  prices.set(AVAX, BigInt.fromI32(100) * PRECISION)
  prices.set(MIM, PRECISION)
  prices.set(USDC_E, PRECISION)
  prices.set(USDC, PRECISION)
  prices.set(GMX, BigInt.fromI32(30) * PRECISION)

  return prices.get(token) as BigInt
}
