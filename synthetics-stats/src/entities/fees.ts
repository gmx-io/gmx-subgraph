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


export function saveCollectedMarketPositionsFeesTotal(
  positionFeesInfo: PositionFeesInfo,
  timestamp: i32,
  shouldSetLastFeeUsdForPool: boolean
): CollectedMarketFeesInfo {
  let totalFees = getOrCreateCollectedMarketFees(
    positionFeesInfo.marketAddress,
    positionFeesInfo.collateralTokenAddress,
    timestamp,
    "total"
  );

  totalFees.cummulativeFeeAmountForPool = totalFees.cummulativeFeeAmountForPool.plus(
    positionFeesInfo.feeAmountForPool
  );
  totalFees.cummulativeFeeUsdForPool = totalFees.cummulativeFeeUsdForPool.plus(
    positionFeesInfo.feeUsdForPool
  );
  totalFees.feeAmountForPool = totalFees.feeAmountForPool.plus(
    positionFeesInfo.feeAmountForPool
  );
  totalFees.feeUsdForPool = totalFees.feeUsdForPool.plus(positionFeesInfo.feeUsdForPool);

  totalFees.borrowingFeeAmountUsd = totalFees.borrowingFeeAmountUsd.plus(
    positionFeesInfo.borrowingFeeAmountUsd
  );

  totalFees.fundingFeeAmountUsd = totalFees.fundingFeeAmountUsd.plus(
    positionFeesInfo.fundingFeeAmountUsd
  );

  totalFees.uiFeeAmountUsd = totalFees.uiFeeAmountUsd.plus(
    positionFeesInfo.uiFeeAmountUsd
  );

  totalFees.feeUsdReceiverAmount = totalFees.feeUsdReceiverAmount.plus(
    positionFeesInfo.feeUsdReceiverAmount
  );

  if (shouldSetLastFeeUsdForPool) {
    totalFees._lastFeeUsdForPool = positionFeesInfo.feeUsdForPool;
  }
  totalFees.save();

  return totalFees;
}

export function saveCollectedMarketSwapFeesTotal(
  swapFeesInfo: SwapFeesInfo,
  timestamp: i32,
  shouldSetLastFeeUsdForPool: boolean
): CollectedMarketFeesInfo {
  let totalFees = getOrCreateCollectedMarketFees(
    swapFeesInfo.marketAddress,
    swapFeesInfo.tokenAddress,
    timestamp,
    "total"
  );

  totalFees.cummulativeFeeAmountForPool = totalFees.cummulativeFeeAmountForPool.plus(
    swapFeesInfo.feeAmountForPool
  );
  totalFees.cummulativeFeeUsdForPool = totalFees.cummulativeFeeUsdForPool.plus(
    swapFeesInfo.feeUsdForPool
  );
  totalFees.feeAmountForPool = totalFees.feeAmountForPool.plus(
    swapFeesInfo.feeAmountForPool
  );
  totalFees.feeUsdForPool = totalFees.feeUsdForPool.plus(swapFeesInfo.feeUsdForPool);

  totalFees.uiFeeAmountUsd = totalFees.uiFeeAmountUsd.plus(
    swapFeesInfo.uiFeeAmountUsd
  );

  totalFees.feeUsdReceiverAmount = totalFees.feeUsdReceiverAmount.plus(
    swapFeesInfo.feeUsdReceiverAmount
  );

  if (shouldSetLastFeeUsdForPool) {
    totalFees._lastFeeUsdForPool = swapFeesInfo.feeUsdForPool;
  }
  totalFees.save();

  return totalFees;
}

export function saveCollectedMarketPositionsFeesForPeriod(
  positionFeesInfo: PositionFeesInfo,
  totalFees: CollectedMarketFeesInfo,
  period: string,
  timestamp: i32
): CollectedMarketFeesInfo {
  let feesForPeriod = getOrCreateCollectedMarketFees(
    positionFeesInfo.marketAddress,
    positionFeesInfo.collateralTokenAddress,
    timestamp,
    period
  );

  feesForPeriod.cummulativeFeeAmountForPool =
    totalFees.cummulativeFeeAmountForPool;
  feesForPeriod.cummulativeFeeUsdForPool = totalFees.cummulativeFeeUsdForPool;

  feesForPeriod.feeAmountForPool = feesForPeriod.feeAmountForPool.plus(
    positionFeesInfo.feeAmountForPool
  );
  feesForPeriod.feeUsdReceiverAmount = feesForPeriod.feeUsdReceiverAmount.plus(positionFeesInfo.feeUsdReceiverAmount);
  feesForPeriod.feeUsdForPool = feesForPeriod.feeUsdForPool.plus(positionFeesInfo.feeUsdForPool);
  feesForPeriod.uiFeeAmountUsd = feesForPeriod.uiFeeAmountUsd.plus(positionFeesInfo.uiFeeAmountUsd);
  feesForPeriod.fundingFeeAmountUsd = feesForPeriod.fundingFeeAmountUsd.plus(positionFeesInfo.fundingFeeAmountUsd);
  feesForPeriod.borrowingFeeAmountUsd = feesForPeriod.borrowingFeeAmountUsd.plus(positionFeesInfo.borrowingFeeAmountUsd);
  feesForPeriod.save();

  return feesForPeriod;
}

