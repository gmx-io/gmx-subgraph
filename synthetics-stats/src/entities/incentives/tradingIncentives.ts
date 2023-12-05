import { BigInt } from "@graphprotocol/graph-ts";

import { TradingIncentivesStat, UserTradingIncentivesStat } from "../../../generated/schema";
import { periodToSeconds, timestampToPeriodStart } from "../../utils/time";
import { ZERO, expandDecimals } from "../../utils/number";
import { convertAmountToUsd, convertUsdToAmount } from "../prices";

let SECONDS_IN_WEEK = periodToSeconds("1w");

let INCENTIVES_START_TIMESTAMP = 1700006400; // 2023-11-15 00:00:00
// let INCENTIVES_START_TIMESTAMP = 1690833600; // earlier timestamp for testing

let REBATE_PERCENT = BigInt.fromI32(7500);

function _getRebatesCapForEpoch(timestamp: i32): BigInt {
  // no caps
  return expandDecimals(BigInt.fromI32(100_000_000), 18);
}

function _getEpochIndexSinceIncentivesStart(timestamp: i32): i32 {
  return (timestamp - INCENTIVES_START_TIMESTAMP) / SECONDS_IN_WEEK;
}

function _incentivesActive(timestamp: i32): boolean {
  return timestamp > INCENTIVES_START_TIMESTAMP;
}

function _getArbTokenAddress(): string {
  return "0x912ce59144191c1204e64559fe8253a0e49e6548";
}

class CappedPositionFeesResult {
  constructor(public usd: BigInt, public inArb: BigInt) {}
}

function _getEligibleFees(
  positionFeesUsd: BigInt,
  positionFeesInArb: BigInt,
  globalEligibleFeesInArb: BigInt,
  timestamp: i32
): CappedPositionFeesResult {
  let REBATES_CAP_FOR_EPOCH_IN_ARB = _getRebatesCapForEpoch(timestamp);

  let eligibleFeesUsd = positionFeesUsd.times(REBATE_PERCENT).div(BigInt.fromI32(10000));
  let eligibleFeesInArb = positionFeesInArb.times(REBATE_PERCENT).div(BigInt.fromI32(10000));

  if (globalEligibleFeesInArb.plus(eligibleFeesInArb).gt(REBATES_CAP_FOR_EPOCH_IN_ARB)) {
    eligibleFeesInArb = REBATES_CAP_FOR_EPOCH_IN_ARB.minus(globalEligibleFeesInArb);
    eligibleFeesUsd = convertAmountToUsd(_getArbTokenAddress(), eligibleFeesInArb);
  }

  return new CappedPositionFeesResult(eligibleFeesUsd, eligibleFeesInArb);
}

export function saveTradingIncentivesStat(
  account: string,
  timestamp: i32,
  feesAmount: BigInt,
  collateralTokenPrice: BigInt
): void {
  if (!_incentivesActive(timestamp)) {
    return;
  }

  let positionFeesUsd = feesAmount.times(collateralTokenPrice);
  let positionFeesInArb = convertUsdToAmount(_getArbTokenAddress(), positionFeesUsd);
  let globalEntity = _getOrCreateTradingIncentivesStat(timestamp);
  let eligibleFees = _getEligibleFees(positionFeesUsd, positionFeesInArb, globalEntity.eligibleFeesInArb, timestamp);

  globalEntity.positionFeesUsd = globalEntity.positionFeesUsd.plus(positionFeesUsd);
  globalEntity.positionFeesInArb = globalEntity.positionFeesInArb.plus(positionFeesInArb);
  if (eligibleFees.inArb.gt(ZERO)) {
    globalEntity.eligibleFeesUsd = globalEntity.eligibleFeesUsd.plus(eligibleFees.usd);
    globalEntity.eligibleFeesInArb = globalEntity.eligibleFeesInArb.plus(eligibleFees.inArb);
  }
  globalEntity.save();

  let userEntity = _getOrCreateUserTradingIncentivesStat(account, timestamp);
  userEntity.positionFeesUsd = userEntity.positionFeesUsd.plus(positionFeesUsd);
  userEntity.positionFeesInArb = userEntity.positionFeesInArb.plus(positionFeesInArb);
  if (eligibleFees.inArb.gt(ZERO)) {
    userEntity.eligibleFeesInArb = userEntity.eligibleFeesInArb.plus(eligibleFees.inArb);
    userEntity.eligibleFeesUsd = userEntity.eligibleFeesUsd.plus(eligibleFees.usd);
    userEntity.eligibleUpdatedTimestamp = timestamp;
  }
  userEntity.save();
}

function _getOrCreateUserTradingIncentivesStat(account: string, timestamp: i32): UserTradingIncentivesStat {
  let period = "1w";
  let startTimestamp = timestampToPeriodStart(timestamp, period);
  let id = account + ":" + period + ":" + startTimestamp.toString();
  let entity = UserTradingIncentivesStat.load(id);
  if (entity == null) {
    entity = new UserTradingIncentivesStat(id);
    entity.period = period;
    entity.timestamp = startTimestamp;
    entity.account = account;

    entity.positionFeesUsd = ZERO;
    entity.positionFeesInArb = ZERO;
    entity.eligibleFeesInArb = ZERO;
    entity.eligibleFeesUsd = ZERO;
    entity.eligibleUpdatedTimestamp = 0;
  }
  return entity!;
}

function _getOrCreateTradingIncentivesStat(timestamp: i32): TradingIncentivesStat {
  let period = "1w";
  let startTimestamp = timestampToPeriodStart(timestamp, period);
  let id = period + ":" + startTimestamp.toString();
  let entity = TradingIncentivesStat.load(id);
  if (entity == null) {
    entity = new TradingIncentivesStat(id);
    entity.period = period;
    entity.timestamp = startTimestamp;
    entity.positionFeesUsd = ZERO;
    entity.positionFeesInArb = ZERO;
    entity.eligibleFeesInArb = ZERO;
    entity.eligibleFeesUsd = ZERO;
    entity.rebatesCapInArb = _getRebatesCapForEpoch(timestamp);
  }
  return entity!;
}
