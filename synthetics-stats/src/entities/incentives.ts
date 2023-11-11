import { BigInt, log } from "@graphprotocol/graph-ts";
import {
  UserGlpGmMigrationStat,
  LiquidityProviderIncentivesStat,
  MarketIncentivesStat,
  UserMarketInfo,
  GlpGmMigrationStat
} from "../../generated/schema";
import { EventData } from "../utils/eventData";
import { periodToSeconds, timestampToPeriodStart } from "../utils/time";
import { EventLog1 } from "../../generated/EventEmitter/EventEmitter";
import { getMarketInfo } from "./markets";
import { getTokenPrice } from "./prices";

let ZERO = BigInt.fromI32(0);
let SECONDS_IN_WEEK = periodToSeconds("1w");
let ARB_PRECISION = BigInt.fromI32(10).pow(18);

// TODO restore correct timestamp
// let INCENTIVES_START_TIMESTAMP = 1699401600;
let INCENTIVES_START_TIMESTAMP = 1690833600;

// TODO update caps to correct
let GLP_GM_MIGRATION_DECREASE_THRESHOLD_IN_ARB = BigInt.fromI32(5_000_000).times(ARB_PRECISION); // 100m ARB
let GLP_GM_MIGRATION_CAP_THRESHOLD_IN_ARB = BigInt.fromI32(10_000_000).times(ARB_PRECISION); // 200m ARB

let MAX_FEE_BASIS_POINTS_FOR_REBATE = BigInt.fromI32(25);
let MAX_FEE_BASIS_POINTS_FOR_REBATE_REDUCED = BigInt.fromI32(10);

export function saveUserMarketInfo(account: string, marketAddress: string, marketTokensDelta: BigInt): void {
  let entity = _getUserMarketInfo(account, marketAddress);
  entity.marketTokensBalance = entity.marketTokensBalance.plus(marketTokensDelta);

  entity.save();
}

export function saveLiquidityProviderIncentivesStat(
  account: string,
  marketAddress: string,
  period: string,
  marketTokenBalanceDelta: BigInt,
  timestamp: i32
): void {
  if (!_incentivesStarted(timestamp)) {
    return;
  }

  let entity = _getOrCreateLiquidityProviderIncentivesStat(account, marketAddress, period, timestamp);

  if (entity.updatedTimestamp == 0) {
    // new entity was created

    let userMarketInfo = _getUserMarketInfo(account, marketAddress);

    // interpolate cumulative time x marketTokensBalance starting from the beginning of the period
    let timeInSeconds = BigInt.fromI32(timestamp - entity.timestamp);
    entity.cumulativeTimeByMarketTokensBalance = userMarketInfo.marketTokensBalance.times(timeInSeconds);
    entity.lastMarketTokensBalance = userMarketInfo.marketTokensBalance.plus(marketTokenBalanceDelta);
  } else {
    let timeInSeconds = BigInt.fromI32(timestamp - entity.updatedTimestamp);
    entity.cumulativeTimeByMarketTokensBalance = entity.cumulativeTimeByMarketTokensBalance.plus(
      entity.lastMarketTokensBalance.times(timeInSeconds)
    );
    entity.lastMarketTokensBalance = entity.lastMarketTokensBalance.plus(marketTokenBalanceDelta);
  }

  let endTimestamp = entity.timestamp + SECONDS_IN_WEEK;
  let extrapolatedTimeByMarketTokensBalance = entity.lastMarketTokensBalance.times(
    BigInt.fromI32(endTimestamp - timestamp)
  );
  entity.weightedAverageMarketTokensBalance = entity.cumulativeTimeByMarketTokensBalance
    .plus(extrapolatedTimeByMarketTokensBalance)
    .div(BigInt.fromI32(SECONDS_IN_WEEK));
  entity.updatedTimestamp = timestamp;

  entity.save();
}