export function saveCollectedMarketSwapFeesForPeriod(
  swapFeesInfo: SwapFeesInfo,
  totalFees: CollectedMarketFeesInfo,
  period: string,
  timestamp: i32
): CollectedMarketFeesInfo {
  let feesForPeriod = getOrCreateCollectedMarketFees(
    swapFeesInfo.marketAddress,
    swapFeesInfo.tokenAddress,
    timestamp,
    period
  );

  feesForPeriod.cummulativeFeeAmountForPool =
    totalFees.cummulativeFeeAmountForPool;
  feesForPeriod.cummulativeFeeUsdForPool = totalFees.cummulativeFeeUsdForPool;

  feesForPeriod.feeAmountForPool = feesForPeriod.feeAmountForPool.plus(
    swapFeesInfo.feeAmountForPool
  );
  feesForPeriod.feeUsdReceiverAmount = feesForPeriod.feeUsdReceiverAmount.plus(swapFeesInfo.feeUsdReceiverAmount);
  feesForPeriod.feeUsdForPool = feesForPeriod.feeUsdForPool.plus(swapFeesInfo.feeUsdForPool);
  feesForPeriod.uiFeeAmountUsd = feesForPeriod.uiFeeAmountUsd.plus(swapFeesInfo.uiFeeAmountUsd);
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
  swapFeesInfo.uiFeeAmount = eventData.getUintItem("uiFeeAmount")!;
  swapFeesInfo.feeUsdForPool = swapFeesInfo.feeAmountForPool.times(
    swapFeesInfo.tokenPrice
  );
  swapFeesInfo.feeUsdForPool = swapFeesInfo.feeAmountForPool.times(
    swapFeesInfo.tokenPrice
  );
  swapFeesInfo.feeUsdReceiverAmount = swapFeesInfo.feeReceiverAmount.times(
    swapFeesInfo.tokenPrice
  );
  swapFeesInfo.uiFeeAmountUsd = swapFeesInfo.uiFeeAmount.times(
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
  feesInfo.feeReceiverAmount = eventData.getUintItem("feeReceiverAmount")!;
  feesInfo.uiFeeAmount = eventData.getUintItem("uiFeeAmount")!;
  feesInfo.totalCostAmountExcludingFunding = eventData.getUintItem("totalCostAmountExcludingFunding")!;
  feesInfo.totalCostAmount = eventData.getUintItem("totalCostAmount")!;

  feesInfo.feeUsdForPool = feesInfo.feeAmountForPool.times(
    feesInfo.collateralTokenPriceMin
  );
  feesInfo.feeUsdReceiverAmount = feesInfo.feeReceiverAmount.times(
    feesInfo.collateralTokenPriceMin
  );
  feesInfo.uiFeeAmountUsd = feesInfo.uiFeeAmount.times(
    feesInfo.collateralTokenPriceMin
  );

  feesInfo.fundingFeeAmountUsd = feesInfo.fundingFeeAmount.times(
    feesInfo.collateralTokenPriceMin
  );

  feesInfo.borrowingFeeAmountUsd = feesInfo.borrowingFeeAmount.times(
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
    collectedFees.feeReceiverAmount = BigInt.fromI32(0);
    collectedFees.uiFeeAmount = BigInt.fromI32(0);
    collectedFees.feeUsdReceiverAmount = BigInt.fromI32(0);
    collectedFees.uiFeeAmountUsd = BigInt.fromI32(0);
    collectedFees.feeUsdForPool = BigInt.fromI32(0);
    collectedFees.cummulativeFeeAmountForPool = BigInt.fromI32(0);
    collectedFees.cummulativeFeeUsdForPool = BigInt.fromI32(0);
    collectedFees.marketTokensSupply = BigInt.fromI32(0);
    collectedFees.poolValue = BigInt.fromI32(0);
    collectedFees.feeUsdPerMarketToken = BigInt.fromI32(0);
    collectedFees.feeUsdPerPoolUsd = BigInt.fromI32(0);
    collectedFees.borrowingFeeAmountUsd = BigInt.fromI32(0);
    collectedFees.fundingFeeAmountUsd = BigInt.fromI32(0);
  }

  return collectedFees as CollectedMarketFeesInfo;
}
