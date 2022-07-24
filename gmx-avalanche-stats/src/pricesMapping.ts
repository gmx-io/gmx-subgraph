import { BigInt, Address } from "@graphprotocol/graph-ts"

import {
  ChainlinkPrice,
  FastPrice,
  UniswapPrice
} from "../generated/schema"

import {
  BASIS_POINTS_DIVISOR,
  PRECISION,
  WETH,
  BTC,
  AVAX,
  GMX,
  getTokenAmountUsd,
  timestampToPeriod
} from "./helpers"

import {
  AnswerUpdated as AnswerUpdatedEvent
} from '../generated/ChainlinkAggregatorBTC/ChainlinkAggregator'

import {
  PriceUpdate
} from '../generated/FastPriceEvents/FastPriceEvents'

import {
  Swap as UniswapSwap
} from '../generated/UniswapPool/UniswapPoolV3'

function _storeChainlinkPrice(token: string, value: BigInt, timestamp: BigInt): void {
  let id = token + ":" + timestamp.toString()
  let entity = new ChainlinkPrice(id)
  entity.value = value
  entity.period = "any"
  entity.token = token
  entity.timestamp = timestamp.toI32()
  entity.save()

  let totalId = token
  let totalEntity = new ChainlinkPrice(token)
  totalEntity.value = value
  totalEntity.period = "last"
  totalEntity.token = token
  totalEntity.timestamp = timestamp.toI32()
  totalEntity.save()
}

export function handleAnswerUpdatedBTC(event: AnswerUpdatedEvent): void {
  _storeChainlinkPrice(BTC, event.params.current, event.block.timestamp)
}

export function handleAnswerUpdatedETH(event: AnswerUpdatedEvent): void {
  _storeChainlinkPrice(WETH, event.params.current, event.block.timestamp)
}

export function handleAnswerUpdatedAVAX(event: AnswerUpdatedEvent): void {
  _storeChainlinkPrice(AVAX, event.params.current, event.block.timestamp)
}

function _storeUniswapPrice(id: string, token: string, price: BigInt, period: string, timestamp: BigInt): void {
  let entity = UniswapPrice.load(id)
  if (entity == null) {
    entity = new UniswapPrice(id)
  }

  entity.timestamp = timestamp.toI32()
  entity.value = price
  entity.token = token
  entity.period = period
  entity.save()
}

export function handleUniswapGmxEthSwap(event: UniswapSwap): void {
  let ethPerGmx = -(event.params.amount0 * BigInt.fromI32(10).pow(18) / event.params.amount1) * BigInt.fromI32(100) / BigInt.fromI32(99)
  let gmxPrice = getTokenAmountUsd(WETH, ethPerGmx)

  let totalId = GMX
  _storeUniswapPrice(totalId, GMX, gmxPrice, "last", event.block.timestamp)

  let id = GMX + ":" + event.block.timestamp.toString()
  _storeUniswapPrice(id, GMX, gmxPrice, "any", event.block.timestamp)
}

function _handleFastPriceUpdate(token: Address, price: BigInt, timestamp: BigInt): void {
  let dailyTimestampGroup = timestampToPeriod(timestamp, "daily")
  _storeFastPrice(dailyTimestampGroup.toString() + ":daily:" + token.toHexString(), token, price, dailyTimestampGroup, "daily")

  let hourlyTimestampGroup = timestampToPeriod(timestamp, "hourly")
  _storeFastPrice(hourlyTimestampGroup.toString() + ":hourly:" + token.toHexString(), token, price, hourlyTimestampGroup, "hourly")

  _storeFastPrice(timestamp.toString() + ":any:" + token.toHexString(), token, price, timestamp, "any")
  _storeFastPrice(token.toHexString(), token, price, timestamp, "last")
}

function _storeFastPrice(id: string, token: Address, price: BigInt, timestampGroup: BigInt, period: string): void {
  let entity = new FastPrice(id)
  entity.period = period
  entity.value = price
  entity.token = token.toHexString()
  entity.timestamp = timestampGroup.toI32()
  entity.save()
}

export function handlePriceUpdate(event: PriceUpdate): void {
  _handleFastPriceUpdate(event.params.token, event.params.price, event.block.timestamp)
}