export function saveMarketIncentivesStat(eventData: EventData, event: EventLog1): void {
  if (!_incentivesStarted(event.block.timestamp.toI32())) {
    return;
  }

  // tracks cumulative product of time and market tokens supply
  // to calculate weighted average supply for the period
  //
  // for example:
  // - on day 1: supply = 1000
  // - on days 2-3: supply = 2000
  // - on days 4-7: supply = 3000
  // weighted average supply = (1000 * 1 + 2000 * 2 + 3000 * 4) / 7 = ~2427
  //
  // cumulative product is increased on each deposit or withdrawal:
  // cumulative product = cumulative product + (previous tokens supply * time since last deposit/withdrawal)

  let marketTokensSupply = eventData.getUintItem("marketTokensSupply")!;
  let marketAddress = eventData.getAddressItemString("market")!;
  let entity = _getOrCreateMarketIncentivesStat(marketAddress, event.block.timestamp.toI32());

  if (entity.updatedTimestamp == 0) {
    // new entity was created
    // interpolate cumulative time * marketTokensBalance starting from the beginning of the period

    let marketInfo = getMarketInfo(marketAddress)!;
    let timeInSeconds = event.block.timestamp.minus(BigInt.fromI32(entity.timestamp));
    entity.cumulativeTimeByMarketTokensSupply = marketInfo.marketTokensSupply.times(timeInSeconds);
  } else {
    let timeInSeconds = event.block.timestamp.minus(BigInt.fromI32(entity.updatedTimestamp));
    entity.cumulativeTimeByMarketTokensSupply = entity.cumulativeTimeByMarketTokensSupply.plus(
      entity.lastMarketTokensSupply.times(timeInSeconds)
    );
  }

  entity.lastMarketTokensSupply = marketTokensSupply;
  entity.updatedTimestamp = event.block.timestamp.toI32();

  let endTimestamp = entity.timestamp + SECONDS_IN_WEEK;
  let extrapolatedTimeByMarketTokensSupply = entity.lastMarketTokensSupply.times(
    BigInt.fromI32(endTimestamp).minus(event.block.timestamp)
  );
  entity.weightedAverageMarketTokensSupply = entity.cumulativeTimeByMarketTokensSupply
    .plus(extrapolatedTimeByMarketTokensSupply)
    .div(BigInt.fromI32(SECONDS_IN_WEEK));

  entity.save();
}

function _getMaxFeeBasisPointsForRebate(eligableDiffInArb: BigInt): BigInt {
  let globalEntity = _getOrCreateGlpGmMigrationStat();
  let eligableRedemptionInArb = globalEntity.eligableRedemptionInArb;
  // if eligableRedemptionInArb = 10m and eligableDiffInArb = 1,5m should return 25 bps
  // if eligableRedemptionInArb = 99m and eligableDiffInArb = 1,5m should return 20 bps ((25 * 1m + 10 * 0.5m) / 1.5m)
  // if eligableRedemptionInArb = 100m and eligableDiffInArb = 1,5m should return 10 bps

  let nextEligableRedemptionInArb = eligableRedemptionInArb.plus(eligableDiffInArb);
  if (!eligableRedemptionInArb.gt(GLP_GM_MIGRATION_DECREASE_THRESHOLD_IN_ARB)) {
    if (!nextEligableRedemptionInArb.gt(GLP_GM_MIGRATION_DECREASE_THRESHOLD_IN_ARB)) {
      return MAX_FEE_BASIS_POINTS_FOR_REBATE;
    }

    return GLP_GM_MIGRATION_DECREASE_THRESHOLD_IN_ARB.minus(eligableRedemptionInArb)
      .times(MAX_FEE_BASIS_POINTS_FOR_REBATE)
      .plus(
        nextEligableRedemptionInArb
          .minus(GLP_GM_MIGRATION_DECREASE_THRESHOLD_IN_ARB)
          .times(MAX_FEE_BASIS_POINTS_FOR_REBATE_REDUCED)
      )
      .div(eligableDiffInArb);
  }

  return MAX_FEE_BASIS_POINTS_FOR_REBATE_REDUCED;
}

