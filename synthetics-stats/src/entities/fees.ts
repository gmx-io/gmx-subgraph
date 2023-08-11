import { BigInt } from "@graphprotocol/graph-ts";
import {
  CollectedMarketFeesInfo,
  MarketPoolValueInfo,
  PositionFeesInfo,
  SwapFeesInfo,
  Transaction,
} from "../../generated/schema";
import { timestampToPeriodStart } from "../utils/time";
import { EventData } from "../utils/eventData";

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
  let totalMarketPoolValueInfo = MarketPoolValueInfo.load(
    marketAddress + ":total"
  );

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

export function saveCollectedMarketFeesTotal(
  marketAddress: string,
  tokenAddress: string,
  feeAmountForPool: BigInt,
  feeUsdForPool: BigInt,
  marketAprParams: MarketAPRParams,
  timestamp: i32
): CollectedMarketFeesInfo {
  let totalFees = getOrCreateCollectedMarketFees(
    marketAddress,
    tokenAddress,
    timestamp,
    "total"
  );

  totalFees.marketTokensSupply = marketAprParams.marketTokensSupply;
  totalFees.poolValue = marketAprParams.poolValue;
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
  totalFees.feeUsdPerMarketToken = totalFees.feeUsdPerMarketToken.plus(
    marketAprParams.feeUsdPerMarketToken
  );
  totalFees.feeUsdPerPoolUsd = totalFees.feeUsdPerPoolUsd.plus(
    marketAprParams.feeUsdPerPoolUsd
  );
  totalFees.save();

  return totalFees;
}

export function saveCollectedMarketFeesForPeriod(
  marketAddress: string,
  tokenAddress: string,
  feeAmountForPool: BigInt,
  feeUsdForPool: BigInt,
  totalFees: CollectedMarketFeesInfo,
  marketAprParams: MarketAPRParams,
  period: string,
  timestamp: i32
): CollectedMarketFeesInfo {
  let feesForPeriod = getOrCreateCollectedMarketFees(
    marketAddress,
    tokenAddress,
    timestamp,
    period
  );

  feesForPeriod.marketTokensSupply = marketAprParams.marketTokensSupply;
  feesForPeriod.poolValue = marketAprParams.poolValue;

  feesForPeriod.cummulativeFeeAmountForPool =
    totalFees.cummulativeFeeAmountForPool;
  feesForPeriod.cummulativeFeeUsdForPool = totalFees.cummulativeFeeUsdForPool;

  feesForPeriod.feeAmountForPool = feesForPeriod.feeAmountForPool.plus(
    feeAmountForPool
  );
  feesForPeriod.feeUsdForPool = feesForPeriod.feeUsdForPool.plus(feeUsdForPool);
  feesForPeriod.feeUsdPerMarketToken = feesForPeriod.feeUsdPerMarketToken.plus(
    marketAprParams.feeUsdPerMarketToken
  );
  feesForPeriod.feeUsdPerPoolUsd = feesForPeriod.feeUsdPerPoolUsd.plus(
    marketAprParams.feeUsdPerPoolUsd
  );
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
