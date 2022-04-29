import { BigInt, Address, Bytes } from "@graphprotocol/graph-ts"
import {
  ReferralStorage,
  GovSetCodeOwner,
  RegisterCode,
  SetCodeOwner,
  SetHandler,
  SetReferrerDiscountShare,
  SetReferrerTier,
  SetTier,
  SetTraderReferralCode
} from "../generated/ReferralStorage/ReferralStorage"
import {
  IncreasePositionReferral,
  DecreasePositionReferral
} from "../generated/PositionManager/PositionManager"
import {
  BatchSend
} from "../generated/BatchSender/BatchSender"
import {
  ExecuteDecreaseOrder as ExecuteDecreaseOrderEvent
} from "../generated/OrderBook/OrderBook"
import {
  ReferralVolumeRecord,
  ReferrerStat,
  GlobalStat,
  Tier,
  Referrer,
  TradedReferral,
  RegisteredReferral,
  ReferralStat,
  Distribution,
  ReferralCode,
  ExecuteDecreaseOrder,
  PositionReferralAction
} from "../generated/schema"
import {
  timestampToPeriod
} from "../../utils"

class ReferrerResult {
  created: boolean
  entity: Referrer

  constructor(entity: Referrer, created: boolean) {
    this.entity = entity
    this.created = created
  }
}

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"
const ZERO_BYTES32 = "0x0000000000000000000000000000000000000000000000000000000000000000"
let ZERO = BigInt.fromI32(0)
let ONE = BigInt.fromI32(1)
let BASIS_POINTS_DIVISOR = BigInt.fromI32(10000)


export function handleBatchSend(event: BatchSend): void {
  let typeId = event.params.typeId
  let token = event.params.token.toHexString()
  let receivers = event.params.accounts
  let amounts = event.params.amounts
  for (let i = 0; i < event.params.accounts.length; i++) {
    let receiver = receivers[i].toHexString()
    let amount = amounts[i]
    let id = receiver + ":" + event.transaction.hash.toHexString() + ":" + event.logIndex.toString()
    let entity = new Distribution(id)
    entity.typeId = typeId
    entity.token = token
    entity.receiver = receiver
    entity.amount = amount

    entity.blockNumber = event.block.number
    entity.transactionHash = event.transaction.hash.toHexString()
    entity.timestamp = event.block.timestamp

    entity.save()
  }
}

export function handleDecreasePositionReferral(event: DecreasePositionReferral): void {
  let sizeDelta = event.params.sizeDelta
  if (sizeDelta == ZERO) {
    // sizeDelta is incorrectly emitted for decrease orders
    let prevLogIndex = event.logIndex - ONE
    let executeDecreaseOrderId = event.transaction.hash.toHexString() + ":" + prevLogIndex.toString()
    let executeDecreaseOrderEntity = ExecuteDecreaseOrder.load(executeDecreaseOrderId)
    if (executeDecreaseOrderEntity != null) {
      sizeDelta = executeDecreaseOrderEntity.sizeDelta
    }
  }

  _handleChangePositionReferral(
    event.block.number,
    event.transaction.hash,
    event.logIndex,
    event.block.timestamp,
    event.params.account,
    sizeDelta,
    event.params.referralCode,
    event.params.referrer,
    false
  )
}

export function handleIncreasePositionReferral(event: IncreasePositionReferral): void {
  _handleChangePositionReferral(
    event.block.number,
    event.transaction.hash,
    event.logIndex,
    event.block.timestamp,
    event.params.account,
    event.params.sizeDelta,
    event.params.referralCode,
    event.params.referrer,
    true
  )
}

export function handleRegisterCode(event: RegisterCode): void {
  _registerCode(event.block.timestamp, event.params.code, event.params.account);
}

