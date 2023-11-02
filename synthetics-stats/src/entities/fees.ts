import { BigInt, log } from "@graphprotocol/graph-ts";
import {
  CollectedMarketFeesInfo,
  PoolValueRef,
  PositionFeesInfo,
  PositionFeesInfoWithPeriod,
  SwapFeesInfo,
  SwapFeesInfoWithPeriod,
  Transaction,
} from "../../generated/schema";
import { EventData } from "../utils/eventData";
import { timestampToPeriodStart } from "../utils/time";
import { getMarketPoolValueFromContract } from "../contracts/getMarketPoolValueFromContract";

export let swapFeeTypes = new Map<string, string>();

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

function saveCollectedMarketFeesTotal(
  marketAddress: string,
  tokenAddress: string,
  feeAmountForPool: BigInt,
  feeUsdForPool: BigInt,
  timestamp: i32
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
  totalFees.save();

  return totalFees;
}

function saveCollectedMarketFeesForPeriod(
  actionName: string,
  poolValue: BigInt,
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

  let poolValueRef = getOrCreatePoolValueRef(marketAddress);
  let shouldCalulateAprNow = getShouldCalculateAprForFeeEvent(actionName);

  feesForPeriod.cummulativeFeeAmountForPool =
    totalFees.cummulativeFeeAmountForPool;
  feesForPeriod.cummulativeFeeUsdForPool = totalFees.cummulativeFeeUsdForPool;

  feesForPeriod.feeAmountForPool = feesForPeriod.feeAmountForPool.plus(
    feeAmountForPool
  );
  feesForPeriod.feeUsdForPool = feesForPeriod.feeUsdForPool.plus(feeUsdForPool);

  if (shouldCalulateAprNow) {
    feesForPeriod.feeUsdPerPoolValue = feesForPeriod.feeUsdPerPoolValue.plus(
      calcFeeUsdPerPoolValue(feeUsdForPool, poolValue)
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

  dailyFees.totalFeeAmountForPool = dailyFees.totalFeeAmountForPool.plus(
    feeAmountForPool
  );
  dailyFees.totalFeeUsdForPool = dailyFees.totalFeeUsdForPool.plus(
    feeUsdForPool
  );
  dailyFees.totalFeeReceiverAmount = dailyFees.totalFeeReceiverAmount.plus(
    feeReceiverAmount
  );
  dailyFees.totalFeeReceiverUsd = dailyFees.totalFeeReceiverUsd.plus(
    feeReceiverUsd
  );

  totalFees.totalFeeAmountForPool = totalFees.totalFeeAmountForPool.plus(
    feeAmountForPool
  );
  totalFees.totalFeeUsdForPool = totalFees.totalFeeUsdForPool.plus(
    feeUsdForPool
  );
  totalFees.totalFeeReceiverAmount = totalFees.totalFeeReceiverAmount.plus(
    feeReceiverAmount
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
    feeInfo.totalFeeAmountForPool = BigInt.fromI32(0);
    feeInfo.totalFeeUsdForPool = BigInt.fromI32(0);
    feeInfo.totalFeeReceiverAmount = BigInt.fromI32(0);
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

function getShouldCalculateAprForFeeEvent(actionName: string): boolean {
  let isSwapOrDeposit = actionName == "swap" || actionName == "deposit";
  return !isSwapOrDeposit;
}

export function saveCollectedMarketFees(
  swapFeesInfo: SwapFeesInfo | null,
  positionFeesInfo: PositionFeesInfo | null,
  transaction: Transaction,
  action: string
): void {
  let marketAddress = swapFeesInfo
    ? swapFeesInfo.marketAddress
    : positionFeesInfo!.marketAddress;
  let tokenAddress = swapFeesInfo
    ? swapFeesInfo.tokenAddress
    : positionFeesInfo!.collateralTokenAddress;
  let feeAmountForPool = swapFeesInfo
    ? swapFeesInfo.feeAmountForPool
    : positionFeesInfo!.feeAmountForPool;
  let feeUsdForPool = swapFeesInfo
    ? swapFeesInfo.feeUsdForPool
    : positionFeesInfo!.feeUsdForPool;

  let poolValueRef = getOrCreatePoolValueRef(
    swapFeesInfo ? swapFeesInfo.marketAddress : positionFeesInfo!.marketAddress
  );

  let totalFees = saveCollectedMarketFeesTotal(
    marketAddress,
    tokenAddress,
    feeAmountForPool,
    feeUsdForPool,
    transaction.timestamp
  );
  saveCollectedMarketFeesForPeriod(
    action,
    poolValueRef.value,
    marketAddress,
    tokenAddress,
    feeAmountForPool,
    feeUsdForPool,
    totalFees,
    "1h",
    transaction.timestamp
  );
  saveCollectedMarketFeesForPeriod(
    action,
    poolValueRef.value,
    marketAddress,
    tokenAddress,
    feeAmountForPool,
    feeUsdForPool,
    totalFees,
    "1d",
    transaction.timestamp
  );
}

export function handleMarketPoolValueUpdated(
  eventData: EventData,
  transaction: Transaction
): void {
  let marketAddress = eventData.getAddressItemString("market")!;
  let poolValue = eventData.getIntItem("poolValue")!;
  log.warning("handling MarketPoolValueUpdated, market={} poolValue={}", [
    marketAddress,
    poolValue.toString(),
  ]);
  let poolValueFromContract = getMarketPoolValueFromContract(
    marketAddress,
    "arbitrum",
    transaction
  );
  log.warning("poolValueFromContract={} vs poolValue={}", [
    poolValueFromContract.toString(),
    poolValue.toString(),
  ]);
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

function getOrCreatePoolValueRef(marketAddress: string): PoolValueRef {
  let id = marketAddress;
  let ref = PoolValueRef.load(id);

  if (!ref) {
    ref = new PoolValueRef(id);
    ref.value = BigInt.fromI32(0);
    ref.pendingFeeUsds = new Array<BigInt>(0);
    ref.pendingCollectedMarketFeesInfoIds = new Array<string>(0);
  }

  return ref!;
}
