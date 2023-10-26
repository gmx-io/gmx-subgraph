import { BigInt, log } from "@graphprotocol/graph-ts";
import {
  CollectedMarketFeesInfo,
  MarketInfo,
  PoolValue,
  PositionFeesInfo,
  PositionFeesInfoWithPeriod,
  SwapFeesInfo,
  SwapFeesInfoWithPeriod,
  Transaction,
} from "../../generated/schema";
import { EventData } from "../utils/eventData";
import { timestampToPeriodStart } from "../utils/time";
import { PositionImpactPoolDistributedEventData } from "../utils/eventData/PositionImpactPoolDistributedEventData";
import { getTokenPrice } from "./prices";

export let swapFeeTypes = new Map<string, string>();

let ZERO = BigInt.fromI32(0);

swapFeeTypes.set(
  "SWAP_FEE_TYPE",
  "0x7ad0b6f464d338ea140ff9ef891b4a69cf89f107060a105c31bb985d9e532214"
);
swapFeeTypes.set(
  "DEPOSIT_FEE_TYPE",
  "0x39226eb4fed85317aa310fa53f734c7af59274c49325ab568f9c4592250e8cc5"
);
swapFeeTypes.set(
  "WITHDRAWAL_FEE_TYPE",
  "0xda1ac8fcb4f900f8ab7c364d553e5b6b8bdc58f74160df840be80995056f3838"
);

export function getSwapActionByFeeType(swapFeeType: string): string {
  if (swapFeeType == swapFeeTypes.get("SWAP_FEE_TYPE")) {
    return "swap";
  }

  if (swapFeeType == swapFeeTypes.get("DEPOSIT_FEE_TYPE")) {
    return "deposit";
  }

  if (swapFeeType == swapFeeTypes.get("WITHDRAWAL_FEE_TYPE")) {
    return "withdrawal";
  }

  log.error("Unknown swap fee type: {}", [swapFeeType]);
  throw new Error("Unknown swap fee type: " + swapFeeType);
}

function saveCollectedMarketFeesTotal(
  marketAddress: string,
  feeUsdForPool: BigInt,
  timestamp: i32
): CollectedMarketFeesInfo {
  let totalFees = getOrCreateCollectedMarketFees(
    marketAddress,
    timestamp,
    "total"
  );
  totalFees.cummulativeFeeUsdForPool = totalFees.cummulativeFeeUsdForPool.plus(
    feeUsdForPool
  );
  totalFees.feeUsdForPool = totalFees.feeUsdForPool.plus(feeUsdForPool);

  // FIXME total

  totalFees.save();

  return totalFees;
}