function _registerCode(timestamp: BigInt, code: Bytes, owner: Address): void {
   let referrerResult = _getOrCreateReferrerWithCreatedFlag(owner.toHexString())
   let referrerCreated = referrerResult.created

   let referralCodeEntity = new ReferralCode(code.toHexString())
   referralCodeEntity.owner = owner.toHexString()
   referralCodeEntity.code = code.toHex()
   referralCodeEntity.save()

   let totalReferrerStat = _getOrCreateReferrerStat(timestamp, "total", owner, code)
   totalReferrerStat.save()

   let dailyReferrerStat = _getOrCreateReferrerStat(timestamp, "daily", owner, code)
   dailyReferrerStat.save()

   let totalGlobalStatEntity = _getOrCreateGlobalStat(timestamp, "total", null)
   totalGlobalStatEntity.referralCodesCount += ONE
   totalGlobalStatEntity.referralCodesCountCumulative = totalGlobalStatEntity.referralCodesCount
   if (referrerCreated) {
     totalGlobalStatEntity.referrersCount += ONE
     totalGlobalStatEntity.referrersCountCumulative = totalGlobalStatEntity.referrersCount
   }
   totalGlobalStatEntity.save()

   let dailyGlobalStatEntity = _getOrCreateGlobalStat(timestamp, "daily", totalGlobalStatEntity)
   dailyGlobalStatEntity.referralCodesCount += ONE
   if (referrerCreated) {
     dailyGlobalStatEntity.referrersCount += ONE
   }
   dailyGlobalStatEntity.save()
}

export function handleSetCodeOwner(event: SetCodeOwner): void {
   let referralCodeEntity = ReferralCode.load(event.params.code.toHexString())
   if (referralCodeEntity == null) {
    _registerCode(event.block.timestamp, event.params.code, event.params.newAccount);
   } else {
     referralCodeEntity.owner = event.params.newAccount.toHexString()
     referralCodeEntity.save()
   }
}

export function handleGovSetCodeOwner(event: GovSetCodeOwner): void {
   let referralCodeEntity = ReferralCode.load(event.params.code.toHexString())
   if (referralCodeEntity == null) {
    _registerCode(event.block.timestamp, event.params.code, event.params.newAccount);
   } else {
     referralCodeEntity.owner = event.params.newAccount.toHexString()
     referralCodeEntity.save()
   }
}

export function handleSetReferrerDiscountShare(event: SetReferrerDiscountShare): void {
   let entity = _getOrCreateReferrer(event.params.referrer.toHexString())
   entity.discountShare = event.params.discountShare;
   entity.save()
}

export function handleSetReferrerTier(event: SetReferrerTier): void {
   let entity = _getOrCreateReferrer(event.params.referrer.toHexString())
   entity.tierId = event.params.tierId;
   entity.save()
}

export function handleSetTier(event: SetTier): void {
  let entity = _getOrCreateTier(event.params.tierId.toString())
  entity.totalRebate = event.params.totalRebate
  entity.discountShare = event.params.discountShare
  entity.save()
}

export function handleSetTraderReferralCode(event: SetTraderReferralCode): void {
  let referralCodeEntity = ReferralCode.load(event.params.code.toHexString())
  if (referralCodeEntity == null) {
    // SetTraderReferralCode can be emitted with non-existent code
    return
  }
  let timestamp = event.block.timestamp

  // global stats
  let totalGlobalStatEntity = _getOrCreateGlobalStat(timestamp, "total", null);
  totalGlobalStatEntity.referralsCount += ONE
  totalGlobalStatEntity.referralsCountCumulative += ONE
  totalGlobalStatEntity.save()

  let dailyGlobalStatEntity = _getOrCreateGlobalStat(timestamp, "daily", totalGlobalStatEntity);
  dailyGlobalStatEntity.referralsCount += ONE
  dailyGlobalStatEntity.save()

  // referrer stats
  let referrer = Address.fromString(referralCodeEntity.owner)
  let totalReferrerStatEntity = _getOrCreateReferrerStat(timestamp, "total", referrer, event.params.code)
  if(_createRegisteredReferralIfNotExist(totalReferrerStatEntity.id, event.params.account)) {
    totalReferrerStatEntity.registeredReferralsCount += ONE
    totalReferrerStatEntity.registeredReferralsCountCumulative += ONE
    totalReferrerStatEntity.save()
  }

  let dailyReferrerStatEntity = _getOrCreateReferrerStat(timestamp, "daily", referrer, event.params.code)
  if(_createRegisteredReferralIfNotExist(dailyReferrerStatEntity.id, event.params.account)) {
    dailyReferrerStatEntity.registeredReferralsCount += ONE
  }
  dailyReferrerStatEntity.registeredReferralsCountCumulative = totalReferrerStatEntity.registeredReferralsCountCumulative
  dailyReferrerStatEntity.save()
}

