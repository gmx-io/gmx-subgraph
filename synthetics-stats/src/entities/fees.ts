import { BigInt } from "@graphprotocol/graph-ts";
import {
  CollectedMarketFeesInfo,
  PositionFeesInfo,
  SwapFeesInfo,
  Transaction,
} from "../../generated/schema";
import { EventData } from "../utils/eventData";
import { timestampToPeriodStart } from "../utils/time";

export function saveCollectedMarketSwapFeesTotal(
  swapFeesInfo: SwapFeesInfo,
  timestamp: i32
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
  totalFees.feeReceiverAmount = totalFees.feeReceiverAmount.plus(swapFeesInfo.feeReceiverAmount);
  totalFees.feeReceiverUsd = totalFees.feeReceiverUsd.plus(swapFeesInfo.feeReceiverUsd);
  totalFees.uiFeeAmount = totalFees.uiFeeAmount.plus(swapFeesInfo.uiFeeAmount);
  totalFees.uiFeeUsd = totalFees.uiFeeUsd.plus(swapFeesInfo.uiFeeUsd);


  totalFees.save();

  return totalFees;
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

  feesForPeriod.cummulativeFeeAmountForPool = totalFees.cummulativeFeeAmountForPool;
  feesForPeriod.cummulativeFeeUsdForPool = totalFees.cummulativeFeeUsdForPool;

  feesForPeriod.feeAmountForPool = feesForPeriod.feeAmountForPool.plus(
    swapFeesInfo.feeAmountForPool
  );
  feesForPeriod.feeUsdForPool = feesForPeriod.feeUsdForPool.plus(swapFeesInfo.feeUsdForPool);
  feesForPeriod.feeReceiverAmount = feesForPeriod.feeReceiverAmount.plus(swapFeesInfo.feeReceiverAmount);
  feesForPeriod.feeReceiverUsd = feesForPeriod.feeReceiverUsd.plus(swapFeesInfo.feeReceiverUsd);
  feesForPeriod.uiFeeAmount = feesForPeriod.uiFeeAmount.plus(swapFeesInfo.uiFeeAmount);
  feesForPeriod.uiFeeUsd = feesForPeriod.uiFeeUsd.plus(swapFeesInfo.uiFeeUsd);

  feesForPeriod.save();

  return feesForPeriod;
}

export function saveCollectedMarketPositionFeesTotal(
  positionFeesInfo: PositionFeesInfo,
  timestamp: i32
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
  totalFees.feeReceiverAmount = totalFees.feeReceiverAmount.plus(positionFeesInfo.feeReceiverAmount);
  totalFees.feeReceiverUsd = totalFees.feeReceiverUsd.plus(positionFeesInfo.feeReceiverUsd);
  totalFees.uiFeeAmount = totalFees.uiFeeAmount.plus(positionFeesInfo.uiFeeAmount);
  totalFees.uiFeeUsd = totalFees.uiFeeUsd.plus(positionFeesInfo.uiFeeUsd);
  totalFees.totalRebateAmount = totalFees.totalRebateAmount.plus(positionFeesInfo.totalRebateAmount);
  totalFees.totalRebateUsd = totalFees.totalRebateUsd.plus(positionFeesInfo.totalRebateUsd);

  totalFees.save();

  return totalFees;
}

export function saveCollectedMarketPositionFeesForPeriod(
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

  feesForPeriod.cummulativeFeeAmountForPool = totalFees.cummulativeFeeAmountForPool;
  feesForPeriod.cummulativeFeeUsdForPool = totalFees.cummulativeFeeUsdForPool;

  feesForPeriod.feeAmountForPool = feesForPeriod.feeAmountForPool.plus(positionFeesInfo.feeAmountForPool);
  feesForPeriod.feeUsdForPool = feesForPeriod.feeUsdForPool.plus(positionFeesInfo.feeUsdForPool);
  feesForPeriod.feeReceiverAmount = feesForPeriod.feeReceiverAmount.plus(positionFeesInfo.feeReceiverAmount);
  feesForPeriod.feeReceiverUsd = feesForPeriod.feeReceiverUsd.plus(positionFeesInfo.feeReceiverUsd);
  feesForPeriod.uiFeeAmount = feesForPeriod.uiFeeAmount.plus(positionFeesInfo.uiFeeAmount);
  feesForPeriod.uiFeeUsd = feesForPeriod.uiFeeUsd.plus(positionFeesInfo.uiFeeUsd);
  feesForPeriod.totalRebateAmount = feesForPeriod.totalRebateAmount.plus(positionFeesInfo.totalRebateAmount);
  feesForPeriod.totalRebateUsd = feesForPeriod.totalRebateUsd.plus(positionFeesInfo.totalRebateUsd);

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
  swapFeesInfo.feeReceiverUsd = swapFeesInfo.feeReceiverAmount.times(
    swapFeesInfo.tokenPrice
  );
  swapFeesInfo.uiFeeUsd = swapFeesInfo.uiFeeAmount.times(swapFeesInfo.tokenPrice);

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
  feesInfo.feeReceiverAmount = eventData.getUintItem("feeReceiverAmountyarn")!;
  feesInfo.uiFeeAmount = eventData.getUintItem("uiFeeAmount")!;
  feesInfo.totalRebateAmount = eventData.getUintItem("totalRebateAmount")!;
  feesInfo.totalRebateFactor = eventData.getUintItem("totalRebateFactor")!;
  feesInfo.traderDiscountAmount = eventData.getUintItem(
    "traderDiscountAmount"
  )!;
  feesInfo.affiliateRewardAmount = eventData.getUintItem(
    "affiliateRewardAmount"
  )!;

  feesInfo.feeUsdForPool = feesInfo.feeAmountForPool.times(
    feesInfo.collateralTokenPriceMin
  );
  feesInfo.feeReceiverUsd = feesInfo.feeReceiverAmount.times(
    feesInfo.collateralTokenPriceMin
  );
  feesInfo.uiFeeUsd = feesInfo.uiFeeAmount.times(
    feesInfo.collateralTokenPriceMin
  );
  feesInfo.totalRebateUsd = feesInfo.totalRebateAmount.times(
    feesInfo.collateralTokenPriceMin
  );

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
    collectedFees.feeReceiverAmount = BigInt.fromI32(0);
    collectedFees.uiFeeAmount = BigInt.fromI32(0);
    collectedFees.totalRebateAmount = BigInt.fromI32(0);

    collectedFees.feeUsdForPool = BigInt.fromI32(0);
    collectedFees.feeReceiverUsd = BigInt.fromI32(0);
    collectedFees.uiFeeUsd = BigInt.fromI32(0);
    collectedFees.totalRebateUsd = BigInt.fromI32(0);

    collectedFees.cummulativeFeeAmountForPool = BigInt.fromI32(0);
    collectedFees.cummulativeFeeUsdForPool = BigInt.fromI32(0);
  }

  return collectedFees as CollectedMarketFeesInfo;
}
