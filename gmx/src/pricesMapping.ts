import { BigInt } from "@graphprotocol/graph-ts"

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
  LINK,
  UNI,
  USDT,
  USDC,
  MIM,
  SPELL,
  SUSHI,
  DAI,
  GMX,
  getTokenAmountUsd
} from "./helpers"

import {
  AnswerUpdated as AnswerUpdatedEvent
} from '../generated/ChainlinkAggregatorBTC/ChainlinkAggregator'

import {
  SetPrice
} from '../generated/FastPriceFeed/FastPriceFeed'

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

export function handleAnswerUpdatedUNI(event: AnswerUpdatedEvent): void {
  _storeChainlinkPrice(UNI, event.params.current, event.block.timestamp)
}

export function handleAnswerUpdatedLINK(event: AnswerUpdatedEvent): void {
  _storeChainlinkPrice(LINK, event.params.current, event.block.timestamp)
}

export function handleAnswerUpdatedSPELL(event: AnswerUpdatedEvent): void {
  _storeChainlinkPrice(SPELL, event.params.current, event.block.timestamp)
}

export function handleAnswerUpdatedMIM(event: AnswerUpdatedEvent): void {
  _storeChainlinkPrice(MIM, event.params.current, event.block.timestamp)
}

export function handleAnswerUpdatedDAI(event: AnswerUpdatedEvent): void {
  _storeChainlinkPrice(DAI, event.params.current, event.block.timestamp)
}

export function handleAnswerUpdatedSUSHI(event: AnswerUpdatedEvent): void {
  _storeChainlinkPrice(SUSHI, event.params.current, event.block.timestamp)
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