export function handleExecuteDecreaseOrder(event: ExecuteDecreaseOrderEvent): void {
  let id = event.transaction.hash.toHexString() + ":" + event.logIndex.toString()
  let entity = new ExecuteDecreaseOrder(id)
  entity.sizeDelta = event.params.sizeDelta
  entity.account = event.params.account.toHexString()
  entity.timestamp = event.block.timestamp
  entity.save()
}

function _getOrCreateTier(id: String): Tier {
  let entity = Tier.load(id)
  if (entity == null) {
    entity = new Tier(id)
    entity.totalRebate = ZERO
    entity.discountShare = BigInt.fromI32(5000)
    entity.save()
  }
  return entity as Tier
}

function _storeReferralStats(
  timestamp: BigInt,
  period: String,
  referral: Address,
  volume: BigInt,
  discountUsd: BigInt,
  totalEntity: ReferralStat | null
): ReferralStat {
  let periodTimestamp = timestampToPeriod(timestamp, period)
  let id = period + ":" + periodTimestamp.toString() + ":" + referral.toHexString()

  let entity = ReferralStat.load(id)
  if (entity === null) {
    entity = new ReferralStat(id)
    entity.referral = referral.toHexString()
    entity.volume = ZERO
    entity.volumeCumulative = ZERO
    entity.discountUsd = ZERO
    entity.discountUsdCumulative = ZERO
    entity.timestamp = periodTimestamp
    entity.period = period
  }

  entity.volume += volume
  entity.discountUsd += discountUsd

  if (period == "total") {
    totalEntity = entity
  }
  entity.volumeCumulative = totalEntity.volume
  entity.discountUsdCumulative = totalEntity.discountUsd

  entity.save()

  return entity as ReferralStat
}

function _getOrCreateGlobalStat(
  timestamp: BigInt,
  period: String,
  totalEntity: GlobalStat | null
): GlobalStat {
  let periodTimestamp = timestampToPeriod(timestamp, period)
  let id = period + ":" + periodTimestamp.toString()

  let entity = GlobalStat.load(id)
  if (entity == null) {
    entity = new GlobalStat(id)
    entity.volume = ZERO
    entity.volumeCumulative = ZERO
    entity.totalRebateUsd = ZERO
    entity.totalRebateUsdCumulative = ZERO
    entity.discountUsd = ZERO
    entity.discountUsdCumulative = ZERO
    entity.trades = ZERO
    entity.tradesCumulative = ZERO

    entity.referralCodesCount = ZERO
    entity.referralCodesCountCumulative = ZERO

    entity.referrersCount = ZERO
    entity.referrersCountCumulative = ZERO

    entity.referralsCount = ZERO
    entity.referralsCountCumulative = ZERO

    if (totalEntity) {
      entity.referrersCountCumulative = totalEntity.referrersCount
      entity.referralCodesCountCumulative = totalEntity.referralCodesCountCumulative
      entity.volumeCumulative = totalEntity.volumeCumulative
      entity.totalRebateUsdCumulative = totalEntity.totalRebateUsdCumulative
      entity.discountUsdCumulative = totalEntity.discountUsdCumulative
      entity.referralsCountCumulative = totalEntity.referralsCountCumulative
    }

    entity.period = period
    entity.timestamp = periodTimestamp
  }
  return entity as GlobalStat
}