function saveCollectedMarketFeesForPeriod(
  actionName: string,
  marketAddress: string,
  feeUsdForPool: BigInt,
  totalFees: CollectedMarketFeesInfo,
  period: string,
  timestamp: i32
): CollectedMarketFeesInfo {
  let feesForPeriod = getOrCreateCollectedMarketFees(
    marketAddress,
    timestamp,
    period
  );

  let poolValueRef = getOrCreatePoolValue(marketAddress);
  let shouldCalulateAprNow = getShouldCalculateAprForFeeEventNow(actionName);

  feesForPeriod.cummulativeFeeUsdForPool = totalFees.cummulativeFeeUsdForPool;

  feesForPeriod.feeUsdForPool = feesForPeriod.feeUsdForPool.plus(feeUsdForPool);

  if (shouldCalulateAprNow) {
    feesForPeriod.feeUsdPerPoolValue = feesForPeriod.feeUsdPerPoolValue.plus(
      calcFeeUsdPerPoolValue(feeUsdForPool, poolValueRef.poolValue)
    );
    // if not updating apr immediately, adding it to the queue of corresponding market
  } else {
    let pendingFeeUsds = poolValueRef.pendingFeeUsds;
    pendingFeeUsds.push(feeUsdForPool);
    poolValueRef.pendingFeeUsds = pendingFeeUsds;

    let pendingIds = poolValueRef.pendingCollectedMarketFeesInfoIds;
    pendingIds.push(feesForPeriod.id);
    poolValueRef.pendingCollectedMarketFeesInfoIds = pendingIds;

    poolValueRef.save();
  }

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

  let swapFeeType = eventData.getBytes32Item("swapFeeType");

  if (swapFeeType != null) {
    swapFeesInfo.swapFeeType = swapFeeType.toHexString();
  } else {
    let action = eventData.getStringItem("action");

    if (action == "deposit") {
      swapFeesInfo.swapFeeType = swapFeeTypes.get("DEPOSIT_FEE_TYPE")!;
    } else if (action == "withdrawal") {
      swapFeesInfo.swapFeeType = swapFeeTypes.get("WITHDRAWAL_FEE_TYPE")!;
    } else if (action == "swap") {
      swapFeesInfo.swapFeeType = swapFeeTypes.get("SWAP_FEE_TYPE")!;
    }
  }

  swapFeesInfo.tokenPrice = eventData.getUintItem("tokenPrice")!;
  swapFeesInfo.feeReceiverAmount = eventData.getUintItem("feeReceiverAmount")!;
  swapFeesInfo.feeUsdForPool = eventData
    .getUintItem("feeAmountForPool")!
    .times(swapFeesInfo.tokenPrice);

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
  feesInfo.feeUsdForPool = eventData
    .getUintItem("feeAmountForPool")!
    .times(feesInfo.collateralTokenPriceMin);

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
  timestamp: i32,
  period: string
): CollectedMarketFeesInfo {
  let timestampGroup = timestampToPeriodStart(timestamp, period);

  let id = marketAddress + ":" + period;

  if (period != "total") {
    id = id + ":" + timestampGroup.toString();
  }

  let collectedFees = CollectedMarketFeesInfo.load(id);

  if (collectedFees == null) {
    collectedFees = new CollectedMarketFeesInfo(id);
    collectedFees.marketAddress = marketAddress;
    collectedFees.period = period;
    collectedFees.timestampGroup = timestampGroup;
    collectedFees.feeUsdForPool = BigInt.fromI32(0);
    collectedFees.cummulativeFeeUsdForPool = BigInt.fromI32(0);
    collectedFees.feeUsdPerPoolValue = BigInt.fromI32(0);
    collectedFees.feeUsdPerGmToken = BigInt.fromI32(0);
  }

  return collectedFees as CollectedMarketFeesInfo;
}

export function saveSwapFeesInfoWithPeriod(
  feeAmountForPool: BigInt,
  feeReceiverAmount: BigInt,
  tokenPrice: BigInt,
  timestamp: i32
): void {
  let dailyTimestampGroup = timestampToPeriodStart(timestamp, "1d");
  let totalId = "total";
  let dailyId = dailyTimestampGroup.toString();

  let dailyFees = getOrCreateSwapFeesInfoWithPeriod(dailyId, "1d");
  let totalFees = getOrCreateSwapFeesInfoWithPeriod(totalId, "total");

  let feeUsdForPool = feeAmountForPool.times(tokenPrice);
  let feeReceiverUsd = feeReceiverAmount.times(tokenPrice);

  dailyFees.totalFeeUsdForPool = dailyFees.totalFeeUsdForPool.plus(
    feeUsdForPool
  );
  dailyFees.totalFeeReceiverUsd = dailyFees.totalFeeReceiverUsd.plus(
    feeReceiverUsd
  );
  totalFees.totalFeeUsdForPool = totalFees.totalFeeUsdForPool.plus(
    feeUsdForPool
  );
  totalFees.totalFeeReceiverUsd = totalFees.totalFeeReceiverUsd.plus(
    feeReceiverUsd
  );

  dailyFees.save();
  totalFees.save();
}

