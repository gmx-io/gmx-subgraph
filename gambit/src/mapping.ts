import { BigInt, TypedMap, Address } from "@graphprotocol/graph-ts"

import {
  Vault,
  BuyUSDG,
  SellUSDG,
  IncreasePosition,
  DecreasePosition,
  LiquidatePosition,
  Swap
} from "../generated/Vault/Vault"
import { Token } from "../generated/Vault/Token"
import {
  HourlyPoolStat,
  VolumeStat,
  FeeStat,
  ChainlinkPrice,
  FeeBasisPoint
} from "../generated/schema"
import {
  AnswerUpdated as AnswerUpdatedEvent
} from '../generated/ChainlinkAggregatorBTC/ChainlinkAggregator'

import {
  WBNB,
  ETH,
  BTC,
  getDayId,
  getHourId,
  getTokenAmountUsd,
  isStable
} from "./helpers"

let a = 1
let BASIS_POINTS_DIVISOR = BigInt.fromI32(10000)
let VAULT = "0xc73A8DcAc88498FD4b4B1b2AaA37b0a2614Ff67B"

let tokens = new Array<string>(6)
tokens[0] = '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c'
tokens[1] = '0x2170Ed0880ac9A755fd29B2688956BD959F933F8'
tokens[2] = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'
tokens[3] = '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56'
tokens[4] = '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d'
tokens[5] = '0x55d398326f99059fF775485246999027B3197955'

let tokenNames = new Array<string>(6)
tokenNames[0] = 'BTC'
tokenNames[1] = 'ETH'
tokenNames[2] = 'BNB'
tokenNames[3] = 'BUSD'
tokenNames[4] = 'USDC'
tokenNames[5] = 'USDT'

let ZERO = BigInt.fromI32(0)
let USDG = "0x85E76cbf4893c1fbcB34dCF1239A91CE2A4CF5a7"
let USDG_ADDRESS = Address.fromString(USDG)

function getSwapFeeBasisPoints(tokenA: string, tokenB: string, timestamp: BigInt): BigInt {
  let isStableSwap = isStable(tokenA) && isStable(tokenB)
  let feeBasisPointsEntity = _getFeeBasisPoints(timestamp)
  return isStableSwap ? feeBasisPointsEntity.stableSwap : feeBasisPointsEntity.swap
}

function getMarginFeeBasisPoints(timestamp: BigInt): BigInt {
  let feeBasisPointsEntity = _getFeeBasisPoints(timestamp)
  return feeBasisPointsEntity.margin
}

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
  _storeChainlinkPrice(ETH, event.params.current, event.block.timestamp)
}

export function handleAnswerUpdatedBNB(event: AnswerUpdatedEvent): void {
  _storeChainlinkPrice(WBNB, event.params.current, event.block.timestamp)
}

export function handleIncreasePosition(event: IncreasePosition): void {
  _storeVolume("margin", event.block.timestamp, event.params.sizeDelta)
  let feeBasisPoints = _getFeeBasisPoints(event.block.timestamp)
  let fee = event.params.sizeDelta * getMarginFeeBasisPoints(event.block.timestamp) / BASIS_POINTS_DIVISOR
  _storeFees("margin", event.block.timestamp, fee)
}

export function handleDecreasePosition(event: DecreasePosition): void {
  _storeVolume("margin", event.block.timestamp, event.params.sizeDelta)
  let fee = event.params.sizeDelta * getMarginFeeBasisPoints(event.block.timestamp) / BASIS_POINTS_DIVISOR
  _storeFees("margin", event.block.timestamp, fee)
}

export function handleLiquidatePosition(event: LiquidatePosition):void {
  _storeVolume("liquidation", event.block.timestamp, event.params.size)

  // it's incorrect
  // let fee = event.params.collateral
  // _storeFees("liquidation", event.block.timestamp, fee)
}

export function handleSellUSDG(event: SellUSDG): void {
  _updatePoolStats(event.block.timestamp, event.address)

  let volume = event.params.usdgAmount * BigInt.fromString("1000000000000")
  _storeVolume("burn", event.block.timestamp, volume)

  let fee = volume * getSwapFeeBasisPoints(USDG, event.params.token.toHexString(), event.block.timestamp) / BASIS_POINTS_DIVISOR
  _storeFees("burn", event.block.timestamp, fee)
}