function _storeGlobalStats(
  timestamp: BigInt,
  period: String,
  volume: BigInt,
  totalRebateUsd: BigInt,
  discountUsd: BigInt,
  totalEntity: GlobalStat | null
): GlobalStat {
  let entity = _getOrCreateGlobalStat(timestamp, period, totalEntity);

  entity.volume += volume;
  entity.totalRebateUsd += totalRebateUsd;
  entity.discountUsd += discountUsd;
  entity.trades += BigInt.fromI32(1);

  if (period == "total") {
    totalEntity = entity
  }

  entity.volumeCumulative = totalEntity.volume
  entity.totalRebateUsdCumulative = totalEntity.totalRebateUsd
  entity.discountUsdCumulative = totalEntity.discountUsd
  entity.tradesCumulative = totalEntity.trades
  entity.referrersCountCumulative = totalEntity.referrersCount
  entity.referralCodesCountCumulative = totalEntity.referralCodesCount

  entity.save()

  return entity as GlobalStat;
}

function _getOrCreateReferrerStat(
  timestamp: BigInt,
  period: String,
  referrer: Address,
  referralCode: Bytes
): ReferrerStat {
  let periodTimestamp = timestampToPeriod(timestamp, period)
  let id = period + ":" + periodTimestamp.toString() + ":" + referralCode.toHex() + ":" + referrer.toHexString()

  let entity = ReferrerStat.load(id)
  if (entity === null) {
    entity = new ReferrerStat(id)
    entity.volume = ZERO
    entity.volumeCumulative = ZERO
    entity.trades = ZERO
    entity.tradesCumulative = ZERO
    entity.tradedReferralsCount = ZERO
    entity.tradedReferralsCountCumulative = ZERO
    entity.registeredReferralsCount = ZERO
    entity.registeredReferralsCountCumulative = ZERO

    entity.totalRebateUsd = ZERO
    entity.totalRebateUsdCumulative = ZERO
    entity.discountUsd = ZERO
    entity.discountUsdCumulative = ZERO

    entity.timestamp = periodTimestamp
    entity.referrer = referrer.toHexString()
    entity.referralCode = referralCode.toHex()
    entity.period = period
  }
  return entity as ReferrerStat
}

function _storeReferrerStats(
  timestamp: BigInt,
  period: String,
  volume: BigInt,
  referralCode: Bytes,
  referrer: Address,
  referral: Address,
  totalRebateUsd: BigInt,
  discountUsd: BigInt,
  totalEntity: ReferrerStat | null
): ReferrerStat {
  let entity = _getOrCreateReferrerStat(timestamp, period, referrer, referralCode)
  let isNewReferral = _createTradedReferralIfNotExist(entity.id, referral)

  if (isNewReferral) {
    entity.tradedReferralsCount += BigInt.fromI32(1)
  }

  entity.volume += volume
  entity.trades += BigInt.fromI32(1)
  entity.totalRebateUsd += totalRebateUsd
  entity.discountUsd += discountUsd
  if (period == "total") {
    entity.volumeCumulative = entity.volume
    entity.totalRebateUsdCumulative = entity.totalRebateUsd
    entity.discountUsdCumulative = entity.discountUsd
    entity.tradesCumulative = entity.trades
    entity.tradedReferralsCountCumulative = entity.tradedReferralsCount
  } else {
    entity.volumeCumulative = totalEntity.volumeCumulative
    entity.tradesCumulative = totalEntity.tradesCumulative
    entity.totalRebateUsdCumulative = totalEntity.totalRebateUsdCumulative
    entity.discountUsdCumulative = totalEntity.discountUsdCumulative
    entity.tradedReferralsCountCumulative = totalEntity.tradedReferralsCount

  }

  entity.save()

  return entity as ReferrerStat
}

