import { BigInt, TypedMap } from "@graphprotocol/graph-ts"
import {
  ChainlinkPrice,
  UniswapPrice
} from "../generated/schema"

export let BASIS_POINTS_DIVISOR = BigInt.fromI32(10000)
export let PRECISION = BigInt.fromI32(10).pow(30)

// tokens without prefix are axelar tokens except ftm

export let LZWETH = "0x695921034f0387eAc4e11620EE91b1b15A6A09fE"
export let WETH = "0xfe7eDa5F2c56160d406869A8aA4B2F365d544C7B"
export let LZBTC = "0xf1648C50d2863f780c57849D812b4B7686031A3D"
export let BTC = "0x448d59B4302aB5d2dadf9611bED9457491926c8e"
export let WFTM = "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83"
export let LZUSDC = "0x28a92dde19D9989F39A49905d7C9C2FAc7799bDf"
export let USDC = "0x1B6382DBDEa11d97f24495C9A90b7c88469134a4"
export let LZUSDT = "0xcc1b99dDAc1a33c201a742A1851662E87BC7f22C"
export let USDT = "0xd226392C23fb3476274ED6759D4a478db3197d82"
export let MPX = "0x66eed5ff1701e6ed8470dc391f05e27b1d0657eb"


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
  if (token == LZBTC) {
    token = BTC
  }
  if (token == LZWETH) {
    token = WETH
  }
  if (token == LZUSDC) {
    token = USDC
  }
  if (token == LZUSDT) {
    token = USDT
  }

  let tokenDecimals = new Map<String, i32>()
  tokenDecimals.set(WETH, 18)
  tokenDecimals.set(BTC, 8)
  tokenDecimals.set(WFTM, 18)
  tokenDecimals.set(USDC, 6)
  tokenDecimals.set(USDT, 6)
  // tokenDecimals.set(DAI, 18)
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
  if (token == LZBTC) {
    token = BTC
  }
  if (token == LZWETH) {
    token = WETH
  }
  if (token == LZUSDC) {
    token = USDC
  }
  if (token == LZUSDT) {
    token = USDT
  }

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
  prices.set(WFTM, PRECISION)
  // prices.set(DAI, PRECISION)
  prices.set(USDC, PRECISION)
  prices.set(USDT, PRECISION)
  prices.set(MPX, PRECISION)

  return prices.get(token) as BigInt
}
