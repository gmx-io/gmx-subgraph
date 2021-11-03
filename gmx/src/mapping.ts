import { BigInt, Address, TypedMap, ethereum, store, log } from "@graphprotocol/graph-ts"
import {
  GlpManager,
  AddLiquidity as AddLiquidityEvent,
  RemoveLiquidity as RemoveLiquidityEvent
} from "../generated/GlpManager/GlpManager"

import {
  Vault,
  Swap as SwapEvent,
  IncreasePosition as IncreasePositionEvent,
  DecreasePosition as DecreasePositionEvent,
  LiquidatePosition as LiquidatePositionEvent,
  BuyUSDG as BuyUSDGEvent,
  SellUSDG as SellUSDGEvent,
  CollectMarginFees as CollectMarginFeesEvent,
  UpdateFundingRate
} from "../generated/Vault/Vault"

import {
  AddLiquidity,
  RemoveLiquidity,
  Swap,
  HourlyFee,
  HourlyVolume,
  Transaction,
  HourlyGlpStat,
  HourlyVolumeBySource,
  HourlyVolumeByToken,
  UserData,
  UserStat,
  FundingRate
} from "../generated/schema"

import {
  BASIS_POINTS_DIVISOR,
  getTokenPrice,
  getTokenDecimals
} from "./helpers"

export function handleIncreasePosition(event: IncreasePositionEvent): void {
  _storeVolume("margin", event.block.timestamp, event.params.sizeDelta)
  _storeVolumeBySource("margin", event.block.timestamp, event.transaction.to, event.params.sizeDelta)
  _storeVolumeByToken("margin", event.block.timestamp, event.params.collateralToken, event.params.indexToken, event.params.sizeDelta)
  _storeFees("margin", event.block.timestamp, event.params.fee)
  _storeUserAction(event.block.timestamp, event.transaction.from, "margin")
}

export function handleDecreasePosition(event: DecreasePositionEvent): void {
  _storeVolume("margin", event.block.timestamp, event.params.sizeDelta)
  _storeVolumeBySource("margin", event.block.timestamp, event.transaction.to, event.params.sizeDelta)
  _storeVolumeByToken("margin", event.block.timestamp, event.params.collateralToken, event.params.indexToken, event.params.sizeDelta)
  _storeFees("margin", event.block.timestamp, event.params.fee)
  _storeUserAction(event.block.timestamp, event.transaction.from, "margin")
}

export function handleLiquidatePosition(event: LiquidatePositionEvent):void {
  _storeVolume("liquidation", event.block.timestamp, event.params.size)
  _storeVolumeBySource("liquidation", event.block.timestamp, event.transaction.to, event.params.size)

  // not very accurate way of calculating fees
  // because in case collateral is not enough to cover liquidation expenses
  // we charge whole collateral as fee
  let fee = event.params.collateral
  _storeFees("liquidation", event.block.timestamp, fee)
}

export function handleBuyUSDG(event: BuyUSDGEvent): void {
  let volume = event.params.usdgAmount * BigInt.fromString("1000000000000")
  _storeVolume("mint", event.block.timestamp, volume)
  _storeVolumeBySource("mint", event.block.timestamp, event.transaction.to, volume)

  let fee = volume * event.params.feeBasisPoints / BASIS_POINTS_DIVISOR
  _storeFees("mint", event.block.timestamp, fee)
  _storeUserAction(event.block.timestamp, event.transaction.from, "mintBurn")
}

export function handleSellUSDG(event: SellUSDGEvent): void {
  let volume = event.params.usdgAmount * BigInt.fromString("1000000000000")
  _storeVolumeBySource("burn", event.block.timestamp, event.transaction.to, volume)
  _storeVolume("burn", event.block.timestamp, volume)

  let fee = volume * event.params.feeBasisPoints / BASIS_POINTS_DIVISOR
  _storeFees("burn", event.block.timestamp, fee)
  _storeUserAction(event.block.timestamp, event.transaction.from, "mintBurn")
}

export function handleCollectMarginFees(event: CollectMarginFeesEvent): void {
  // _storeFees("margin", event.block.timestamp, event.params.feeUsd)
}

export function handleSwap(event: SwapEvent): void {
  let txId = event.transaction.hash.toHexString()
  let transaction = Transaction.load(txId)
  if (transaction == null) {
    transaction = new Transaction(event.transaction.hash.toHexString())
    transaction.from = event.transaction.from.toHexString()
    transaction.to = event.transaction.to.toHexString()
    transaction.save()
  }


  let id = _getIdFromEvent(event)
  let entity = new Swap(id)

  entity.tokenIn = event.params.tokenIn.toHexString()
  entity.tokenOut = event.params.tokenOut.toHexString()
  entity.account = event.params.account.toHexString()

  entity.amountIn = event.params.amountIn
  entity.amountOut = event.params.amountOut
  entity.amountOutAfterFees = event.params.amountOutAfterFees
  entity.feeBasisPoints = event.params.feeBasisPoints

  entity.transaction = txId

  entity.tokenInPrice = getTokenPrice(entity.tokenIn)

  entity.timestamp = event.block.timestamp.toI32()

  entity.save()

  let decimals = getTokenDecimals(entity.tokenIn)
  let denominator = BigInt.fromString("10").pow(decimals)
  let volume = entity.amountIn * entity.tokenInPrice / denominator
  _storeVolume("swap", event.block.timestamp, volume)
  _storeVolumeBySource("swap", event.block.timestamp, event.transaction.to, volume)
  _storeVolumeByToken("swap", event.block.timestamp, event.params.tokenIn, event.params.tokenOut, volume)

  let fee = volume * entity.feeBasisPoints / BASIS_POINTS_DIVISOR
  _storeFees("swap", event.block.timestamp, fee)

  _storeUserAction(event.block.timestamp, event.transaction.from, "swap")
}

