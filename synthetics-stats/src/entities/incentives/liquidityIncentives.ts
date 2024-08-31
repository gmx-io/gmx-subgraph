import { BigInt } from "@graphprotocol/graph-ts";
import {
  UserGlpGmMigrationStat,
  LiquidityProviderIncentivesStat,
  IncentivesStat,
  LiquidityProviderInfo,
  GlpGmMigrationStat
} from "../../../generated/schema";
import { EventData } from "../../utils/eventData";
import { periodToSeconds, timestampToPeriodStart } from "../../utils/time";
import { EventLog1 } from "../../../generated/EventEmitter/EventEmitter";
import { getMarketInfo } from "../markets";
import { convertAmountToUsd, convertUsdToAmount } from "../prices";
import { ZERO } from "../../utils/number";
import { MarketPoolValueUpdatedEventData } from "../../utils/eventData/MarketPoolValueUpdatedEventData";

let SECONDS_IN_WEEK = periodToSeconds("1w");
let ARB_PRECISION = BigInt.fromI32(10).pow(18);

let INCENTIVES_START_TIMESTAMP = 1699401600; // 2023-11-08 00:00:00
// let INCENTIVES_START_TIMESTAMP = 1690833600; // earlier timestamp for testing

let GLP_GM_MIGRATION_DECREASE_THRESHOLD_IN_ARB = BigInt.fromI32(100_000_000).times(ARB_PRECISION); // 100m ARB
let GLP_GM_MIGRATION_CAP_THRESHOLD_IN_ARB = BigInt.fromI32(200_000_000).times(ARB_PRECISION); // 200m ARB

let MAX_FEE_BASIS_POINTS_FOR_REBATE = BigInt.fromI32(25);
let MAX_FEE_BASIS_POINTS_FOR_REBATE_REDUCED = BigInt.fromI32(10);

export function saveLiquidityProviderInfo(
  account: string,
  glvOrMarketAddress: string,
  type: string,
  tokensDelta: BigInt
): void {
  let entity = _getLiquidityProviderInfo(account, glvOrMarketAddress, type);
  entity.tokensBalance = entity.tokensBalance.plus(tokensDelta);

  entity.save();
}

export function saveLiquidityProviderIncentivesStat(
  account: string,
  glvOrMarketAddress: string,
  type: string,
  period: string,
  marketTokenBalanceDelta: BigInt,
  timestamp: i32
): void {
  if (!_incentivesActive(timestamp)) {
    return;
  }

  let entity = _getOrCreateLiquidityProviderIncentivesStat(account, glvOrMarketAddress, type, period, timestamp);

  if (entity.updatedTimestamp == 0) {
    // new entity was created

    let liquidityProviderInfo = _getLiquidityProviderInfo(account, glvOrMarketAddress, type);

    // interpolate cumulative time x tokensBalance starting from the beginning of the period
    let timeInSeconds = BigInt.fromI32(timestamp - entity.timestamp);
    entity.cumulativeTimeByTokensBalance = liquidityProviderInfo.tokensBalance.times(timeInSeconds);
    entity.lastTokensBalance = liquidityProviderInfo.tokensBalance.plus(marketTokenBalanceDelta);
  } else {
    let timeInSeconds = BigInt.fromI32(timestamp - entity.updatedTimestamp);
    entity.cumulativeTimeByTokensBalance = entity.cumulativeTimeByTokensBalance.plus(
      entity.lastTokensBalance.times(timeInSeconds)
    );
    entity.lastTokensBalance = entity.lastTokensBalance.plus(marketTokenBalanceDelta);
  }

  let endTimestamp = entity.timestamp + SECONDS_IN_WEEK;
  let extrapolatedTimeByMarketTokensBalance = entity.lastTokensBalance.times(BigInt.fromI32(endTimestamp - timestamp));
  entity.weightedAverageTokensBalance = entity.cumulativeTimeByTokensBalance
    .plus(extrapolatedTimeByMarketTokensBalance)
    .div(BigInt.fromI32(SECONDS_IN_WEEK));
  entity.updatedTimestamp = timestamp;

  entity.save();
}