export function saveUserGlpGmMigrationStatGlpData(
  account: string,
  timestamp: i32,
  usdgAmount: BigInt,
  feeBasisPoints: BigInt
): void {
  if (!_incentivesStarted(timestamp)) {
    return;
  }

  let entity = _getOrCreateUserGlpGmMigrationStatGlpData(account, timestamp);
  let usdAmount = usdgAmount.times(BigInt.fromI32(10).pow(12));
  let eligableDiff = _getEligableRedemptionDiff(
    entity.glpRedemptionUsd.minus(usdAmount),
    entity.glpRedemptionUsd,
    entity.gmDepositUsd
  );

  let maxFeeBasisPointsForRebate = _getMaxFeeBasisPointsForRebate(eligableDiff.inArb);
  if (feeBasisPoints.gt(maxFeeBasisPointsForRebate)) {
    feeBasisPoints = maxFeeBasisPointsForRebate;
  }

  entity.glpRedemptionUsd = entity.glpRedemptionUsd.plus(usdAmount);
  entity.glpRedemptionFeeBpsByUsd = entity.glpRedemptionFeeBpsByUsd.plus(usdAmount.times(feeBasisPoints));
  entity.glpRedemptionWeightedAverageFeeBps = entity.glpRedemptionFeeBpsByUsd.div(entity.glpRedemptionUsd).toI32();

  entity.eligableRedemptionInArb = entity.eligableRedemptionInArb.plus(eligableDiff.inArb);
  entity.save();

  _saveGlpGmMigrationStat(eligableDiff);
}

export function saveUserGlpGmMigrationStatGmData(account: string, timestamp: i32, depositUsd: BigInt): void {
  if (!_incentivesStarted(timestamp)) {
    return;
  }

  let entity = _getOrCreateUserGlpGmMigrationStatGlpData(account, timestamp);
  let eligableDiff = _getEligableRedemptionDiff(
    entity.gmDepositUsd.minus(depositUsd),
    entity.gmDepositUsd,
    entity.glpRedemptionUsd
  );

  entity.gmDepositUsd = entity.gmDepositUsd.plus(depositUsd);
  entity.eligableRedemptionInArb = entity.eligableRedemptionInArb.plus(eligableDiff.inArb);

  entity.save();

  _saveGlpGmMigrationStat(eligableDiff);
}

function _convertArbToUsd(arbAmount: BigInt): BigInt {
  let arbPrice = getTokenPrice(_getArbTokenAddress(), false);
  return arbAmount.times(arbPrice);
}

function _convertUsdToArb(usd: BigInt): BigInt {
  let arbPrice = getTokenPrice(_getArbTokenAddress(), true);
  return usd.div(arbPrice);
}

function _getArbTokenAddress(): string {
  return "0x912ce59144191c1204e64559fe8253a0e49e6548";
}

function _incentivesStarted(timestamp: i32): boolean {
  return timestamp > INCENTIVES_START_TIMESTAMP;
}

class EligableRedemptionDiffResult {
  constructor(public usd: BigInt, public inArb: BigInt) {}
}

function _getEligableRedemptionDiff(
  usdBefore: BigInt,
  usdAfter: BigInt,
  otherUsd: BigInt
): EligableRedemptionDiffResult {
  // case 1: gmDepositUsd: 1000, gmDepositUsd after: 1500, glpRedemptionUsd: 2000 => diffUsd: 500
  // case 2: gmDepositUsd: 1000, gmDepositUsd after: 1500, glpRedemptionUsd: 1200 => diffUsd: 200
  // case 3: gmDepositUsd: 1000, gmDepositUsd after: 1500, glpRedemptionUsd: 800 => diffUsd: 0

  let entity = _getOrCreateGlpGmMigrationStat();

  if (entity.eligableRedemptionInArb.gt(GLP_GM_MIGRATION_CAP_THRESHOLD_IN_ARB)) {
    return new EligableRedemptionDiffResult(ZERO, ZERO);
  }

  let minBefore = usdBefore.lt(otherUsd) ? usdBefore : otherUsd;
  let minAfter = usdAfter.lt(otherUsd) ? usdAfter : otherUsd;
  let diffUsd = minAfter.minus(minBefore);
  let diffInArb = _convertUsdToArb(diffUsd);

  if (entity.eligableRedemptionInArb.plus(diffInArb).gt(GLP_GM_MIGRATION_CAP_THRESHOLD_IN_ARB)) {
    diffInArb = GLP_GM_MIGRATION_CAP_THRESHOLD_IN_ARB.minus(entity.eligableRedemptionInArb);
    diffUsd = _convertArbToUsd(diffInArb);
  }

  return new EligableRedemptionDiffResult(diffUsd, diffInArb);
}