function _storeUserAction(timestamp: BigInt, account: Address, actionType: String): void {
  _storeUserActionByType(timestamp, account, actionType, "total")
  _storeUserActionByType(timestamp, account, actionType, "daily")
}

function _storeUserActionByType(timestamp: BigInt, account: Address, actionType: String, period: String): void {
  let userId = period == "total" ? account.toHexString() : _getDayId(timestamp) + ":" + account.toHexString()
  let user = UserData.load(userId)

  let statId = period == "total" ? "total" : _getDayId(timestamp)
  let userStat = UserStat.load(statId)
  if (userStat == null) {
    userStat = new UserStat(statId)
    userStat.period = period
    userStat.timestamp = timestamp.toI32() / 86400 * 86400

    userStat.uniqueCount = 0
    userStat.uniqueMarginCount = 0
    userStat.uniqueSwapCount = 0
    userStat.uniqueMintBurnCount = 0

    userStat.actionCount = 0
    userStat.actionMarginCount = 0
    userStat.actionSwapCount = 0
    userStat.actionMintBurnCount = 0
  }

  if (user == null) {
    user = new UserData(userId) 
    user.period = period
    user.timestamp = timestamp.toI32() / 86400 * 86400

    user.actionSwapCount = 0
    user.actionMarginCount = 0
    user.actionMintBurnCount = 0

    userStat.uniqueCount = userStat.uniqueCount + 1
  }

  userStat.actionCount += 1

  // for (let i = 0; i < USER_ACTION_actionTypeS.length; i++) {
  //   let actionProp = "action" 
  //   let _actionType = USER_ACTION_actionTypeS[i]
  //   entity.setBigInt(_actionType, BigInt.fromI32(0)) 
  // }

  if (actionType == "margin") {
    if (user.actionMarginCount == 0) {
      userStat.uniqueMarginCount += 1
    }
    user.actionMarginCount += 1
    userStat.actionMarginCount += 1
  } else if (actionType == "swap") {
    if (user.actionSwapCount == 0) {
      userStat.uniqueSwapCount += 1
    }
    user.actionSwapCount += 1
    userStat.actionSwapCount += 1
  } else if (actionType == "mintBurn") {
    if (user.actionMintBurnCount == 0) {
      userStat.uniqueMintBurnCount += 1
    }
    user.actionMintBurnCount += 1
    userStat.actionMintBurnCount += 1
  }

  user.save()
  userStat.save()
}

export function handleAddLiquidity(event: AddLiquidityEvent): void {
  let id = _getIdFromEvent(event)
  let entity = new AddLiquidity(id)

  entity.account = event.params.account.toHexString()
  entity.token = event.params.token.toHexString()
  entity.amount = event.params.amount
  entity.aumInUsdg = event.params.aumInUsdg
  entity.glpSupply = event.params.glpSupply
  entity.usdgAmount = event.params.usdgAmount
  entity.mintAmount = event.params.mintAmount
  entity.timestamp = event.block.timestamp.toI32()

  entity.save()

  _storeGlpStat(event.block.timestamp, event.params.glpSupply, event.params.aumInUsdg)
}

export function handleRemoveLiquidity(event: RemoveLiquidityEvent): void {
  let id = _getIdFromEvent(event)
  let entity = new RemoveLiquidity(id)

  entity.account = event.params.account.toHexString()
  entity.token = event.params.token.toHexString()
  entity.glpAmount = event.params.glpAmount
  entity.aumInUsdg = event.params.aumInUsdg
  entity.glpSupply = event.params.glpSupply
  entity.usdgAmount = event.params.usdgAmount
  entity.amountOut = event.params.amountOut
  entity.timestamp = event.block.timestamp.toI32()

  entity.save() 

  _storeGlpStat(event.block.timestamp, event.params.glpSupply, event.params.aumInUsdg)
}

function _getFundingRateId(timeKey: string, token: Address): string {
  return timeKey + ":" + token.toHexString()
}

