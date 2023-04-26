import { BigInt } from "@graphprotocol/graph-ts";
import {
  CollectedMarketFeesInfo,
  PositionFeesInfo,
  SwapFeesInfo,
  Transaction,
} from "../../generated/schema";
import { timestampToPeriodStart } from "../utils/time";
import { EventData } from "../utils/eventData";

export function saveCollectedMarketFeesForPeriod(
  marketAddress: string,
  tokenAddress: string,
  feeAmountForPool: BigInt,
  feeUsdForPool: BigInt,
  period: string,
  timestamp: i32
): CollectedMarketFeesInfo {
  let totalFees = getOrCreateCollectedMarketFees(
    marketAddress,
    tokenAddress,
    timestamp,
    "total"
  );

  let feesForPeriod = getOrCreateCollectedMarketFees(
    marketAddress,
    tokenAddress,
    timestamp,
    period
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
  }

  return collectedFees as CollectedMarketFeesInfo;
}
