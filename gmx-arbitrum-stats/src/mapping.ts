import { BigInt, Address, Bytes, TypedMap, ethereum, store, log } from "@graphprotocol/graph-ts"
import {
  GlpManager,
  AddLiquidity,
  RemoveLiquidity
} from "../generated/GlpManager/GlpManager"

import {
  Distribute
} from "../generated/FeeGmxRewardDistributor/RewardDistributor"

import {
  Vault,
  Swap as SwapEvent,
  IncreasePosition as IncreasePositionEvent,
  DecreasePosition as DecreasePositionEvent,
  LiquidatePosition as LiquidatePositionEvent,
  UpdatePosition as UpdatePositionEvent,
  BuyUSDG as BuyUSDGEvent,
  SellUSDG as SellUSDGEvent,
  CollectMarginFees as CollectMarginFeesEvent,
  UpdateFundingRate,
  IncreasePoolAmount,
  DecreasePoolAmount
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
  GmxStat,
  LiquidatedPosition,
  ActivePosition,
  WhitelistedToken,
  TokenStat
} from "../generated/schema"

import {
  WETH,
  GMX,
  BASIS_POINTS_DIVISOR,
  getTokenPrice,
  getTokenDecimals,
  getTokenAmountUsd,
  timestampToPeriod
} from "./helpers"
import { 
  DecreaseUsdgAmount,
  IncreaseUsdgAmount,
  DecreaseReservedAmount,
  IncreaseReservedAmount
} from "../generated/Vault2/Vault"

let ZERO = BigInt.fromI32(0)
let FUNDING_PRECISION = BigInt.fromI32(1000000)

const LIQUIDATOR_ADDRESS = "0x44311c91008dde73de521cd25136fd37d616802c"

export function handleIncreasePosition(event: IncreasePositionEvent): void {
  _storeVolume("margin", event.block.timestamp, event.params.sizeDelta)
  _storeVolumeBySource("margin", event.block.timestamp, event.transaction.to, event.params.sizeDelta)
  _storeVolumeByToken("margin", event.block.timestamp, event.params.collateralToken, event.params.indexToken, event.params.sizeDelta)
  _storeFees("margin", event.block.timestamp, event.params.fee)
  _storeUserAction(event.block.timestamp, event.params.account, "margin")
}

export function handleDecreasePosition(event: DecreasePositionEvent): void {
  _storeVolume("margin", event.block.timestamp, event.params.sizeDelta)
  _storeVolumeBySource("margin", event.block.timestamp, event.transaction.to, event.params.sizeDelta)
  _storeVolumeByToken("margin", event.block.timestamp, event.params.collateralToken, event.params.indexToken, event.params.sizeDelta)
  _storeFees("margin", event.block.timestamp, event.params.fee)
  _storeUserAction(event.block.timestamp, event.params.account, "margin")

  if (event.transaction.from.toHexString() == LIQUIDATOR_ADDRESS) {
    _storeLiquidatedPosition(
      event.params.key,
      event.block.timestamp,
      event.params.account,
      event.params.indexToken,
      event.params.sizeDelta,
      event.params.collateralToken,
      event.params.collateralDelta,
      event.params.isLong,
      "partial",
      event.params.price
    )
  }
}

export function handleUpdatePosition(event: UpdatePositionEvent): void {
  let entity = new ActivePosition(event.params.key.toHexString())
  entity.averagePrice = event.params.averagePrice
  entity.entryFundingRate = event.params.entryFundingRate
  entity.collateral = event.params.collateral
  entity.size = event.params.size
  entity.save()
}

export function handleLiquidatePosition(event: LiquidatePositionEvent): void {
  _storeVolume("liquidation", event.block.timestamp, event.params.size)
  _storeVolumeBySource("liquidation", event.block.timestamp, event.transaction.to, event.params.size)

  // liquidated collateral is not a fee. it's just traders pnl
  // also size * rate incorrect as well because it doesn't consider borrow fee
  let fee = event.params.collateral
  _storeFees("liquidation", event.block.timestamp, fee)

  _storeLiquidatedPosition(
    event.params.key,
    event.block.timestamp,
    event.params.account,
    event.params.indexToken,
    event.params.size,
    event.params.collateralToken,
    event.params.collateral,
    event.params.isLong,
    "full",
    event.params.markPrice
  )
}