function _saveGlpGmMigrationStat(diff: EligableRedemptionDiffResult): void {
  if (diff.usd.equals(ZERO)) {
    return;
  }

  let entity = _getOrCreateGlpGmMigrationStat();
  entity.eligableRedemptionUsd = entity.eligableRedemptionUsd.plus(diff.usd);
  entity.eligableRedemptionInArb = entity.eligableRedemptionInArb.plus(diff.inArb);
  entity.save();
}

function _getOrCreateGlpGmMigrationStat(): GlpGmMigrationStat {
  let id = "total";
  let entity = GlpGmMigrationStat.load(id);
  if (entity == null) {
    entity = new GlpGmMigrationStat(id);
    entity.eligableRedemptionUsd = ZERO;
    entity.eligableRedemptionInArb = ZERO;
  }
  return entity!;
}

function _getOrCreateUserGlpGmMigrationStatGlpData(account: string, timestamp: i32): UserGlpGmMigrationStat {
  let period = "1w";
  let startTimestamp = timestampToPeriodStart(timestamp, period);
  let id = account + ":" + period + ":" + startTimestamp.toString();
  let entity = UserGlpGmMigrationStat.load(id);

  if (entity == null) {
    entity = new UserGlpGmMigrationStat(id);
    entity.period = period;
    entity.account = account;
    entity.timestamp = startTimestamp;
    entity.glpRedemptionUsd = ZERO;
    entity.glpRedemptionFeeBpsByUsd = ZERO;
    entity.glpRedemptionWeightedAverageFeeBps = 0;
    entity.gmDepositUsd = ZERO;
    entity.eligableRedemptionInArb = ZERO;
  }

  return entity!;
}

function _getOrCreateLiquidityProviderIncentivesStat(
  account: string,
  marketAddress: string,
  period: string,
  timestamp: i32
): LiquidityProviderIncentivesStat {
  let startTimestamp = timestampToPeriodStart(timestamp, period);
  let id = account + ":" + marketAddress + ":" + period + ":" + startTimestamp.toString();
  let entity = LiquidityProviderIncentivesStat.load(id);
  if (entity == null) {
    entity = new LiquidityProviderIncentivesStat(id);
    entity.timestamp = startTimestamp;
    entity.period = period;
    entity.account = account;
    entity.marketAddress = marketAddress;

    entity.updatedTimestamp = 0;
    entity.lastMarketTokensBalance = ZERO;
    entity.cumulativeTimeByMarketTokensBalance = ZERO;
    entity.weightedAverageMarketTokensBalance = ZERO;
  }

  return entity!;
}

function _getOrCreateMarketIncentivesStat(marketAddress: string, timestamp: i32): MarketIncentivesStat {
  let period = "1w";
  let startTimestamp = timestampToPeriodStart(timestamp, period);
  let id = marketAddress + ":" + period + ":" + startTimestamp.toString();
  let entity = MarketIncentivesStat.load(id);

  if (entity == null) {
    entity = new MarketIncentivesStat(id);
    entity.timestamp = startTimestamp;
    entity.period = period;
    entity.marketAddress = marketAddress;

    entity.updatedTimestamp = 0;
    entity.lastMarketTokensSupply = ZERO;
    entity.cumulativeTimeByMarketTokensSupply = ZERO;
    entity.weightedAverageMarketTokensSupply = ZERO;
  }

  return entity!;
}

function _getUserMarketInfo(account: string, marketAddress: string): UserMarketInfo {
  let id = account + ":" + marketAddress;
  let entity = UserMarketInfo.load(id);

  if (entity == null) {
    entity = new UserMarketInfo(id);
    entity.marketTokensBalance = ZERO;
    entity.account = account;
    entity.marketAddress = marketAddress;
  }

  return entity!;
}
