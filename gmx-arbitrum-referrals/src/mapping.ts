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
  ExampleEntity,
  ReferralVolumeRecord,
  ReferralVolumeStat,
  Tier,
  Referrer,
  Referral
} from "../generated/schema"
import {
  timestampToPeriod
} from "../../utils"

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"
const ZERO_BYTES32 = "0x0000000000000000000000000000000000000000000000000000000000000000"
let BASIS_POINTS_DIVISOR = BigInt.fromI32(10000)


export function handleDecreasePositionReferral(event: DecreasePositionReferral): void {
  _handleChangePositionReferral(
    event.transaction.hash,
    event.logIndex,
    event.block.timestamp,
    event.params.account,
    event.params.sizeDelta,
    event.params.referralCode,
    event.params.referrer
  )
}

export function handleIncreasePositionReferral(event: IncreasePositionReferral): void {
  _handleChangePositionReferral(
    event.transaction.hash,
    event.logIndex,
    event.block.timestamp,
    event.params.account,
    event.params.sizeDelta,
    event.params.referralCode,
    event.params.referrer
  )
}

export function handleGovSetCodeOwner(event: GovSetCodeOwner): void {}

export function handleRegisterCode(event: RegisterCode): void {
   _getOrCreateReferrer(event.params.account.toHexString())
}

export function handleSetCodeOwner(event: SetCodeOwner): void {}

export function handleSetHandler(event: SetHandler): void {}

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

export function handleSetTraderReferralCode(event: SetTraderReferralCode): void {}

function _getOrCreateTier(id: String): Tier {
  let entity = Tier.load(id)
  if (entity == null) {
    entity = new Tier(id)
    entity.totalRebate = BigInt.fromI32(0)
    entity.discountShare = BigInt.fromI32(5000)
    entity.save()
  }
  return entity as Tier
}

function _storeStats(
  timestamp: BigInt,
  period: String,
  volume: BigInt,
  referralCode: Bytes,
  referrer: Address,
  referral: Address,
  totalRebateUsd: BigInt,
  discountUsd: BigInt,
  totalEntity: ReferralVolumeStat | null
): ReferralVolumeStat {
  let periodTimestamp = timestampToPeriod(timestamp, period)
  let id = periodTimestamp.toString() + ":" + referralCode.toHex() + ":" + referrer.toHexString()

  let entity = ReferralVolumeStat.load(id)
  if (entity === null) {
    entity = new ReferralVolumeStat(id)
    entity.volume = BigInt.fromI32(0)
    entity.volumeCumulative = BigInt.fromI32(0)
    entity.trades = BigInt.fromI32(0)
    entity.tradesCumulative = BigInt.fromI32(0)

    entity.totalRebateUsd = BigInt.fromI32(0)
    entity.totalRebateUsdCumulative = BigInt.fromI32(0)
    entity.discountUsd = BigInt.fromI32(0)
    entity.discountUsdCumulative = BigInt.fromI32(0)

    entity.timestamp = periodTimestamp
    entity.referrer = referrer.toHexString()
    entity.referralCode = referralCode.toHex()
    entity.period = period
  }

  let referralEntityId = id + ":" + referral.toHexString()
  let referralEntity = _getOrCreateReferral(referralEntityId)
  entity.referralsCount = BigInt.fromI32(entity.referrals.length)

  entity.volume += volume
  entity.trades += BigInt.fromI32(1)
  entity.totalRebateUsd += totalRebateUsd
  entity.discountUsd += discountUsd
  if (period == "total") {
    entity.volumeCumulative = entity.volume
    entity.totalRebateUsdCumulative = entity.totalRebateUsd
    entity.discountUsdCumulative = entity.discountUsd
    entity.tradesCumulative = totalEntity.tradesCumulative
    entity.referralsCountCumulative = entity.referralsCount
  } else {
    entity.volumeCumulative = totalEntity.volumeCumulative
    entity.tradesCumulative = totalEntity.tradesCumulative
    entity.totalRebateUsdCumulative = totalEntity.totalRebateUsdCumulative
    entity.discountUsdCumulative = totalEntity.discountUsdCumulative
    entity.referralsCountCumulative = totalEntity.referralsCount
  }

  entity.save()

  return entity as ReferralVolumeStat
}

function _handleChangePositionReferral(
  transactionHash: Bytes,
  eventLogIndex: BigInt,
  timestamp: BigInt,
  referral: Address,
  volume: BigInt,
  referralCode: Bytes,
  referrer: Address
): void {
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
  entity.discountShare = referrerEntity.discountShare
    ? referrerEntity.discountShare : tierEntity.discountShare
  entity.transactionHash = transactionHash.toHexString()
  entity.timestamp = timestamp

  let feesUsd = entity.volume * entity.marginFee / BASIS_POINTS_DIVISOR
  let totalRebateUsd = feesUsd * entity.totalRebate / BASIS_POINTS_DIVISOR
  let discountUsd = totalRebateUsd * entity.discountShare / BASIS_POINTS_DIVISOR

  entity.totalRebateUsd = totalRebateUsd
  entity.discountUsd = discountUsd

  entity.save()

  let totalEntity = _storeStats(
    timestamp, "total", volume, referralCode, referrer, referral, totalRebateUsd, discountUsd, null)
  _storeStats(timestamp, "daily", volume, referralCode, referrer, referral, totalRebateUsd, discountUsd, totalEntity)
}

function _getOrCreateReferral(id: String): Referral {
  let entity = Referral.load(id)
  if (entity == null) {
    entity = new Referral(id)
    entity.save()
  }
  return entity as Referral
}

function _getOrCreateReferrer(id: String): Referrer {
  let entity = Referrer.load(id)
  if (entity == null) {
    entity = new Referrer(id)
    entity.tierId = BigInt.fromI32(0)
    entity.discountShare = BigInt.fromI32(0)
    entity.save()
  }
  return entity as Referrer
}