function _storeLiquidatedPosition(
  keyBytes: Bytes,
  timestamp: BigInt,
  account: Address,
  indexToken: Address,
  size: BigInt,
  collateralToken: Address,
  collateral: BigInt,
  isLong: boolean,
  type: string,
  markPrice: BigInt
): void {
  let key = keyBytes.toHexString()
  let position = ActivePosition.load(key)
  let averagePrice = position.averagePrice

  let id = key + ":" + timestamp.toString()
  let liquidatedPosition = new LiquidatedPosition(id)
  liquidatedPosition.account = account.toHexString()
  liquidatedPosition.timestamp = timestamp.toI32()
  liquidatedPosition.indexToken = indexToken.toHexString()
  liquidatedPosition.size = size
  liquidatedPosition.collateralToken = collateralToken.toHexString()
  liquidatedPosition.collateral = position.collateral
  liquidatedPosition.isLong = isLong
  liquidatedPosition.type = type
  liquidatedPosition.key = key

  liquidatedPosition.markPrice = markPrice
  liquidatedPosition.averagePrice = averagePrice
  let priceDelta = isLong ? averagePrice - markPrice : markPrice - averagePrice
  liquidatedPosition.loss = size * priceDelta / averagePrice

  let fundingRateId = _getFundingRateId("total", collateralToken)
  let fundingRateEntity = FundingRate.load(fundingRateId)
  let accruedFundingRate = BigInt.fromI32(fundingRateEntity.endFundingRate) - position.entryFundingRate
  liquidatedPosition.borrowFee = accruedFundingRate * size / FUNDING_PRECISION

  liquidatedPosition.save()
}

export function handleBuyUSDG(event: BuyUSDGEvent): void {
  let volume = event.params.usdgAmount * BigInt.fromString("1000000000000")
  _storeVolume("mint", event.block.timestamp, volume)
  _storeVolumeBySource("mint", event.block.timestamp, event.transaction.to, volume)

  let fee = volume * event.params.feeBasisPoints / BASIS_POINTS_DIVISOR
  _storeFees("mint", event.block.timestamp, fee)
  _storeUserAction(event.block.timestamp, event.params.account, "mintBurn")
}

export function handleSellUSDG(event: SellUSDGEvent): void {
  let volume = event.params.usdgAmount * BigInt.fromString("1000000000000")
  _storeVolumeBySource("burn", event.block.timestamp, event.transaction.to, volume)
  _storeVolume("burn", event.block.timestamp, volume)

  let fee = volume * event.params.feeBasisPoints / BASIS_POINTS_DIVISOR
  _storeFees("burn", event.block.timestamp, fee)
  _storeUserAction(event.block.timestamp, event.params.account, "mintBurn")
}

export function handleCollectMarginFees(event: CollectMarginFeesEvent): void {
  // we can't distinguish margin fee from liquidation fee here
  // using subgraph data it will be possible to calculate liquidation fee as:
  // liquidationFee = entity.marginAndLiquidation - entity.margin
  _storeFees("marginAndLiquidation", event.block.timestamp, event.params.feeUsd)
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
  let totalEntity = _storeUserActionByType(timestamp, account, actionType, "total", null)

  _storeUserActionByType(timestamp, account, actionType, "daily", totalEntity)
  _storeUserActionByType(timestamp, account, actionType, "weekly", totalEntity)
}

