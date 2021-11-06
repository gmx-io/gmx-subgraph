import { BigInt, Address, TypedMap, ethereum, store, log } from "@graphprotocol/graph-ts"
import {
  GlpManager,
  AddLiquidity,
  RemoveLiquidity
} from "../generated/GlpManager/GlpManager"

import {
  Distribute
} from "../generated/RewardDistributor/RewardDistributor"

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
  Swap,
  HourlyFee,
  FeeStat,
  VolumeStat,
  HourlyVolume,
  Transaction,
  HourlyGlpStat,
  GlpStat,
  HourlyVolumeBySource,
  HourlyVolumeByToken,
  UserData,
  UserStat,
  FundingRate,
  GmxStat
} from "../generated/schema"

import {
  WETH,
  BASIS_POINTS_DIVISOR,
  getTokenPrice,
  getTokenDecimals,
  getTokenAmountUsd
} from "./helpers"

let ZERO = BigInt.fromI32(0)

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

export function handleLiquidatePosition(event: LiquidatePositionEvent): void {
  _storeVolume("liquidation", event.block.timestamp, event.params.size)
  _storeVolumeBySource("liquidation", event.block.timestamp, event.transaction.to, event.params.size)

  // liquidated collateral is not a fee. it's just traders pnl
  // also size * rate incorrect as well because it doesn't consider borrow fee
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
  // we can't distinguish margin fee from liquidation fee here
  // using subgraph data it will be possible to calculate liquidation fee as:
  // liquidationFee = entity.marginAndLiquidation - entity.margin
  _storeFees("marginAndLiqudation", event.block.timestamp, event.params.feeUsd)
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
  //   entity.setBigInt(_actionType, ZERO)
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

export function handleAddLiquidity(event: AddLiquidity): void {
  _storeGlpStat(event.block.timestamp, event.params.glpSupply, event.params.aumInUsdg)
}

export function handleRemoveLiquidity(event: RemoveLiquidity): void {
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

export function handleDistributeEthToGmx(event: Distribute): void {
  let amount = event.params.amount
  let amountUsd = getTokenAmountUsd(WETH, amount)
  let totalEntity = _getOrCreateGmxStat("total", "total")
  totalEntity.distributedEth += amount
  totalEntity.distributedEthCumulative += amount
  totalEntity.distributedUsd += amountUsd
  totalEntity.distributedUsdCumulative += amountUsd

  totalEntity.save()

  let id = _getDayId(event.block.timestamp)
  let entity = _getOrCreateGmxStat(id, "daily")

  entity.distributedEth += amount
  entity.distributedEthCumulative = totalEntity.distributedEthCumulative
  entity.distributedUsd += amountUsd
  entity.distributedUsdCumulative = totalEntity.distributedUsdCumulative

  entity.save()
}

function _getOrCreateGmxStat(id: string, period: string): GmxStat {
  let entity = GmxStat.load(id)
  if (entity == null) {
    entity = new GmxStat(id)
    entity.distributedEth = ZERO
    entity.distributedEthCumulative = ZERO
    entity.distributedUsd = ZERO
    entity.distributedUsdCumulative = ZERO
    entity.period = period
  }
  return entity as GmxStat
}

let TRADE_TYPES = new Array<string>(5)
TRADE_TYPES[0] = "margin"
TRADE_TYPES[1] = "swap"
TRADE_TYPES[2] = "mint"
TRADE_TYPES[3] = "burn"
TRADE_TYPES[4] = "liquidation"

function _storeFees(type: string, timestamp: BigInt, fees: BigInt): void {
  let deprecatedId = _getHourId(timestamp)
  let entityDeprecated = HourlyFee.load(deprecatedId)

  if (entityDeprecated == null) {
    entityDeprecated = new HourlyFee(deprecatedId)
    for (let i = 0; i < TRADE_TYPES.length; i++) {
      let _type = TRADE_TYPES[i]
      entityDeprecated.setBigInt(_type, ZERO)
    }
  }

  entityDeprecated.setBigInt(type, entityDeprecated.getBigInt(type) + fees)
  entityDeprecated.save()

  //

  let id = _getDayId(timestamp)
  let entity = _getOrCreateFeeStat(id, "daily")
  entity.setBigInt(type, entity.getBigInt(type) + fees)
  entity.save()

  let totalEntity = _getOrCreateFeeStat("total", "total")
  totalEntity.setBigInt(type, totalEntity.getBigInt(type) + fees)
  totalEntity.save()
}

function _getOrCreateFeeStat(id: string, period: string): FeeStat {
  let entity = FeeStat.load(id)
  if (entity === null) {
    entity = new FeeStat(id)
    entity.margin = ZERO
    entity.swap = ZERO
    entity.liquidation = ZERO
    entity.marginAndLiquidation = ZERO
    entity.mint = ZERO
    entity.burn = ZERO
    entity.period = period
  }
  return entity as FeeStat
}

function _storeVolume(type: string, timestamp: BigInt, volume: BigInt): void {
  let deprecatedId = _getHourId(timestamp)
  let deprecatedEntity = HourlyVolume.load(deprecatedId)

  if (deprecatedEntity == null) {
    deprecatedEntity = new HourlyVolume(deprecatedId)
    for (let i = 0; i < TRADE_TYPES.length; i++) {
      let _type = TRADE_TYPES[i]
      deprecatedEntity.setBigInt(_type, ZERO)
    }
  }

  deprecatedEntity.setBigInt(type, deprecatedEntity.getBigInt(type) + volume)
  deprecatedEntity.save()

  //

  let id = _getDayId(timestamp)
  let entity = _getOrCreateVolumeStat(id, "daily")
  entity.setBigInt(type, entity.getBigInt(type) + volume)
  entity.save()

  let totalEntity = _getOrCreateVolumeStat("total", "total")
  totalEntity.setBigInt(type, totalEntity.getBigInt(type) + volume)
  totalEntity.save()
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
      entity.setBigInt(_type, ZERO)
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
      entity.setBigInt(_type, ZERO)
    }
  }

  entity.setBigInt(type, entity.getBigInt(type) + volume)
  entity.save()
}

