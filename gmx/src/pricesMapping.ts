import { BigInt } from "@graphprotocol/graph-ts"

import {
  ChainlinkPrice,
  FastPrice
} from "../generated/schema"

import {
  BASIS_POINTS_DIVISOR,
  PRECISION,
  WETH,
  BTC,
  LINK,
  UNI,
  USDT,
  USDC,
  getTokenPrice,
  getTokenDecimals
} from "./helpers"

import {
  AnswerUpdated as AnswerUpdatedEvent
} from '../generated/ChainlinkAggregatorBTC/ChainlinkAggregator'

import {
  SetPrice
} from '../generated/FastPriceFeed/FastPriceFeed'

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

export function handleAnswerUpdatedUNI(event: AnswerUpdatedEvent): void {
  _storeChainlinkPrice(UNI, event.params.current, event.block.timestamp)
}

export function handleAnswerUpdatedLINK(event: AnswerUpdatedEvent): void {
  _storeChainlinkPrice(LINK, event.params.current, event.block.timestamp)
}

export function handleSetPrice(event: SetPrice): void {
  let id = event.params.token.toHexString() + ":" + event.block.timestamp.toString()
  let entity = new FastPrice(id)
  entity.value = event.params.price
  entity.token = event.params.token.toHexString()
  entity.timestamp = event.block.timestamp.toI32()
  entity.period = "any"
  entity.save()

  let totalEntity = new FastPrice(event.params.token.toHexString())
  totalEntity.period = "last"
  totalEntity.value = event.params.price
  totalEntity.token = event.params.token.toHexString()
  totalEntity.timestamp = event.block.timestamp.toI32()
  totalEntity.save()
}