function _storeUserActionByType(
  timestamp: BigInt,
  account: Address,
  actionType: string,
  period: string,
  userStatTotal: UserStat | null
): UserStat {
  let timestampId = period == "weekly" ? _getWeekId(timestamp) : _getDayId(timestamp)
  let userId = period == "total" ? account.toHexString() : period + ":" + timestampId + ":" + account.toHexString()
  let user = UserData.load(userId)

  let statId = period == "total" ? "total" : period + ":" + timestampId
  let userStat = UserStat.load(statId)
  if (userStat == null) {
    userStat = new UserStat(statId)
    userStat.period = period
    userStat.timestamp = parseInt(timestampId) as i32

    userStat.uniqueCount = 0
    userStat.uniqueMarginCount = 0
    userStat.uniqueSwapCount = 0
    userStat.uniqueMintBurnCount = 0

    userStat.uniqueCountCumulative = 0
    userStat.uniqueMarginCountCumulative = 0
    userStat.uniqueSwapCountCumulative = 0
    userStat.uniqueMintBurnCountCumulative = 0

    userStat.actionCount = 0
    userStat.actionMarginCount = 0
    userStat.actionSwapCount = 0
    userStat.actionMintBurnCount = 0
  }

  if (user == null) {
    user = new UserData(userId) 
    user.period = period
    user.timestamp = parseInt(timestampId) as i32

    user.actionSwapCount = 0
    user.actionMarginCount = 0
    user.actionMintBurnCount = 0

    userStat.uniqueCount = userStat.uniqueCount + 1

    if (period == "total") {
      userStat.uniqueCountCumulative = userStat.uniqueCount
    } else if (userStatTotal != null) {
      userStat.uniqueCountCumulative = userStatTotal.uniqueCount
    }
  }

  userStat.actionCount += 1

  let actionCountProp: string
  let uniqueCountProp: string
  if (actionType == "margin") {
    actionCountProp = "actionMarginCount"
    uniqueCountProp = "uniqueMarginCount"
  } else if (actionType == "swap") {
    actionCountProp = "actionSwapCount"
    uniqueCountProp = "uniqueSwapCount"
  } else if (actionType == "mintBurn") {
    actionCountProp = "actionMintBurnCount"
    uniqueCountProp = "uniqueMintBurnCount"
  }
  let uniqueCountCumulativeProp = uniqueCountProp + "Cumulative"

  if (user.getI32(actionCountProp) == 0) {
    userStat.setI32(uniqueCountProp, userStat.getI32(uniqueCountProp) + 1)
  }
  user.setI32(actionCountProp, user.getI32(actionCountProp) + 1)
  userStat.setI32(actionCountProp, userStat.getI32(actionCountProp) + 1)

  if (period == "total") {
    userStat.setI32(uniqueCountCumulativeProp, userStat.getI32(uniqueCountProp))
  } else if (userStatTotal != null) {
    userStat.setI32(uniqueCountCumulativeProp, userStatTotal.getI32(uniqueCountProp))
  }

  user.save()
  userStat.save()

  return userStat as UserStat
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
export function handleDistributeEsgmxToGmx(event: Distribute): void {
  let amount = event.params.amount
  let amountUsd = getTokenAmountUsd(GMX, amount)

  let totalEntity = _getOrCreateGmxStat("total", "total")
  totalEntity.distributedEsgmx += amount
  totalEntity.distributedEsgmxCumulative += amount
  totalEntity.distributedEsgmxUsd += amountUsd
  totalEntity.distributedEsgmxUsdCumulative += amountUsd

  totalEntity.save()

  let id = _getDayId(event.block.timestamp)
  let entity = _getOrCreateGmxStat(id, "daily")

  entity.distributedEsgmx += amount
  entity.distributedEsgmxCumulative = totalEntity.distributedEthCumulative
  entity.distributedEsgmxUsd += amountUsd
  entity.distributedEsgmxUsdCumulative = totalEntity.distributedUsdCumulative

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
    entity.distributedEsgmx = ZERO
    entity.distributedEsgmxCumulative = ZERO
    entity.distributedEsgmxUsd = ZERO
    entity.distributedEsgmxUsdCumulative = ZERO
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
TRADE_TYPES[5] = "marginAndLiquidation"

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
    for (let i = 0; i < TRADE_TYPES.length; i++) {
      let _type = TRADE_TYPES[i]
      entity.setBigInt(_type, ZERO)
    }
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

  let hourId = _getHourId(timestamp) + ":hourly"
  let hourEntity = _getOrCreateVolumeStat(hourId, "hourly")
  hourEntity.setBigInt(type, hourEntity.getBigInt(type) + volume)
  hourEntity.save()

  let dayId = _getDayId(timestamp)
  let dayEntity = _getOrCreateVolumeStat(dayId, "daily")
  dayEntity.setBigInt(type, dayEntity.getBigInt(type) + volume)
  dayEntity.save()

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
      entity.source = ""
    } else {
      entity.source = source.toHexString()
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
    entity.distributedEth = ZERO
    entity.distributedEthCumulative = ZERO
    entity.distributedUsd = ZERO
    entity.distributedUsdCumulative = ZERO
    entity.distributedEsgmx = ZERO
    entity.distributedEsgmxCumulative = ZERO
    entity.distributedEsgmxUsd = ZERO
    entity.distributedEsgmxUsdCumulative = ZERO
    // entity.timestamp = timestamp
  }
  return entity as GlpStat
}

export function handleDistributeEthToGlp(event: Distribute): void {
  let amount = event.params.amount
  let amountUsd = getTokenAmountUsd(WETH, amount)

  let totalEntity = _getOrCreateGlpStat("total", "total")
  totalEntity.distributedEth += amount
  totalEntity.distributedEthCumulative += amount
  totalEntity.distributedUsd += amountUsd
  totalEntity.distributedUsdCumulative += amountUsd

  totalEntity.save()

  let id = _getDayId(event.block.timestamp)
  let entity = _getOrCreateGlpStat(id, "daily")

  entity.distributedEth += amount
  entity.distributedEthCumulative = totalEntity.distributedEthCumulative
  entity.distributedUsd += amountUsd
  entity.distributedUsdCumulative = totalEntity.distributedUsdCumulative

  entity.save()
}