export function handleUpdateFundingRate(event: UpdateFundingRate): void {
  const FUNDING_INTERVAL = 3600
  let fundingIntervalTimestamp = event.block.timestamp.toI32() / FUNDING_INTERVAL * FUNDING_INTERVAL

  let timestamp = _getDayId(event.block.timestamp)
  let id = _getFundingRateId(timestamp, event.params.token)
  let entity = FundingRate.load(id)

  let totalId = _getFundingRateId("total", event.params.token)
  let totalEntity = FundingRate.load(totalId)

  if (entity == null) {
    entity = new FundingRate(id)
    if (totalEntity) {
      entity.startFundingRate = totalEntity.endFundingRate
      entity.startTimestamp = totalEntity.endTimestamp
    } else {
      entity.startFundingRate = 0
      entity.startTimestamp = fundingIntervalTimestamp
    }
    entity.timestamp = BigInt.fromString(timestamp).toI32()
    entity.token = event.params.token.toHexString()
    entity.period = "daily"
  }
  entity.endFundingRate = event.params.fundingRate.toI32()
  entity.endTimestamp = fundingIntervalTimestamp
  entity.save()

  if (totalEntity == null) {
    totalEntity = new FundingRate(totalId)
    totalEntity.period = "total"
    totalEntity.startFundingRate = 0
    totalEntity.token = event.params.token.toHexString()
    totalEntity.startTimestamp = fundingIntervalTimestamp
  }
  totalEntity.endFundingRate = event.params.fundingRate.toI32()
  totalEntity.timestamp = BigInt.fromString(timestamp).toI32()
  totalEntity.endTimestamp = fundingIntervalTimestamp
  totalEntity.save()
}

let TRADE_TYPES = new Array<string>(5)
TRADE_TYPES[0] = "margin"
TRADE_TYPES[1] = "swap"
TRADE_TYPES[2] = "mint"
TRADE_TYPES[3] = "burn"
TRADE_TYPES[4] = "liquidation"

function _storeFees(type: string, timestamp: BigInt, fees: BigInt): void {
  let id = _getHourId(timestamp)
  let entity = HourlyFee.load(id)

  if (entity == null) {
    entity = new HourlyFee(id)
    for (let i = 0; i < TRADE_TYPES.length; i++) {
      let _type = TRADE_TYPES[i]
      entity.setBigInt(_type, BigInt.fromI32(0)) 
    }
  }

  entity.setBigInt(type, entity.getBigInt(type) + fees)
  entity.save()
}

function _storeVolume(type: string, timestamp: BigInt, volume: BigInt): void {
  let id = _getHourId(timestamp)
  let entity = HourlyVolume.load(id)

  if (entity == null) {
    entity = new HourlyVolume(id)
    for (let i = 0; i < TRADE_TYPES.length; i++) {
      let _type = TRADE_TYPES[i]
      entity.setBigInt(_type, BigInt.fromI32(0)) 
    }
  }

  entity.setBigInt(type, entity.getBigInt(type) + volume)
  entity.save()
}

function _storeVolumeBySource(type: string, timestamp: BigInt, source: Address | null, volume: BigInt): void {
  let id = _getHourId(timestamp) + ":" + source.toHexString()
  let entity = HourlyVolumeBySource.load(id)

  if (entity == null) {
    entity = new HourlyVolumeBySource(id)
    if (source == null) {
      entity.source = Address.fromString("")
    } else {
      entity.source = Address.fromString(source.toHexString())
    }
    entity.timestamp = timestamp.toI32() / 3600 * 3600
    for (let i = 0; i < TRADE_TYPES.length; i++) {
      let _type = TRADE_TYPES[i]
      entity.setBigInt(_type, BigInt.fromI32(0)) 
    }
  }

  entity.setBigInt(type, entity.getBigInt(type) + volume)
  entity.save()
}

function _storeVolumeByToken(type: string, timestamp: BigInt, tokenA: Address, tokenB: Address, volume: BigInt): void {
  let id = _getHourId(timestamp) + ":" + tokenA.toHexString() + ":" + tokenB.toHexString()
  let entity = HourlyVolumeByToken.load(id)

  if (entity == null) {
    entity = new HourlyVolumeByToken(id)
    entity.tokenA = tokenA
    entity.tokenB = tokenB
    entity.timestamp = timestamp.toI32() / 3600 * 3600
    for (let i = 0; i < TRADE_TYPES.length; i++) {
      let _type = TRADE_TYPES[i]
      entity.setBigInt(_type, BigInt.fromI32(0)) 
    }
  }

  entity.setBigInt(type, entity.getBigInt(type) + volume)
  entity.save()
}

function _storeGlpStat(timestamp: BigInt, glpSupply: BigInt, aumInUsdg: BigInt): void {
  let id = _getHourId(timestamp)
  let entity = HourlyGlpStat.load(id)

  if (entity == null) {
    entity = new HourlyGlpStat(id)
    entity.glpSupply = BigInt.fromI32(0)
    entity.aumInUsdg = BigInt.fromI32(0)
  }

  entity.aumInUsdg = aumInUsdg
  entity.glpSupply = glpSupply

  entity.save()
}

function _getIdFromEvent(event: ethereum.Event): string {
  return event.transaction.hash.toHexString() + '-' + event.logIndex.toString()
}

function _getDayId(timestamp: BigInt): string {
  let hourTimestamp = timestamp.toI32() / 86400 * 86400
  return hourTimestamp.toString()
}

function _getHourId(timestamp: BigInt): string {
  let hourTimestamp = timestamp.toI32() / 3600 * 3600
  return hourTimestamp.toString()
}
