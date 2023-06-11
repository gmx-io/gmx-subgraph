import { BigInt, ethereum, log } from "@graphprotocol/graph-ts"
import { AddLiquidity, RemoveLiquidity } from "../generated/GlpManager/GlpManager"
import { Transfer, Pricefeed, PriceLatest } from "../generated/schema"
import { getIntervalId, getIntervalIdentifier } from "./interval"
import * as erc20 from "../generated/transferGmx/ERC20"

export const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000'
export const ZERO_BYTES32 = "0x0000000000000000000000000000000000000000000000000000000000000000"

export const BASIS_POINTS_DIVISOR = BigInt.fromI32(10000)
export const FUNDING_RATE_PRECISION = BigInt.fromI32(1000000)
export const MARGIN_FEE_BASIS_POINTS = BigInt.fromI32(10)


export const ZERO_BI = BigInt.fromI32(0)
export const ONE_BI = BigInt.fromI32(1)
export const BI_18 = BigInt.fromI32(18)
export const BI_10 = BigInt.fromI32(10)

export const BI_12_PRECISION = BigInt.fromI32(10).pow(12)
export const BI_18_PRECISION = BigInt.fromI32(10).pow(18)
export const BI_22_PRECISION = BigInt.fromI32(10).pow(22)


export enum TokenDecimals {
  USDC = 18,
  USDT = 18,
  BTC = 18,
  WETH = 18,
  LINK = 18,
  UNI = 18,
  MIM = 18,
  SPELL = 18,
  SUSHI = 18,
  AVAX = 18,
  FRAX = 18,
  DAI = 18,
  GMX = 18,
  GLP = 18,
  MPX = 18,
  MLP = 18,
  EsMPX = 18,
  WFTM = 18,
  WBNB = 18,
  ADA = 18,
  CAKE = 18,
  XRP = 18
}


export enum intervalUnixTime {
  SEC = 1,
  SEC60 = 60,
  MIN5 = 300,
  MIN15 = 900,
  MIN30 = 1800,
  MIN60 = 3600,
  HR2 = 7200,
  HR4 = 14400,
  HR8 = 28800,
  HR24 = 86400,
  DAY7 = 604800,
  MONTH = 2628000,
  MONTH2 = 5256000
}



export function negate(n: BigInt): BigInt {
  return n.abs().times(BigInt.fromI32(-1))
}

export function timestampToDay(timestamp: BigInt): BigInt {
  return BigInt.fromI32(86400).times(BigInt.fromI32(86400)).div(timestamp)
}


export function getTokenUsdAmount(amount: BigInt, tokenAddress: string, decimals: TokenDecimals): BigInt {
  const priceUsd = getTokenPrice(tokenAddress)
  const denominator = BigInt.fromI32(10).pow(decimals as u8)

  return amount.times(priceUsd).div(denominator)
}


export function getTokenPrice(tokenAddress: string): BigInt {
  const chainlinkPriceEntity = PriceLatest.load(tokenAddress)

  if (chainlinkPriceEntity == null) {
    log.warning(`Pricefeed doesn't exist: ${tokenAddress}`, [])
    return ONE_BI
  }

  return chainlinkPriceEntity.value
}


export function getIdFromEvent(event: ethereum.Event): string {
  return event.transaction.hash.toHexString() + ':' + event.logIndex.toString()
}

export function calculatePositionDelta(marketPrice: BigInt, isLong: boolean, size: BigInt, averagePrice: BigInt): BigInt {
  const priceDelta = averagePrice.gt(marketPrice) ? averagePrice.minus(marketPrice) : marketPrice.minus(averagePrice)

  if (priceDelta.equals(ZERO_BI) || averagePrice.equals(ZERO_BI)) {
    return ZERO_BI
  }

  const hasProfit = isLong ? marketPrice > averagePrice : marketPrice < averagePrice
  const delta = size.times(priceDelta).div(averagePrice)

  return hasProfit ? delta : negate(delta)
}

export function calculatePositionDeltaPercentage(delta: BigInt, collateral: BigInt): BigInt {
  if (collateral.equals(ZERO_BI)) {
    return ZERO_BI
  }

  return delta.times(BASIS_POINTS_DIVISOR).div(collateral)
}

export function _storePriceLatest(tokenAddress: string, price: BigInt, event: ethereum.Event): PriceLatest {
  let entity = PriceLatest.load(tokenAddress)
  if (entity === null) {
    entity = new PriceLatest(tokenAddress)
  }

  entity.timestamp = event.block.timestamp.toI32()
  entity.value = price
  entity.save()

  return entity
}

export function _storePricefeed(event: ethereum.Event, token: string, interval: intervalUnixTime, price: BigInt): void {
  const intervalID = getIntervalId(interval, event)
  const id = getIntervalIdentifier(event, token, interval)

  let entity = Pricefeed.load(id)
  if (entity == null) {
    entity = new Pricefeed(id)

    entity.interval = '_' + interval.toString()
    entity.tokenAddress = '_' + token
    entity.timestamp = intervalID * interval
    entity.o = price
    entity.h = price
    entity.l = price
  }

  if (price > entity.h) {
    entity.h = price
  }

  if (price < entity.l) {
    entity.l = price
  }

  entity.c = price

  entity.save()
}

export function _storeGlpAddLiqPricefeed(priceFeed: string, event: AddLiquidity): void {
  const price = event.params.aumInUsdg.equals(ZERO_BI)
    ? ONE_BI :
    event.params.aumInUsdg.times(BI_18_PRECISION).div(event.params.glpSupply).times(BI_12_PRECISION)

  _storeDefaultPricefeed(priceFeed, event, price)
}

export function _storeGlpRemoveLiqPricefeed(priceFeed: string, event: RemoveLiquidity): void {
  const price = event.params.aumInUsdg.equals(ZERO_BI)
    ? ONE_BI :
    event.params.aumInUsdg.times(BI_18_PRECISION).div(event.params.glpSupply).times(BI_12_PRECISION)

  _storeDefaultPricefeed(priceFeed, event, price)
}

export function _storeDefaultPricefeed(tokenAddress: string, event: ethereum.Event, price: BigInt): void {
  _storePriceLatest(tokenAddress, price, event)

  _storePricefeed(event, tokenAddress, intervalUnixTime.MIN5, price)
  _storePricefeed(event, tokenAddress, intervalUnixTime.MIN15, price)
  _storePricefeed(event, tokenAddress, intervalUnixTime.MIN60, price)
  _storePricefeed(event, tokenAddress, intervalUnixTime.HR4, price)
  _storePricefeed(event, tokenAddress, intervalUnixTime.HR24, price)
  _storePricefeed(event, tokenAddress, intervalUnixTime.DAY7, price)
}

export const uniqueEventId = (ev: ethereum.Event): string => ev.transaction.hash.toHex() + ':' + ev.logIndex.toString()


export function _storeERC20Transfer(token: string, event: erc20.Transfer, amountUsd: BigInt): void {
  const from = event.params.from.toHexString()
  const to = event.params.to.toHexString()
  const id = uniqueEventId(event)

  const transfer = new Transfer(id)
  transfer.token = token
  transfer.from = from
  transfer.to = to
  transfer.amount = event.params.value
  transfer.amountUsd = amountUsd
  transfer.timestamp = event.block.timestamp

  transfer.save()
}