export function handleDistributeEsgmxToGlp(event: Distribute): void {
  let amount = event.params.amount
  let amountUsd = getTokenAmountUsd(GMX, amount)

  let totalEntity = _getOrCreateGlpStat("total", "total")
  totalEntity.distributedEsgmx += amount
  totalEntity.distributedEsgmxCumulative += amount
  totalEntity.distributedEsgmxUsd += amountUsd
  totalEntity.distributedEsgmxUsdCumulative += amountUsd

  totalEntity.save()

  let id = _getDayId(event.block.timestamp)
  let entity = _getOrCreateGlpStat(id, "daily")

  entity.distributedEsgmx += amount
  entity.distributedEsgmxCumulative = totalEntity.distributedEthCumulative
  entity.distributedEsgmxUsd += amountUsd
  entity.distributedEsgmxUsdCumulative = totalEntity.distributedUsdCumulative

  entity.save()
}

export function handleIncreasePoolAmount(event: IncreasePoolAmount): void {
  let timestamp = event.block.timestamp
  let token = event.params.token
  let totalEntity = _getOrCreateTokenStat(timestamp, "total", token)
  totalEntity.poolAmount += event.params.amount
  totalEntity.poolAmountUsd = getTokenAmountUsd(token.toHexString(), totalEntity.poolAmount)
  totalEntity.save()

  _updatePoolAmount(timestamp, "hourly", token, totalEntity.poolAmount, totalEntity.poolAmountUsd);
  _updatePoolAmount(timestamp, "daily", token, totalEntity.poolAmount, totalEntity.poolAmountUsd);
  _updatePoolAmount(timestamp, "weekly", token, totalEntity.poolAmount, totalEntity.poolAmountUsd);
}

export function handleDecreasePoolAmount(event: DecreasePoolAmount): void {
  let timestamp = event.block.timestamp
  let token = event.params.token
  let totalEntity = _getOrCreateTokenStat(timestamp, "total", token)
  totalEntity.poolAmount -= event.params.amount
  totalEntity.poolAmountUsd = getTokenAmountUsd(token.toHexString(), totalEntity.poolAmount)
  totalEntity.save()

  _updatePoolAmount(timestamp, "hourly", token, totalEntity.poolAmount, totalEntity.poolAmountUsd);
  _updatePoolAmount(timestamp, "daily", token, totalEntity.poolAmount, totalEntity.poolAmountUsd);
  _updatePoolAmount(timestamp, "weekly", token, totalEntity.poolAmount, totalEntity.poolAmountUsd);
}

export function handleIncreaseReservedAmount(event: IncreaseReservedAmount): void {
  let timestamp = event.block.timestamp
  let token = event.params.token
  let totalEntity = _getOrCreateTokenStat(timestamp, "total", token)

  totalEntity.reservedAmount = totalEntity.reservedAmount + event.params.amount;
  totalEntity.reservedAmountUsd = getTokenAmountUsd(token.toHexString(), totalEntity.reservedAmount);
  totalEntity.save()

  _updateReservedAmount(timestamp, "hourly", token, totalEntity.reservedAmount, totalEntity.reservedAmountUsd);
  _updateReservedAmount(timestamp, "daily", token, totalEntity.reservedAmount, totalEntity.reservedAmountUsd);
  _updateReservedAmount(timestamp, "weekly", token, totalEntity.reservedAmount, totalEntity.reservedAmountUsd);
}

export function handleDecreaseReservedAmount(event: DecreaseReservedAmount): void {
  let timestamp = event.block.timestamp
  let token = event.params.token
  let totalEntity = _getOrCreateTokenStat(timestamp, "total", token)

  totalEntity.reservedAmount = totalEntity.reservedAmount - event.params.amount;
  totalEntity.reservedAmountUsd = getTokenAmountUsd(token.toHexString(), totalEntity.reservedAmount)
  totalEntity.save()

  _updateReservedAmount(timestamp, "hourly", token, totalEntity.reservedAmount, totalEntity.reservedAmountUsd);
  _updateReservedAmount(timestamp, "daily", token, totalEntity.reservedAmount, totalEntity.reservedAmountUsd);
  _updateReservedAmount(timestamp, "weekly", token, totalEntity.reservedAmount, totalEntity.reservedAmountUsd);
}