export function savePositionFeesInfoWithPeriod(
  positionFeeAmount: BigInt,
  positionFeeAmountForPool: BigInt,
  borrowingFeeUsd: BigInt,
  tokenPrice: BigInt,
  timestamp: i32
): void {
  let dailyTimestampGroup = timestampToPeriodStart(timestamp, "1d");
  let totalId = "total";
  let dailyId = dailyTimestampGroup.toString();

  let dailyFees = getOrCreatePositionFeesInfoWithPeriod(dailyId, "1d");
  let totalFees = getOrCreatePositionFeesInfoWithPeriod(totalId, "total");

  let positionFeeUsd = positionFeeAmount.times(tokenPrice);
  let positionFeeUsdForPool = positionFeeAmountForPool.times(tokenPrice);

  dailyFees.totalBorrowingFeeUsd = dailyFees.totalBorrowingFeeUsd.plus(
    borrowingFeeUsd
  );
  dailyFees.totalPositionFeeAmount = dailyFees.totalPositionFeeAmount.plus(
    positionFeeAmount
  );
  dailyFees.totalPositionFeeUsd = dailyFees.totalPositionFeeUsd.plus(
    positionFeeUsd
  );
  dailyFees.totalPositionFeeAmountForPool = dailyFees.totalPositionFeeAmountForPool.plus(
    positionFeeAmountForPool
  );
  dailyFees.totalPositionFeeUsdForPool = dailyFees.totalPositionFeeUsdForPool.plus(
    positionFeeUsdForPool
  );

  totalFees.totalBorrowingFeeUsd = totalFees.totalBorrowingFeeUsd.plus(
    borrowingFeeUsd
  );
  totalFees.totalPositionFeeAmount = totalFees.totalPositionFeeAmount.plus(
    positionFeeAmount
  );
  totalFees.totalPositionFeeUsd = totalFees.totalPositionFeeUsd.plus(
    positionFeeUsd
  );
  totalFees.totalPositionFeeAmountForPool = totalFees.totalPositionFeeAmountForPool.plus(
    positionFeeAmountForPool
  );
  totalFees.totalPositionFeeUsdForPool = totalFees.totalPositionFeeUsdForPool.plus(
    positionFeeUsdForPool
  );

  dailyFees.save();
  totalFees.save();
}

function getOrCreateSwapFeesInfoWithPeriod(
  id: string,
  period: string
): SwapFeesInfoWithPeriod {
  let feeInfo = SwapFeesInfoWithPeriod.load(id);

  if (feeInfo == null) {
    feeInfo = new SwapFeesInfoWithPeriod(id);
    feeInfo.period = period;
    feeInfo.totalFeeUsdForPool = BigInt.fromI32(0);
    feeInfo.totalFeeReceiverUsd = BigInt.fromI32(0);
  }

  return feeInfo as SwapFeesInfoWithPeriod;
}

function getOrCreatePositionFeesInfoWithPeriod(
  id: string,
  period: string
): PositionFeesInfoWithPeriod {
  let feeInfo = PositionFeesInfoWithPeriod.load(id);

  if (feeInfo == null) {
    feeInfo = new PositionFeesInfoWithPeriod(id);
    feeInfo.period = period;
    feeInfo.totalBorrowingFeeUsd = BigInt.fromI32(0);
    feeInfo.totalPositionFeeAmount = BigInt.fromI32(0);
    feeInfo.totalPositionFeeUsd = BigInt.fromI32(0);
    feeInfo.totalPositionFeeAmountForPool = BigInt.fromI32(0);
    feeInfo.totalPositionFeeUsdForPool = BigInt.fromI32(0);
  }

  return feeInfo as PositionFeesInfoWithPeriod;
}

function getShouldCalculateAprForFeeEventNow(actionName: string): boolean {
  return actionName !== "withdrawal" && actionName !== "deposit";
}

export function saveCollectedMarketFees(
  actionName: string,
  transaction: Transaction,
  marketAddress: string,
  feeUsdForPool: BigInt
): void {
  let totalFees = saveCollectedMarketFeesTotal(
    marketAddress,
    feeUsdForPool,
    transaction.timestamp
  );
  saveCollectedMarketFeesForPeriod(
    actionName,
    marketAddress,
    feeUsdForPool,
    totalFees,
    "1h",
    transaction.timestamp
  );
  saveCollectedMarketFeesForPeriod(
    actionName,
    marketAddress,
    feeUsdForPool,
    totalFees,
    "1d",
    transaction.timestamp
  );
}

