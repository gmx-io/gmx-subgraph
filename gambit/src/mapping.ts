import { BigInt, TypedMap, Address } from "@graphprotocol/graph-ts"

import {
  Vault,
  BuyUSDG,
  SellUSDG,
  IncreasePosition,
  DecreasePosition,
  LiquidatePosition,
  Swap,
  DecreasePoolAmount,
  IncreasePoolAmount,
  CollectMarginFees
} from "../generated/Vault/Vault"
import { Token } from "../generated/Vault/Token"
import {
  HourlyPoolStat,
  PoolStat,
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
  getTokenSymbol,
  isStable
} from "./helpers"

let tokenSymbols = new Array<string>(6)
tokenSymbols[0] = 'BTC'
tokenSymbols[1] = 'ETH'
tokenSymbols[2] = 'BNB'
tokenSymbols[3] = 'BUSD'
tokenSymbols[4] = 'USDC'
tokenSymbols[5] = 'USDT'

let a = 1
let BASIS_POINTS_DIVISOR = BigInt.fromI32(10000)
let VAULT = "0xc73A8DcAc88498FD4b4B1b2AaA37b0a2614Ff67B"

let ZERO = BigInt.fromI32(0)
let USDG = "0x85E76cbf4893c1fbcB34dCF1239A91CE2A4CF5a7"
let USDG_ADDRESS = Address.fromString(USDG)

function _getSwapFeeBasisPoints(tokenA: string, tokenB: string, timestamp: BigInt): BigInt {
  let isStableSwap = isStable(tokenA) && isStable(tokenB)
  let feeBasisPointsEntity = _getFeeBasisPoints(timestamp)
  return isStableSwap ? feeBasisPointsEntity.stableSwap : feeBasisPointsEntity.swap
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
}

export function handleDecreasePosition(event: DecreasePosition): void {
  _storeVolume("margin", event.block.timestamp, event.params.sizeDelta)
}

export function handleCollectMarginFees(event: CollectMarginFees): void {
  _storeFees("margin", event.block.timestamp, event.params.feeUsd)
  _storeFees("marginAndLiquidation", event.block.timestamp, event.params.feeUsd)
}

export function handleLiquidatePosition(event: LiquidatePosition):void {
  _storeVolume("liquidation", event.block.timestamp, event.params.size)

  // we don't collect any fees during liquidation
  // charged collateral may be considered as a protocol income (or GLP income)
  // but not a fee

  // let fee = event.params.collateral
  // _storeFees("liquidation", event.block.timestamp, fee)
}

export function handleSellUSDG(event: SellUSDG): void {
  let volume = event.params.usdgAmount * BigInt.fromString("1000000000000")
  _storeVolume("burn", event.block.timestamp, volume)

  let fee = volume * _getSwapFeeBasisPoints(USDG, event.params.token.toHexString(), event.block.timestamp) / BASIS_POINTS_DIVISOR
  _storeFees("burn", event.block.timestamp, fee)

  _updateUsdgSupply(event.block.timestamp, event.params.usdgAmount, false)
}

export function handleSwap(event: Swap): void {
  let volume = getTokenAmountUsd(event.params.tokenIn.toHexString(), event.params.amountIn)
  _storeVolume("swap", event.block.timestamp, volume)

  let fee = volume * _getSwapFeeBasisPoints(event.params.tokenIn.toHexString(), event.params.tokenOut.toHexString(), event.block.timestamp) / BASIS_POINTS_DIVISOR
  _storeFees("swap", event.block.timestamp, fee)
}

export function handleBuyUSDG(event: BuyUSDG): void {
  let volume = event.params.usdgAmount * BigInt.fromString("1000000000000")
  _storeVolume("mint", event.block.timestamp, volume)
  let basisPoints = _getSwapFeeBasisPoints(USDG, event.params.token.toHexString(), event.block.timestamp)
  let fee = volume * basisPoints / BASIS_POINTS_DIVISOR
  _storeFees("mint", event.block.timestamp, fee)

  _updateUsdgSupply(event.block.timestamp, event.params.usdgAmount, true)
}

export function handleDecreasePoolAmount(event: DecreasePoolAmount): void {
  _updatePoolAmount(event.block.timestamp, event.params.token, event.params.amount, false)
}

export function handleIncreasePoolAmount(event: IncreasePoolAmount): void {
  _updatePoolAmount(event.block.timestamp, event.params.token, event.params.amount, true)
}