export function handleIncreaseUsdgAmount(event: IncreaseUsdgAmount): void {
  let timestamp = event.block.timestamp
  let token = event.params.token
  let totalEntity = _getOrCreateTokenStat(timestamp, "total", token)

  totalEntity.usdgAmount = totalEntity.usdgAmount + event.params.amount;
  totalEntity.save()

  _updateUsdgAmount(timestamp, "hourly", token, totalEntity.usdgAmount);
  _updateUsdgAmount(timestamp, "daily", token, totalEntity.usdgAmount);
  _updateUsdgAmount(timestamp, "weekly", token, totalEntity.usdgAmount);
}

export function handleDecreaseUsdgAmount(event: DecreaseUsdgAmount): void {
  let timestamp = event.block.timestamp
  let token = event.params.token
  let totalEntity = _getOrCreateTokenStat(timestamp, "total", token)

  totalEntity.usdgAmount = totalEntity.usdgAmount - event.params.amount;
  totalEntity.save()

  _updateUsdgAmount(timestamp, "hourly", token, totalEntity.usdgAmount);
  _updateUsdgAmount(timestamp, "daily", token, totalEntity.usdgAmount);
  _updateUsdgAmount(timestamp, "weekly", token, totalEntity.usdgAmount);
}

function _updateReservedAmount(
  timestamp: BigInt,
  period: string,
  token: Address,
  reservedAmount: BigInt,
  reservedAmountUsd: BigInt
): void {
  let entity = _getOrCreateTokenStat(timestamp, period, token)
  entity.reservedAmount = reservedAmount
  entity.reservedAmountUsd = reservedAmountUsd
  entity.save()
}

function _updateUsdgAmount(
  timestamp: BigInt,
  period: string,
  token: Address,
  usdgAmount: BigInt,
): void {
  let entity = _getOrCreateTokenStat(timestamp, period, token)
  entity.usdgAmount = usdgAmount
  entity.save()
}

function _updatePoolAmount(
  timestamp: BigInt,
  period: string,
  token: Address,
  poolAmount: BigInt,
  poolAmountUsd: BigInt
): void {
  let entity = _getOrCreateTokenStat(timestamp, period, token)
  entity.poolAmount = poolAmount
  entity.poolAmountUsd = poolAmountUsd
  entity.save()
}

function _getOrCreateTokenStat(timestamp: BigInt, period: string, token: Address): TokenStat {
  let id: string
  let timestampGroup: BigInt
  if (period == "total") {
    id = "total:" + token.toHexString()
    timestampGroup = timestamp
  } else {
    timestampGroup = timestampToPeriod(timestamp, period)
    id = timestampGroup.toString() + ":" + period + ":" + token.toHexString()
  }

  let entity = TokenStat.load(id)
  if (entity == null) {
    entity = new TokenStat(id)
    entity.timestamp = timestampGroup.toI32()
    entity.period = period
    entity.token = token.toHexString()
    entity.poolAmount = BigInt.fromI32(0);
    entity.poolAmountUsd = BigInt.fromI32(0);
    entity.reservedAmountUsd = BigInt.fromI32(0);
    entity.reservedAmount = BigInt.fromI32(0);
    entity.usdgAmount = BigInt.fromI32(0);
  }
  return entity as TokenStat;
}

function _storeGlpStat(timestamp: BigInt, glpSupply: BigInt, aumInUsdg: BigInt): void {
  let deprecatedId = _getHourId(timestamp)
  let deprecatedEntity = HourlyGlpStat.load(deprecatedId)

  if (deprecatedEntity == null) {
    deprecatedEntity = new HourlyGlpStat(deprecatedId)
    deprecatedEntity.glpSupply = ZERO
    deprecatedEntity.aumInUsdg = ZERO
  }

  deprecatedEntity.aumInUsdg = aumInUsdg
  deprecatedEntity.glpSupply = glpSupply

  deprecatedEntity.save()

  //

  let id = _getDayId(timestamp)
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

function _getWeekId(timestamp: BigInt): string {
  let day = 86400
  let week = day * 7
  let weekTimestamp = timestamp.toI32() / week * week - 3 * day
  return weekTimestamp.toString()
}

function _getDayId(timestamp: BigInt): string {
  let dayTimestamp = timestamp.toI32() / 86400 * 86400
  return dayTimestamp.toString()
}

function _getHourId(timestamp: BigInt): string {
  let hourTimestamp = timestamp.toI32() / 3600 * 3600
  return hourTimestamp.toString()
}