function _getOrCreateGlpStat(id: string, period: string): GlpStat {
  let entity = GlpStat.load(id)
  if (entity == null) {
    entity = new GlpStat(id)
    entity.period = period
    entity.glpSupply = ZERO
    entity.aumInUsdg = ZERO
  }
  return entity as GlpStat
}

function _storeGlpStat(timestamp: BigInt, glpSupply: BigInt, aumInUsdg: BigInt): void {
  let id = _getHourId(timestamp)
  let deprecatedEntity = HourlyGlpStat.load(id)

  if (deprecatedEntity == null) {
    deprecatedEntity = new HourlyGlpStat(id)
    deprecatedEntity.glpSupply = ZERO
    deprecatedEntity.aumInUsdg = ZERO
  }

  deprecatedEntity.aumInUsdg = aumInUsdg
  deprecatedEntity.glpSupply = glpSupply

  deprecatedEntity.save()

  //

  let totalEntity = _getOrCreateGlpStat("total", "total")
  totalEntity.aumInUsdg = aumInUsdg
  totalEntity.glpSupply = glpSupply
  totalEntity.save()

  let entity = _getOrCreateGlpStat(id, "daily")
  entity.aumInUsdg = aumInUsdg
  entity.glpSupply = glpSupply
  entity.save()
}

function _getIdFromEvent(event: ethereum.Event): string {
  return event.transaction.hash.toHexString() + ':' + event.logIndex.toString()
}

function _getDayId(timestamp: BigInt): string {
  let hourTimestamp = timestamp.toI32() / 86400 * 86400
  return hourTimestamp.toString()
}

function _getHourId(timestamp: BigInt): string {
  let hourTimestamp = timestamp.toI32() / 3600 * 3600
  return hourTimestamp.toString()
}
