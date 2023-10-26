import { Address, BigInt } from "@graphprotocol/graph-ts";
import { LiquidityProviderIncentivesStat, MarketIncentivesStat, UserMarketInfo } from "../../generated/schema";
import { EventData } from "../utils/eventData";
import { Period, periodToSeconds, timestampToPeriodStart } from "../utils/time";
import { EventLog1 } from "../../generated/EventEmitter/EventEmitter";
import { getOrCreatePoolValueRef } from "./common";

let ZERO = BigInt.fromI32(0);
let GM_PRECISION = BigInt.fromI32(10).pow(18);
let WEEK = periodToSeconds("1w");

export function saveUserMarketInfo(account: Address, marketAddress: Address, marketTokensDelta: BigInt): void {
  let entity = _getUserMarketInfo(account, marketAddress);
  entity.marketTokensBalance = entity.marketTokensBalance.plus(marketTokensDelta);
  entity.save();
}

export function saveLiquidityProviderIncentivesStat(
  account: Address,
  marketAddress: Address,
  period: Period,
  marketTokenBalanceDelta: BigInt,
  timestamp: number
): void {
  let entity = _getOrCreateLiquidityProviderIncentivesStat(account, marketAddress, period, timestamp);
  if (entity.updatedTimestamp == 0) {
    // new entity was created
    // interpolate cumulative time x marketTokensBalance starting from the beginning of the period
    let userMarketInfo = _getUserMarketInfo(account, marketAddress);
    entity.cumulativeTimeByMarketTokensBalance = entity.cumulativeTimeByMarketTokensBalance.plus(
      userMarketInfo.marketTokensBalance.times(BigInt.fromI32(timestamp - entity.timestamp))
    ) 
  } else {
    entity.cumulativeTimeByMarketTokensBalance = entity.cumulativeTimeByMarketTokensBalance.plus(
      entity.lastMarketTokensBalance.times(BigInt.fromI32(timestamp - entity.updatedTimestamp))
    ) 
  }
  
  entity.lastMarketTokensBalance = entity.lastMarketTokensBalance.plus(marketTokenBalanceDelta);
  entity.updatedTimestamp = timestamp;
  
  let endTimestamp = entity.timestamp + WEEK;
  let extrapolatedTimeByMarketTokensBalance = entity.lastMarketTokensBalance.times(BigInt.fromI32(endTimestamp - timestamp))
  entity.weightedAverageMarketTokensBalance = entity.cumulativeTimeByMarketTokensBalance.plus(extrapolatedTimeByMarketTokensBalance).times(GM_PRECISION).div(WEEK)
  
  entity.save();
}

export function saveMarketIncentivesStat(eventData: EventData, event: EventLog1): void {
  let marketTokensSupply = eventData.getUintItem("marketTokensSupply")!
  let entity = _getOrCreateMarketIncentivesStat(eventData.getAddressItem("market")!, event.block.timestamp.toI32());
  
  if (entity.updatedTimestamp == 0) {
    // new entity was created
    // interpolate cumulative time x marketTokensBalance starting from the beginning of the period
    let marketAddress = eventData.getAddressItem("market")!;
    let poolValueRef = getOrCreatePoolValueRef(marketAddress.toHexString())!;
    entity.cumulativeTimeByMarketTokensSupply = entity.cumulativeTimeByMarketTokensSupply.plus(
      poolValueRef.marketTokensSupply.times(event.block.timestamp.minus(BigInt.fromI32(entity.timestamp)))
    ) 
  } else {
    entity.cumulativeTimeByMarketTokensSupply = entity.cumulativeTimeByMarketTokensSupply.plus(
      entity.lastMarketTokensSupply.times(event.block.timestamp.minus(BigInt.fromI32(entity.updatedTimestamp)))
    ) 
  }
  
  entity.lastMarketTokensSupply = marketTokensSupply;
  entity.updatedTimestamp = event.block.timestamp.toI32();
  
  let endTimestamp = entity.timestamp + WEEK;
  let extrapolatedTimeByMarketTokensSupply = entity.lastMarketTokensSupply.times(BigInt.fromI32(endTimestamp).minus(event.block.timestamp))
  entity.weightedAverageMarketTokensSupply = entity.cumulativeTimeByMarketTokensSupply.plus(extrapolatedTimeByMarketTokensSupply).times(GM_PRECISION).div(BigInt.fromI32(WEEK))
  
  entity.save();
}

function _getOrCreateLiquidityProviderIncentivesStat(account: Address, marketAddress: Address, period: Period, timestamp: number): LiquidityProviderIncentivesStat {
  let startTimestamp = timestampToPeriodStart(timestamp, period);
  let id = account.toHexString() + ":" + marketAddress.toHexString() + ":" + startTimestamp;
  let entity = LiquidityProviderIncentivesStat.load(id);
  if (entity == null) {
    entity = new LiquidityProviderIncentivesStat(id);
    entity.timestamp = startTimestamp;
    entity.period = period;

    entity.updatedTimestamp = 0;
    entity.lastMarketTokensBalance = ZERO;
    entity.cumulativeTimeByMarketTokensBalance = ZERO;
    entity.weightedAverageMarketTokensBalance = ZERO;
  }
  
  return entity;
}

function _getOrCreateMarketIncentivesStat(marketAddress: Address, timestamp: i32): MarketIncentivesStat {
  let period: Period = "1w";
  let startTimestamp = timestampToPeriodStart(timestamp, period);
  let id = marketAddress.toHexString() + ":" + startTimestamp.toString();
  let entity = MarketIncentivesStat.load(id);
  
  if (entity == null) {
    entity = new MarketIncentivesStat(id);
    entity.timestamp = startTimestamp;
    entity.period = period

    entity.updatedTimestamp = 0;
    entity.lastMarketTokensSupply = ZERO;
    entity.cumulativeTimeByMarketTokensSupply = ZERO;
    entity.weightedAverageMarketTokensSupply = ZERO;
  }
  
  return entity!;
}

function _getUserMarketInfo(account: Address, marketAddress: Address): UserMarketInfo {
  let id = account.toHexString() + ":" + marketAddress.toHexString();
  let entity = UserMarketInfo.load(id);

  if (entity == null) {
    entity = new UserMarketInfo(id);
    entity.marketTokensBalance = ZERO;
  }
  
  return entity;
}

