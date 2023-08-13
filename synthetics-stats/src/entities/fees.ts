import { BigInt, log } from "@graphprotocol/graph-ts";
import {
  CollectedMarketFeesInfo,
  PositionFeesInfo,
  SwapFeesInfo,
  Transaction,
} from "../../generated/schema";
import { timestampToPeriodStart } from "../utils/time";
import { EventData } from "../utils/eventData";
import { getMarketPoolValueInfo } from "./markets";

class MarketAPRParams {
  constructor(
    public marketAddress: string,
    public marketTokensSupply: BigInt,
    public feeUsdPerMarketToken: BigInt,
    public poolValue: BigInt,
    public feeUsdPerPoolUsd: BigInt
  ) {}
}

export function getMarketAPRParams(
  marketAddress: string,
  feeUsdForPool: BigInt
): MarketAPRParams {
  // totalMarketPoolValueInfo is null for the first MarketPoolValueInfo event since it's emitter after the first SwapFeesCollected event
  let totalMarketPoolValueInfo = getMarketPoolValueInfo(marketAddress);

  let marketTokensSupply = totalMarketPoolValueInfo
    ? totalMarketPoolValueInfo.marketTokensSupply
    : BigInt.fromI32(0);
  let feeUsdPerMarketToken = marketTokensSupply.isZero()
    ? BigInt.fromI32(0)
    : feeUsdForPool.times(BigInt.fromI32(10).pow(18)).div(marketTokensSupply);
  let poolValue = totalMarketPoolValueInfo
    ? totalMarketPoolValueInfo.poolValue
    : BigInt.fromI32(0);
  let feeUsdPerPoolUsd = poolValue.isZero()
    ? BigInt.fromI32(0)
    : feeUsdForPool.times(BigInt.fromI32(10).pow(30)).div(poolValue);

  let marketAprParams = new MarketAPRParams(
    marketAddress,
    marketTokensSupply,
    feeUsdPerMarketToken,
    poolValue,
    feeUsdPerPoolUsd
  );

  return marketAprParams;
}

export function updateCollectedMarketFeesAprParamsForAllPeriods(
  marketAddress: string,
  tokenAddress: string,
  marketAprParams: MarketAPRParams,
  timestamp: i32,
): void {
  updateCollectedMarketFeesAprParams(
    marketAddress,
    tokenAddress,
    marketAprParams,
    "total",
    timestamp,
  );
  updateCollectedMarketFeesAprParams(
    marketAddress,
    tokenAddress,
    marketAprParams,
    "1d",
    timestamp,
  );
  updateCollectedMarketFeesAprParams(
    marketAddress,
    tokenAddress,
    marketAprParams,
    "1h",
    timestamp,
  );
}

export function updateCollectedMarketFeesAprParams(
  marketAddress: string,
  tokenAddress: string,
  marketAprParams: MarketAPRParams,
  period: string,
  timestamp: i32,
): void {
  let entity = getCollectedMarketFees(
    marketAddress,
    tokenAddress,
    timestamp,
    period
  );
  
  if (entity == null) {
    log.warning(
      "updateCollectedMarketFeesAprParams: CollectedMarketFeesInfo entity is null for marketAddress: {}, tokenAddress: {}, period: {}, timestamp: {}",
      [
        marketAddress,
        tokenAddress,
        period,
        timestamp.toString(),
      ]
    );
    return;
  }

  entity.marketTokensSupply = marketAprParams.marketTokensSupply;
  entity.poolValue = marketAprParams.poolValue;
  entity.feeUsdPerMarketToken = entity.feeUsdPerMarketToken.plus(
    marketAprParams.feeUsdPerMarketToken
  );
  entity.feeUsdPerPoolUsd = entity.feeUsdPerPoolUsd.plus(
    marketAprParams.feeUsdPerPoolUsd
  );
  entity.save();
}


export function saveCollectedMarketFeesTotal(
  marketAddress: string,
  tokenAddress: string,
  feeAmountForPool: BigInt,
  feeUsdForPool: BigInt,
  timestamp: i32,
  shouldSetLastFeeUsdForPool: boolean
): CollectedMarketFeesInfo {
  let totalFees = getOrCreateCollectedMarketFees(
    marketAddress,
    tokenAddress,
    timestamp,
    "total"
  );

  totalFees.cummulativeFeeAmountForPool = totalFees.cummulativeFeeAmountForPool.plus(
    feeAmountForPool
  );
  totalFees.cummulativeFeeUsdForPool = totalFees.cummulativeFeeUsdForPool.plus(
    feeUsdForPool
  );
  totalFees.feeAmountForPool = totalFees.feeAmountForPool.plus(
    feeAmountForPool
  );
  totalFees.feeUsdForPool = totalFees.feeUsdForPool.plus(feeUsdForPool);
  if (shouldSetLastFeeUsdForPool) {
    totalFees._lastFeeUsdForPool = feeUsdForPool;
  }
  totalFees.save();

  return totalFees;
}

export function saveCollectedMarketFeesForPeriod(
  marketAddress: string,
  tokenAddress: string,
  feeAmountForPool: BigInt,
  feeUsdForPool: BigInt,
  totalFees: CollectedMarketFeesInfo,
  period: string,
  timestamp: i32
): CollectedMarketFeesInfo {
  let feesForPeriod = getOrCreateCollectedMarketFees(
    marketAddress,
    tokenAddress,
    timestamp,
    period
  );

  feesForPeriod.cummulativeFeeAmountForPool =
    totalFees.cummulativeFeeAmountForPool;
  feesForPeriod.cummulativeFeeUsdForPool = totalFees.cummulativeFeeUsdForPool;

  feesForPeriod.feeAmountForPool = feesForPeriod.feeAmountForPool.plus(
    feeAmountForPool
  );
  feesForPeriod.feeUsdForPool = feesForPeriod.feeUsdForPool.plus(feeUsdForPool);
  feesForPeriod.save();

  return feesForPeriod;
}

