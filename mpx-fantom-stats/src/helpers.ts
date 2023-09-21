import {BigInt, log, TypedMap} from "@graphprotocol/graph-ts"
import {
  ChainlinkPrice,
  UniswapPrice
} from "../generated/schema"

export let BASIS_POINTS_DIVISOR = BigInt.fromI32(10000)
export let PRECISION = BigInt.fromI32(10).pow(30)

// tokens without prefix are axelar tokens except ftm

export let LZWETH = "0x695921034f0387eac4e11620ee91b1b15a6a09fe"
export let WETH = "0xfe7eda5f2c56160d406869a8aa4b2f365d544c7b"
export let LZBTC = "0xf1648c50d2863f780c57849d812b4b7686031a3d"
export let BTC = "0x448d59b4302ab5d2dadf9611bed9457491926c8e"
export let WFTM = "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83"
export let LZUSDC = "0x28a92dde19d9989f39a49905d7c9c2fac7799bdf"
export let USDC = "0x1b6382dbdea11d97f24495c9a90b7c88469134a4"
export let LZUSDT = "0xcc1b99ddac1a33c201a742a1851662e87bc7f22c"
export let USDT = "0xd226392c23fb3476274ed6759d4a478db3197d82"
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
  let tokenDecimals = new Map<String, i32>()
  tokenDecimals.set(WETH, 18)
  tokenDecimals.set(LZWETH, 18)
  tokenDecimals.set(BTC, 8)
  tokenDecimals.set(LZBTC, 8)
  tokenDecimals.set(WFTM, 18)
  tokenDecimals.set(USDC, 6)
  tokenDecimals.set(LZUSDC, 6)
  tokenDecimals.set(USDT, 6)
  tokenDecimals.set(LZUSDT, 6)
  tokenDecimals.set(MPX, 18)

  // Check if the map has the token
  if(tokenDecimals.has(token)) {
    return tokenDecimals.get(token) as u8
  } else {
    // Return a default value or handle the missing key appropriately
    log.warning("Token not found in map: {}", [token])
    log.warning("Map contents: {}", [tokenDecimals.toString()])
    return 0 as u8 // or any sensible default
  }
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
  prices.set(LZWETH, BigInt.fromI32(1500) * PRECISION)
  prices.set(BTC, BigInt.fromI32(22000) * PRECISION)
  prices.set(LZBTC, BigInt.fromI32(22000) * PRECISION)
  prices.set(WFTM, PRECISION)
  prices.set(USDC, PRECISION)
  prices.set(LZUSDC, PRECISION)
  prices.set(USDT, PRECISION)
  prices.set(LZUSDT, PRECISION)
  prices.set(MPX, PRECISION)

  return prices.get(token) as BigInt
}