export function handleSwap(event: Swap): void {
  _updatePoolStats(event.block.timestamp, event.address)

  let volume = getTokenAmountUsd(event.params.tokenIn.toHexString(), event.params.amountIn)
  _storeVolume("swap", event.block.timestamp, volume)

  let fee = volume * getSwapFeeBasisPoints(event.params.tokenIn.toHexString(), event.params.tokenOut.toHexString(), event.block.timestamp) / BASIS_POINTS_DIVISOR
  _storeFees("swap", event.block.timestamp, fee)
}

export function handleBuyUSDG(event: BuyUSDG): void {
  _updatePoolStats(event.block.timestamp, event.address)

  let volume = event.params.usdgAmount * BigInt.fromString("1000000000000")
  _storeVolume("mint", event.block.timestamp, volume)
  let basisPoints = getSwapFeeBasisPoints(USDG, event.params.token.toHexString(), event.block.timestamp)
  let fee = volume * basisPoints / BASIS_POINTS_DIVISOR
  _storeFees("mint", event.block.timestamp, fee)
}

function _updatePoolStats(timestamp: BigInt, vaultAddress: Address): void {
  let id = getHourId(timestamp)
  let entity = HourlyPoolStat.load(id)

  if (entity) {
    let entityTimestamp = BigInt.fromString(entity.id)
    let THRESHOLD = BigInt.fromI32(86400 * 3)
    if (entityTimestamp > timestamp - THRESHOLD) {
      return
    }
  }

  if (entity == null) {
    entity = new HourlyPoolStat(id)
  }

  let usdgContract = Token.bind(USDG_ADDRESS)
  entity.usdgSupply = usdgContract.totalSupply()

  let contract = Vault.bind(vaultAddress)
  for (let i = 0; i < tokens.length; i++) {
    let tokenAddress = Address.fromString(tokens[i])
    let tokenName = tokenNames[i]
    let poolAmount = contract.poolAmounts(tokenAddress)
    let price = contract.getMaxPrice(tokenAddress)
    let decimals = contract.tokenDecimals(tokenAddress)
    let denominator = BigInt.fromString("10").pow(decimals.toI32() as u8)
    let tokenUsd = poolAmount * price / denominator
    entity.setBigInt(tokenName, tokenUsd)
  }

  entity.save()
}

function _storeVolume(type: string, timestamp: BigInt, volume: BigInt): void {
  let id = getDayId(timestamp)
  let entity = _getOrCreateVolumeStat(id, "daily")
  entity.setBigInt(type, entity.getBigInt(type) + volume)
  entity.save()

  let totalEntity = _getOrCreateVolumeStat("total", "total")
  totalEntity.setBigInt(type, totalEntity.getBigInt(type) + volume)
  totalEntity.save()
}

function _storeFees(type: string, timestamp: BigInt, fees: BigInt): void {
  let id = getDayId(timestamp)
  let entity = _getOrCreateFeeStat(id, "daily")
  entity.setBigInt(type, entity.getBigInt(type) + fees)
  entity.save()

  let totalEntity = _getOrCreateFeeStat("total", "total")
  totalEntity.setBigInt(type, totalEntity.getBigInt(type) + fees)
  totalEntity.save()
}

function _getFeeBasisPoints(timestamp: BigInt): FeeBasisPoint {
  let id = "last"
  let entity = FeeBasisPoint.load(id)
  let THRESHOLD = 3600 * 24 // 1 day

  if (entity == null || entity.timestamp < timestamp.toI32() - THRESHOLD) {
    let contract = Vault.bind(Address.fromString(VAULT))
    entity = new FeeBasisPoint(id)
    entity.swap = contract.swapFeeBasisPoints()
    entity.margin = contract.marginFeeBasisPoints()
    entity.liquidation = contract.liquidationFeeUsd()
    entity.stableSwap = contract.stableSwapFeeBasisPoints()
    entity.timestamp = timestamp.toI32()
    entity.save()
  }

  return entity as FeeBasisPoint
}

function _getOrCreateFeeStat(id: string, period: string): FeeStat {
  let entity = FeeStat.load(id)
  if (entity === null) {
    entity = new FeeStat(id)
    entity.margin = ZERO
    entity.swap = ZERO
    entity.liquidation = ZERO
    entity.mint = ZERO
    entity.burn = ZERO
    entity.period = period
  }
  return entity as FeeStat
}

function _getOrCreateVolumeStat(id: string, period: string): VolumeStat {
  let entity = VolumeStat.load(id)
  if (entity === null) {
    entity = new VolumeStat(id)
    entity.margin = ZERO
    entity.swap = ZERO
    entity.liquidation = ZERO
    entity.mint = ZERO
    entity.burn = ZERO
    entity.period = period
  }
  return entity as VolumeStat
}