export function saveMarketIncentivesStat(eventData: EventData, event: EventLog1): void {
  if (!_incentivesActive(event.block.timestamp.toI32())) {
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

  let data = new MarketPoolValueUpdatedEventData(eventData);

  let marketAddress = data.market;
  let entity = _getOrCreateIncentivesStat(marketAddress, "Market", event.block.timestamp.toI32());

  if (entity.updatedTimestamp == 0) {
    // new entity was created
    // interpolate cumulative time * tokensBalance starting from the beginning of the period

    let marketInfo = getMarketInfo(marketAddress)!;
    let lastTokensSupply =
      marketInfo.marketTokensSupplyFromPoolUpdated == null
        ? marketInfo.marketTokensSupply
        : marketInfo.marketTokensSupplyFromPoolUpdated;
    // entity.timestamp = timestamp of the start of the week (from wed)
    let timeInSeconds = event.block.timestamp.minus(BigInt.fromI32(entity.timestamp));
    entity.cumulativeTimeByTokensSupply = lastTokensSupply.times(timeInSeconds);
  } else {
    let timeInSeconds = event.block.timestamp.minus(BigInt.fromI32(entity.updatedTimestamp));
    entity.cumulativeTimeByTokensSupply = entity.cumulativeTimeByTokensSupply.plus(
      entity.lastTokensSupply.times(timeInSeconds)
    );
  }

  entity.lastTokensSupply = data.marketTokensSupply;
  entity.updatedTimestamp = event.block.timestamp.toI32();

  let endTimestamp = entity.timestamp + SECONDS_IN_WEEK;
  let extrapolatedTimeByMarketTokensSupply = entity.lastTokensSupply.times(
    BigInt.fromI32(endTimestamp).minus(event.block.timestamp)
  );
  entity.weightedAverageTokensSupply = entity.cumulativeTimeByTokensSupply
    .plus(extrapolatedTimeByMarketTokensSupply)
    .div(BigInt.fromI32(SECONDS_IN_WEEK));

  entity.save();
}

function _getMaxFeeBasisPointsForRebate(eligibleDiffInArb: BigInt): BigInt {
  let globalEntity = _getOrCreateGlpGmMigrationStat();
  let eligibleRedemptionInArb = globalEntity.eligibleRedemptionInArb;
  // if eligibleRedemptionInArb = 10m and eligibleDiffInArb = 1,5m should return 25 bps
  // if eligibleRedemptionInArb = 99m and eligibleDiffInArb = 1,5m should return 20 bps ((25 * 1m + 10 * 0.5m) / 1.5m)
  // if eligibleRedemptionInArb = 100m and eligibleDiffInArb = 1,5m should return 10 bps

  let nextEligibleRedemptionInArb = eligibleRedemptionInArb.plus(eligibleDiffInArb);
  if (!eligibleRedemptionInArb.gt(GLP_GM_MIGRATION_DECREASE_THRESHOLD_IN_ARB)) {
    if (!nextEligibleRedemptionInArb.gt(GLP_GM_MIGRATION_DECREASE_THRESHOLD_IN_ARB)) {
      return MAX_FEE_BASIS_POINTS_FOR_REBATE;
    }

    return GLP_GM_MIGRATION_DECREASE_THRESHOLD_IN_ARB.minus(eligibleRedemptionInArb)
      .times(MAX_FEE_BASIS_POINTS_FOR_REBATE)
      .plus(
        nextEligibleRedemptionInArb
          .minus(GLP_GM_MIGRATION_DECREASE_THRESHOLD_IN_ARB)
          .times(MAX_FEE_BASIS_POINTS_FOR_REBATE_REDUCED)
      )
      .div(eligibleDiffInArb);
  }

  return MAX_FEE_BASIS_POINTS_FOR_REBATE_REDUCED;
}

export function saveUserGlpGmMigrationStatGlpData(
  account: string,
  timestamp: i32,
  usdgAmount: BigInt,
  feeBasisPoints: BigInt
): void {
  if (!_incentivesActive(timestamp)) {
    return;
  }

  let entity = _getOrCreateUserGlpGmMigrationStatGlpData(account, timestamp);
  let usdAmount = usdgAmount.times(BigInt.fromI32(10).pow(12));
  let eligibleDiff = _getCappedEligibleRedemptionDiff(
    entity.glpRedemptionUsd,
    entity.glpRedemptionUsd.plus(usdAmount),
    entity.gmDepositUsd
  );

  let maxFeeBasisPointsForRebate = _getMaxFeeBasisPointsForRebate(eligibleDiff.inArb);
  if (feeBasisPoints.gt(maxFeeBasisPointsForRebate)) {
    feeBasisPoints = maxFeeBasisPointsForRebate;
  }

  entity.glpRedemptionUsd = entity.glpRedemptionUsd.plus(usdAmount);
  entity.glpRedemptionFeeBpsByUsd = entity.glpRedemptionFeeBpsByUsd.plus(usdAmount.times(feeBasisPoints));
  entity.glpRedemptionWeightedAverageFeeBps = entity.glpRedemptionFeeBpsByUsd.div(entity.glpRedemptionUsd).toI32();

  if (eligibleDiff.inArb.gt(ZERO)) {
    entity.eligibleRedemptionInArb = entity.eligibleRedemptionInArb.plus(eligibleDiff.inArb);
    entity.eligibleRedemptionUsd = entity.eligibleRedemptionUsd.plus(eligibleDiff.usd);
    entity.eligibleUpdatedTimestamp = timestamp;
  }
  entity.save();

  _saveGlpGmMigrationStat(eligibleDiff);
}

export function saveUserGlpGmMigrationStatGmData(account: string, timestamp: i32, depositUsd: BigInt): void {
  if (!_incentivesActive(timestamp)) {
    return;
  }

  let entity = _getOrCreateUserGlpGmMigrationStatGlpData(account, timestamp);
  let eligibleDiff = _getCappedEligibleRedemptionDiff(
    entity.gmDepositUsd,
    entity.gmDepositUsd.plus(depositUsd),
    entity.glpRedemptionUsd
  );

  entity.gmDepositUsd = entity.gmDepositUsd.plus(depositUsd);
  if (eligibleDiff.inArb.gt(ZERO)) {
    entity.eligibleRedemptionInArb = entity.eligibleRedemptionInArb.plus(eligibleDiff.inArb);
    entity.eligibleRedemptionUsd = entity.eligibleRedemptionUsd.plus(eligibleDiff.usd);
    entity.eligibleUpdatedTimestamp = timestamp;
  }

  entity.save();

  _saveGlpGmMigrationStat(eligibleDiff);
}

function _getArbTokenAddress(): string {
  return "0x912ce59144191c1204e64559fe8253a0e49e6548";
}

function _incentivesActive(timestamp: i32): boolean {
  return timestamp > INCENTIVES_START_TIMESTAMP;
}

class EligibleRedemptionDiffResult {
  constructor(public usd: BigInt, public inArb: BigInt) {}
}

function _getCappedEligibleRedemptionDiff(
  usdBefore: BigInt,
  usdAfter: BigInt,
  otherUsd: BigInt
): EligibleRedemptionDiffResult {
  // case 1: gmDepositUsd: 1000, gmDepositUsd after: 1500, glpRedemptionUsd: 2000 => diffUsd: 500
  // case 2: gmDepositUsd: 1000, gmDepositUsd after: 1500, glpRedemptionUsd: 1200 => diffUsd: 200
  // case 3: gmDepositUsd: 1000, gmDepositUsd after: 1500, glpRedemptionUsd: 800 => diffUsd: 0

  let entity = _getOrCreateGlpGmMigrationStat();

  if (entity.eligibleRedemptionInArb.gt(GLP_GM_MIGRATION_CAP_THRESHOLD_IN_ARB)) {
    return new EligibleRedemptionDiffResult(ZERO, ZERO);
  }

  let minBefore = usdBefore.lt(otherUsd) ? usdBefore : otherUsd;
  let minAfter = usdAfter.lt(otherUsd) ? usdAfter : otherUsd;
  let diffUsd = minAfter.minus(minBefore);
  let diffInArb = convertUsdToAmount(_getArbTokenAddress(), diffUsd);

  if (entity.eligibleRedemptionInArb.plus(diffInArb).gt(GLP_GM_MIGRATION_CAP_THRESHOLD_IN_ARB)) {
    diffInArb = GLP_GM_MIGRATION_CAP_THRESHOLD_IN_ARB.minus(entity.eligibleRedemptionInArb);
    diffUsd = convertAmountToUsd(_getArbTokenAddress(), diffInArb);
  }

  return new EligibleRedemptionDiffResult(diffUsd, diffInArb);
}

function _saveGlpGmMigrationStat(diff: EligibleRedemptionDiffResult): void {
  if (diff.usd.equals(ZERO)) {
    return;
  }

  let entity = _getOrCreateGlpGmMigrationStat();
  entity.eligibleRedemptionUsd = entity.eligibleRedemptionUsd.plus(diff.usd);
  entity.eligibleRedemptionInArb = entity.eligibleRedemptionInArb.plus(diff.inArb);
  entity.save();
}

function _getOrCreateGlpGmMigrationStat(): GlpGmMigrationStat {
  let id = "total";
  let entity = GlpGmMigrationStat.load(id);
  if (entity == null) {
    entity = new GlpGmMigrationStat(id);
    entity.eligibleRedemptionUsd = ZERO;
    entity.eligibleRedemptionInArb = ZERO;
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
    entity.eligibleRedemptionInArb = ZERO;
    entity.eligibleRedemptionUsd = ZERO;
    entity.eligibleUpdatedTimestamp = 0;
  }

  return entity!;
}

function _getOrCreateLiquidityProviderIncentivesStat(
  account: string,
  glvOrMarketAddress: string,
  type: string,
  period: string,
  timestamp: i32
): LiquidityProviderIncentivesStat {
  let startTimestamp = timestampToPeriodStart(timestamp, period);
  let id = account + ":" + glvOrMarketAddress + ":" + period + ":" + startTimestamp.toString();
  let entity = LiquidityProviderIncentivesStat.load(id);
  if (entity == null) {
    entity = new LiquidityProviderIncentivesStat(id);
    entity.timestamp = startTimestamp;
    entity.period = period;
    entity.account = account;
    entity.glvOrMarketAddress = glvOrMarketAddress;
    entity.type = type;

    entity.updatedTimestamp = 0;
    entity.lastTokensBalance = ZERO;
    entity.cumulativeTimeByTokensBalance = ZERO;
    entity.weightedAverageTokensBalance = ZERO;
  }

  return entity!;
}

function _getOrCreateIncentivesStat(glvOrMarketAddress: string, type: string, timestamp: i32): IncentivesStat {
  let period = "1w";
  let startTimestamp = timestampToPeriodStart(timestamp, period);
  let id = glvOrMarketAddress + ":" + period + ":" + startTimestamp.toString();
  let entity = IncentivesStat.load(id);

  if (entity == null) {
    entity = new IncentivesStat(id);
    entity.timestamp = startTimestamp;
    entity.period = period;
    entity.glvOrMarketAddress = glvOrMarketAddress;
    entity.type = type;

    entity.updatedTimestamp = 0;
    entity.lastTokensSupply = ZERO;
    entity.cumulativeTimeByTokensSupply = ZERO;
    entity.weightedAverageTokensSupply = ZERO;
  }

  return entity!;
}

function _getLiquidityProviderInfo(account: string, glvOrMarketAddress: string, type: string): LiquidityProviderInfo {
  let id = account + ":" + glvOrMarketAddress;
  let entity = LiquidityProviderInfo.load(id);

  if (entity == null) {
    entity = new LiquidityProviderInfo(id);
    entity.tokensBalance = ZERO;
    entity.account = account;
    entity.glvOrMarketAddress = glvOrMarketAddress;
    entity.type = type;
  }

  return entity!;
}