export function saveSwapFeesInfo(
  eventData: EventData,
  eventId: string,
  transaction: Transaction
): SwapFeesInfo {
  let swapFeesInfo = new SwapFeesInfo(eventId);

  swapFeesInfo.marketAddress = eventData.getAddressItemString("market")!;
  swapFeesInfo.tokenAddress = eventData.getAddressItemString("token")!;
  swapFeesInfo.action = eventData.getStringItem("action")!;
  swapFeesInfo.tokenPrice = eventData.getUintItem("tokenPrice")!;
  swapFeesInfo.feeAmountForPool = eventData.getUintItem("feeAmountForPool")!;
  swapFeesInfo.feeReceiverAmount = eventData.getUintItem("feeReceiverAmount")!;
  swapFeesInfo.feeUsdForPool = swapFeesInfo.feeAmountForPool.times(
    swapFeesInfo.tokenPrice
  );

  swapFeesInfo.transaction = transaction.id;

  swapFeesInfo.save();

  return swapFeesInfo;
}

export function savePositionFeesInfo(
  eventData: EventData,
  eventName: string,
  transaction: Transaction
): PositionFeesInfo {
  let orderKey = eventData.getBytes32Item("orderKey")!.toHexString();

  let id = orderKey + ":" + eventName;

  let feesInfo = new PositionFeesInfo(id);

  feesInfo.orderKey = orderKey;
  feesInfo.eventName = eventName;
  feesInfo.marketAddress = eventData.getAddressItemString("market")!;
  feesInfo.collateralTokenAddress = eventData.getAddressItemString(
    "collateralToken"
  )!;

  feesInfo.trader = eventData.getAddressItemString("trader")!;
  feesInfo.affiliate = eventData.getAddressItemString("affiliate")!;

  feesInfo.collateralTokenPriceMin = eventData.getUintItem(
    "collateralTokenPrice.min"
  )!;
  feesInfo.collateralTokenPriceMax = eventData.getUintItem(
    "collateralTokenPrice.max"
  )!;

  feesInfo.positionFeeAmount = eventData.getUintItem("positionFeeAmount")!;
  feesInfo.borrowingFeeAmount = eventData.getUintItem("borrowingFeeAmount")!;
  feesInfo.fundingFeeAmount = eventData.getUintItem("fundingFeeAmount")!;
  feesInfo.feeAmountForPool = eventData.getUintItem("feeAmountForPool")!;
  feesInfo.feeUsdForPool = feesInfo.feeAmountForPool.times(
    feesInfo.collateralTokenPriceMin
  );

  feesInfo.totalRebateAmount = eventData.getUintItem("totalRebateAmount")!;
  feesInfo.totalRebateFactor = eventData.getUintItem("totalRebateFactor")!;
  feesInfo.traderDiscountAmount = eventData.getUintItem(
    "traderDiscountAmount"
  )!;
  feesInfo.affiliateRewardAmount = eventData.getUintItem(
    "affiliateRewardAmount"
  )!;

  feesInfo.transaction = transaction.id;

  feesInfo.save();

  return feesInfo;
}

export function getCollectedMarketFees(
  marketAddress: string,
  tokenAddress: string,
  timestamp: i32,
  period: string
): CollectedMarketFeesInfo | null {
  let timestampGroup = timestampToPeriodStart(timestamp, period);
  let id = marketAddress + ":" + tokenAddress + ":" + period;
  if (period != "total") {
    id = id + ":" + timestampGroup.toString();
  }
  let collectedFees = CollectedMarketFeesInfo.load(id);
  return collectedFees;
}

function getOrCreateCollectedMarketFees(
  marketAddress: string,
  tokenAddress: string,
  timestamp: i32,
  period: string
): CollectedMarketFeesInfo {
  let timestampGroup = timestampToPeriodStart(timestamp, period);
  let id = marketAddress + ":" + tokenAddress + ":" + period;
  if (period != "total") {
    id = id + ":" + timestampGroup.toString();
  }

  let collectedFees = CollectedMarketFeesInfo.load(id);

  if (collectedFees == null) {
    collectedFees = new CollectedMarketFeesInfo(id);
    collectedFees.marketAddress = marketAddress;
    collectedFees.tokenAddress = tokenAddress;
    collectedFees.period = period;
    collectedFees.timestampGroup = timestampGroup;
    collectedFees.feeAmountForPool = BigInt.fromI32(0);
    collectedFees.feeUsdForPool = BigInt.fromI32(0);
    collectedFees.cummulativeFeeAmountForPool = BigInt.fromI32(0);
    collectedFees.cummulativeFeeUsdForPool = BigInt.fromI32(0);
    collectedFees.marketTokensSupply = BigInt.fromI32(0);
    collectedFees.poolValue = BigInt.fromI32(0);
    collectedFees.feeUsdPerMarketToken = BigInt.fromI32(0);
    collectedFees.feeUsdPerPoolUsd = BigInt.fromI32(0);
  }

  return collectedFees as CollectedMarketFeesInfo;
}
