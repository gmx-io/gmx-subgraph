import { BigInt } from "@graphprotocol/graph-ts";
import { LiquidityProviderIncentivesStat, MarketIncentivesStat, UserMarketInfo } from "../../generated/schema";
import { EventData } from "../utils/eventData";
import { periodToSeconds, timestampToPeriodStart } from "../utils/time";
import { EventLog1 } from "../../generated/EventEmitter/EventEmitter";
import { getMarketInfo } from "./markets";

let ZERO = BigInt.fromI32(0);
let SECONDS_IN_WEEK = periodToSeconds("1w");

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
  let entity = _getOrCreateLiquidityProviderIncentivesStat(account, marketAddress, period, timestamp);
  if (entity.updatedTimestamp == 0) {
    let userMarketInfo = _getUserMarketInfo(account, marketAddress);
    // new entity was created
    // interpolate cumulative time x marketTokensBalance starting from the beginning of the period
    let timeInSeconds = BigInt.fromI32(timestamp - entity.timestamp)
    entity.cumulativeTimeByMarketTokensBalance = entity.cumulativeTimeByMarketTokensBalance.plus(
      userMarketInfo.marketTokensBalance.times(timeInSeconds)
    )
    entity.lastMarketTokensBalance = userMarketInfo.marketTokensBalance.plus(marketTokenBalanceDelta)
  } else {
    let timeInSeconds = BigInt.fromI32(timestamp - entity.updatedTimestamp);
    entity.cumulativeTimeByMarketTokensBalance = entity.cumulativeTimeByMarketTokensBalance.plus(
      entity.lastMarketTokensBalance.times(timeInSeconds)
    ) 
    entity.lastMarketTokensBalance = entity.lastMarketTokensBalance.plus(marketTokenBalanceDelta);
  }
  
  
  let endTimestamp = entity.timestamp + SECONDS_IN_WEEK;
  let extrapolatedTimeByMarketTokensBalance = entity.lastMarketTokensBalance.times(BigInt.fromI32(endTimestamp - timestamp))
  entity.weightedAverageMarketTokensBalance = entity.cumulativeTimeByMarketTokensBalance
    .plus(extrapolatedTimeByMarketTokensBalance)
    .div(BigInt.fromI32(SECONDS_IN_WEEK))
  entity.updatedTimestamp = timestamp;
  
  entity.save();
}

export function saveMarketIncentivesStat(eventData: EventData, event: EventLog1): void {
  let marketTokensSupply = eventData.getUintItem("marketTokensSupply")!
  let marketAddress = eventData.getAddressItemString("market")!;
  let entity = _getOrCreateMarketIncentivesStat(marketAddress, event.block.timestamp.toI32());
  
  if (entity.updatedTimestamp == 0) {
    // new entity was created
    // interpolate cumulative time * marketTokensBalance starting from the beginning of the period
    
    // MarketInfo is updated in `handleMarketPoolValueUpdated`
    let marketInfo = getMarketInfo(marketAddress)!;
    let timeInSeconds = event.block.timestamp.minus(BigInt.fromI32(entity.timestamp))
    entity.cumulativeTimeByMarketTokensSupply = entity.cumulativeTimeByMarketTokensSupply.plus(
      marketInfo.marketTokensSupply.times(timeInSeconds)
    ) 
  } else {
    let timeInSeconds = event.block.timestamp.minus(BigInt.fromI32(entity.updatedTimestamp))
    entity.cumulativeTimeByMarketTokensSupply = entity.cumulativeTimeByMarketTokensSupply.plus(
      entity.lastMarketTokensSupply.times(timeInSeconds)
    )
  }
  
  entity.lastMarketTokensSupply = marketTokensSupply;
  entity.updatedTimestamp = event.block.timestamp.toI32();
  
  let endTimestamp = entity.timestamp + SECONDS_IN_WEEK;
  let extrapolatedTimeByMarketTokensSupply = entity.lastMarketTokensSupply.times(BigInt.fromI32(endTimestamp).minus(event.block.timestamp))
  entity.weightedAverageMarketTokensSupply = entity.cumulativeTimeByMarketTokensSupply
    .plus(extrapolatedTimeByMarketTokensSupply)
    .div(BigInt.fromI32(SECONDS_IN_WEEK))
  
  entity.save();
}

function _getOrCreateLiquidityProviderIncentivesStat(account: string, marketAddress: string, period: string, timestamp: i32): LiquidityProviderIncentivesStat {
  let startTimestamp = timestampToPeriodStart(timestamp, period);
  let id = account + ":" + marketAddress + ":" + startTimestamp.toString();
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
  
  return entity!;
}

function _getOrCreateMarketIncentivesStat(marketAddress: string, timestamp: i32): MarketIncentivesStat {
  let period = "1w";
  let startTimestamp = timestampToPeriodStart(timestamp, period);
  let id = marketAddress + ":" + startTimestamp.toString();
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