function _handleChangePositionReferral(
  blockNumber: BigInt,
  transactionHash: Bytes,
  eventLogIndex: BigInt,
  timestamp: BigInt,
  referral: Address,
  volume: BigInt,
  referralCode: Bytes,
  referrer: Address,
  isIncrease: boolean
): void {
  let actionId = transactionHash.toHexString() + ":" + eventLogIndex.toString()
  let action = new PositionReferralAction(actionId)
  action.isIncrease = isIncrease
  action.account = referral.toHexString()
  action.referralCode = referralCode.toHex()
  action.referrer = referrer.toHexString()
  action.transactionHash = transactionHash.toHexString()
  action.blockNumber = blockNumber.toI32()
  action.logIndex = eventLogIndex.toI32()
  action.timestamp = timestamp
  action.volume = volume
  action.save()

  if (referral.toHexString() == ZERO_ADDRESS || referralCode.toHex() == ZERO_BYTES32) {
    return
  }

  let referrerEntity = _getOrCreateReferrer(referrer.toHexString())
  let tierEntity = Tier.load(referrerEntity.tierId.toString())

  let id = transactionHash.toHexString() + ":" + eventLogIndex.toString()
  let entity = new ReferralVolumeRecord(id)

  entity.volume = volume
  entity.referral = referral.toHexString()
  entity.referralCode = referralCode.toHex()
  entity.referrer = referrer.toHexString()
  entity.tierId = referrerEntity.tierId
  entity.marginFee = BigInt.fromI32(10)
  entity.totalRebate = tierEntity.totalRebate
  entity.discountShare = referrerEntity.discountShare > ZERO
    ? referrerEntity.discountShare : tierEntity.discountShare
  entity.blockNumber = blockNumber
  entity.transactionHash = transactionHash.toHexString()
  entity.timestamp = timestamp

  let feesUsd = entity.volume * entity.marginFee / BASIS_POINTS_DIVISOR
  let totalRebateUsd = feesUsd * entity.totalRebate / BASIS_POINTS_DIVISOR
  let discountUsd = totalRebateUsd * entity.discountShare / BASIS_POINTS_DIVISOR

  entity.totalRebateUsd = totalRebateUsd
  entity.discountUsd = discountUsd

  entity.save()

  let totalReferrerStatEntity = _storeReferrerStats(
    timestamp, "total", volume, referralCode, referrer, referral, totalRebateUsd, discountUsd, null)
  _storeReferrerStats(timestamp, "daily", volume, referralCode, referrer, referral, totalRebateUsd, discountUsd, totalReferrerStatEntity)

  let totalReferralStatEntity = _storeReferralStats(timestamp, "total", referral, volume, discountUsd, null)
  _storeReferralStats(timestamp, "daily", referral, volume, discountUsd, totalReferralStatEntity)

  let totalGlobalStatEntity = _storeGlobalStats(timestamp, "total", volume, totalRebateUsd, discountUsd, null)
  _storeGlobalStats(timestamp, "daily", volume, totalRebateUsd, discountUsd, totalGlobalStatEntity)
}

function _createTradedReferralIfNotExist(referrerStatId: String, referral: Address): boolean {
  let id = referrerStatId + ":" + referral.toHexString()
  let entity = TradedReferral.load(id)
  if (entity == null) {
    entity = new TradedReferral(id)
    entity.referrerStat = referrerStatId
    entity.referral = referral.toHexString()
    entity.save()
    return true
  }
  return false
}

function _createRegisteredReferralIfNotExist(referrerStatId: String, referral: Address): boolean {
  let id = referrerStatId + ":" + referral.toHexString()
  let entity = RegisteredReferral.load(id)
  if (entity == null) {
    entity = new RegisteredReferral(id)
    entity.referrerStat = referrerStatId
    entity.referral = referral.toHexString()
    entity.save()
    return true
  }
  return false
}

function _getOrCreateReferrer(id: String): Referrer {
  let entity = Referrer.load(id)
  if (entity == null) {
    entity = new Referrer(id)
    entity.tierId = ZERO
    entity.discountShare = ZERO
    entity.save()
  }
  return entity as Referrer
}

function _getOrCreateReferrerWithCreatedFlag(id: String): ReferrerResult {
  let entity = Referrer.load(id)
  let created = false
  if (entity == null) {
    entity = new Referrer(id)
    entity.tierId = ZERO
    entity.discountShare = ZERO
    entity.save()
    created = true
  }
  return new ReferrerResult(entity as Referrer, created)
}