export function handleMarketPoolValueUpdated(eventData: EventData): void {
  let marketAddress = eventData.getAddressItemString("market")!;
  let poolValue = eventData.getIntItem("poolValue")!;
  let poolValueRef = getOrCreatePoolValue(marketAddress);
  poolValueRef.poolValue = poolValue;

  if (poolValue.equals(ZERO)) {
    return;
  }

  let pendingIds = poolValueRef.pendingCollectedMarketFeesInfoIds;
  let fees = poolValueRef.pendingFeeUsds;

  for (let i = 0; i < pendingIds.length; i++) {
    let id = pendingIds[i];
    let feeInfo = CollectedMarketFeesInfo.load(id);
    let fee = fees[i];

    if (feeInfo) {
      if (fee) {
        feeInfo.feeUsdPerPoolValue = feeInfo.feeUsdPerPoolValue.plus(
          calcFeeUsdPerPoolValue(fee, poolValue)
        );
        feeInfo.save();
      }
    }
  }

  poolValueRef.pendingCollectedMarketFeesInfoIds = new Array<string>(0);
  poolValueRef.pendingFeeUsds = new Array<BigInt>(0);

  poolValueRef.save();
}

export function handlePositionImpactPoolDistributed(
  eventData: EventData,
  transaction: Transaction
): void {
  let event = new PositionImpactPoolDistributedEventData(eventData);
  let market = MarketInfo.load(event.market);

  if (!market) {
    log.warning("Market not found: {}", [event.market]);
    throw new Error("Market not found");
  }

  let indexToken = market.indexToken;
  let tokenPrice = getTokenPrice(indexToken);
  let amountUsd = event.distributionAmount.times(tokenPrice);
  let poolValueRef = getOrCreatePoolValue(event.market);

  // 1h
  let feesFor1h = getOrCreateCollectedMarketFees(
    event.market,
    transaction.timestamp,
    "1h"
  );

  feesFor1h.feeUsdPerPoolValue = feesFor1h.feeUsdPerPoolValue.plus(
    calcFeeUsdPerPoolValue(amountUsd, poolValueRef.poolValue)
  );
  feesFor1h.feeUsdForPool = feesFor1h.feeUsdForPool.plus(amountUsd);

  feesFor1h.save();

  // 1d
  let feesFor1d = getOrCreateCollectedMarketFees(
    event.market,
    transaction.timestamp,
    "1d"
  );

  feesFor1d.feeUsdPerPoolValue = feesFor1d.feeUsdPerPoolValue.plus(
    calcFeeUsdPerPoolValue(amountUsd, poolValueRef.poolValue)
  );
  feesFor1d.feeUsdForPool = feesFor1d.feeUsdForPool.plus(amountUsd);

  feesFor1d.save();

  // total
  let feesForTotal = getOrCreateCollectedMarketFees(
    event.market,
    transaction.timestamp,
    "total"
  );

  feesForTotal.feeUsdPerPoolValue = feesForTotal.feeUsdPerPoolValue.plus(
    calcFeeUsdPerPoolValue(amountUsd, poolValueRef.poolValue)
  );
  feesForTotal.feeUsdForPool = feesForTotal.feeUsdForPool.plus(amountUsd);

  feesForTotal.save();
}

function calcFeeUsdPerPoolValue(feeUsd: BigInt, poolValueUsd: BigInt): BigInt {
  let multiplier = BigInt.fromI32(10).pow(30);
  let zero = BigInt.fromI32(0);
  if (poolValueUsd.equals(zero)) {
    return zero;
  }

  let res = feeUsd.times(multiplier).div(poolValueUsd);

  return res;
}

function getOrCreatePoolValue(marketAddress: string): PoolValue {
  let id = marketAddress;
  let ref = PoolValue.load(id);

  if (!ref) {
    ref = new PoolValue(id);
    ref.poolValue = BigInt.fromI32(0);
    ref.pendingFeeUsds = new Array<BigInt>(0);
    ref.pendingCollectedMarketFeesInfoIds = new Array<string>(0);
  }

  return ref!;
}
