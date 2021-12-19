import { BigInt, TypedMap } from "@graphprotocol/graph-ts"
import {
  ChainlinkPrice,
  UniswapPrice
} from "../generated/schema"

export let BASIS_POINTS_DIVISOR = BigInt.fromI32(10000)
export let PRECISION = BigInt.fromI32(10).pow(30)

export let WETH = "0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB"
export let BTC = "0x50b7545627a5162F82A992c33b87aDc75187B218"
export let AVAX = "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7"
// export let LINK = ""
// export let UNI = ""
// export let USDT = ""
// export let USDC = ""
export let MIM = "0x130966628846BFd36ff31a822705796e8cb8C18D"
// export let SPELL = ""
// export let SUSHI = ""
// export let FRAX = ""
// export let DAI = ""
export let GMX = "0x62edc0692BD897D2295872a9FFCac5425011c661"

export function timestampToDay(timestamp: BigInt): BigInt {
  return timestamp / BigInt.fromI32(86400) * BigInt.fromI32(86400)
}

export function getTokenDecimals(token: String): u8 {
  let tokenDecimals = new Map<String, i32>()
  tokenDecimals.set(WETH, 18)
  tokenDecimals.set(BTC, 8)
  tokenDecimals.set(MIM, 18)
  tokenDecimals.set(AVAX, 18)
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
  prices.set(GMX, BigInt.fromI32(30) * PRECISION)

  return prices.get(token) as BigInt
}