function _getOrCreatePoolStat(id: string, period: string): PoolStat {
  let entity = PoolStat.load(id)

  if (entity == null) {
    entity = new PoolStat(id)
    entity.BTC_amount = ZERO
    entity.ETH_amount = ZERO
    entity.BNB_amount = ZERO
    entity.BUSD_amount = ZERO
    entity.USDT_amount = ZERO
    entity.USDC_amount = ZERO
    entity.BTC_usd = ZERO
    entity.ETH_usd = ZERO
    entity.BNB_usd = ZERO
    entity.BUSD_usd = ZERO
    entity.USDT_usd = ZERO
    entity.USDC_usd = ZERO
    entity.usdgSupply = ZERO
    entity.period = period
  }

  return entity as PoolStat
}

function _updateUsdgSupply(timestamp: BigInt, amount: BigInt, increase: boolean): void {
  let totalEntity = _getOrCreatePoolStat("total", "total")

  if (increase) {
    totalEntity.usdgSupply += amount
  } else {
    totalEntity.usdgSupply -= amount
  }
  totalEntity.save()

  let id = getDayId(timestamp)
  let entity = _copyPoolStat(id, "daily", totalEntity)
  entity.save()
}

function _updatePoolAmount(timestamp: BigInt, token: Address, amount: BigInt, increase: boolean): void {
  let totalEntity = _getOrCreatePoolStat("total", "total")

  let tokenSymbol = getTokenSymbol(token.toHexString())
  let amountProp = tokenSymbol + "_amount"
  let usdProp = tokenSymbol + "_usd"
  let newAmount: BigInt

  if (increase) {
    newAmount = totalEntity.getBigInt(amountProp) + amount
  } else {
    newAmount = totalEntity.getBigInt(amountProp) - amount
  }
  let usdValue = getTokenAmountUsd(token.toHexString(), newAmount)
  totalEntity.setBigInt(amountProp, newAmount)
  totalEntity.setBigInt(usdProp, usdValue)
  totalEntity.save()

  let id = getDayId(timestamp)
  let entity = _copyPoolStat(id, "daily", totalEntity)
  entity.save()
}

function _copyPoolStat(newId: string, newPeriod: string, fromEntity: PoolStat): PoolStat {
  let entity = new PoolStat(newId)
  entity.period = newPeriod
  entity.usdgSupply = fromEntity.usdgSupply
  for (let i = 0; i < tokenSymbols.length; i++) {
    let tokenSymbol = tokenSymbols[i]
    let usdProp = tokenSymbol + "_usd"
    let amountProp = tokenSymbol + "_amount"
    entity.setBigInt(amountProp, fromEntity.getBigInt(amountProp))
    entity.setBigInt(usdProp, fromEntity.getBigInt(usdProp))
  }
  return entity
}

function _storeVolume(type: string, timestamp: BigInt, volume: BigInt): void {
  let cumulativeProp = type + "Cumulative"

  let totalEntity = _getOrCreateVolumeStat("total", "total")
  totalEntity.setBigInt(type, totalEntity.getBigInt(type) + volume)
  totalEntity.setBigInt(cumulativeProp, totalEntity.getBigInt(cumulativeProp) + volume)
  totalEntity.save()

  let id = getDayId(timestamp)
  let entity = _getOrCreateVolumeStat(id, "daily")
  entity.setBigInt(type, entity.getBigInt(type) + volume)
  entity.setBigInt(cumulativeProp, totalEntity.getBigInt(cumulativeProp))
  entity.save()
}

function _storeFees(type: string, timestamp: BigInt, fees: BigInt): void {
  let cumulativeProp = type + "Cumulative"

  let totalEntity = _getOrCreateFeeStat("total", "total")
  totalEntity.setBigInt(type, totalEntity.getBigInt(type) + fees)
  totalEntity.setBigInt(cumulativeProp, totalEntity.getBigInt(cumulativeProp) + fees)
  totalEntity.save()

  let id = getDayId(timestamp)
  let entity = _getOrCreateFeeStat(id, "daily")
  entity.setBigInt(type, entity.getBigInt(type) + fees)
  entity.setBigInt(cumulativeProp, totalEntity.getBigInt(cumulativeProp))
  entity.save()
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
    entity.marginAndLiquidation = ZERO
    entity.swap = ZERO
    entity.liquidation = ZERO
    entity.mint = ZERO
    entity.burn = ZERO
    entity.marginCumulative = ZERO
    entity.marginAndLiquidationCumulative = ZERO
    entity.swapCumulative = ZERO
    entity.liquidationCumulative = ZERO
    entity.mintCumulative = ZERO
    entity.burnCumulative = ZERO
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
    entity.marginCumulative = ZERO
    entity.swapCumulative = ZERO
    entity.liquidationCumulative = ZERO
    entity.mintCumulative = ZERO
    entity.burnCumulative = ZERO
    entity.period = period
  }
  return entity as VolumeStat
}
