import { BigInt, log } from "@graphprotocol/graph-ts";
import {
  CollectedMarketFeesInfo,
  MarketInfo,
  PositionFeesInfo,
  PositionFeesInfoWithPeriod,
  SwapFeesInfo,
  SwapFeesInfoWithPeriod,
  Transaction
} from "../../generated/schema";
import { getMarketPoolValueFromContract } from "../contracts/getMarketPoolValueFromContract";
import { SwapFeesCollectedEventData } from "../utils/eventData/SwapFeesCollectedEventData";
import { getMarketTokensSupplyFromContract } from "../contracts/getMarketTokensSupplyFromContract";
import { EventData } from "../utils/eventData";
import { PositionImpactPoolDistributedEventData } from "../utils/eventData/PositionImpactPoolDistributedEventData";
import { timestampToPeriodStart } from "../utils/time";
import { getTokenPrice } from "./prices";

export let swapFeeTypes = new Map<string, string>();

let ZERO = BigInt.fromI32(0);

swapFeeTypes.set("SWAP_FEE_TYPE", "0x7ad0b6f464d338ea140ff9ef891b4a69cf89f107060a105c31bb985d9e532214");
swapFeeTypes.set("DEPOSIT_FEE_TYPE", "0x39226eb4fed85317aa310fa53f734c7af59274c49325ab568f9c4592250e8cc5");
swapFeeTypes.set("WITHDRAWAL_FEE_TYPE", "0xda1ac8fcb4f900f8ab7c364d553e5b6b8bdc58f74160df840be80995056f3838");

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

function updateCollectedFeesFractions(
  poolValue: BigInt,
  feesEntity: CollectedMarketFeesInfo,
  totalFeesEntity: CollectedMarketFeesInfo,
  feeUsdForPool: BigInt,
  marketTokensSupply: BigInt
): void {
  feesEntity.feeUsdPerPoolValue = getUpdatedFeeUsdPerPoolValue(feesEntity, feeUsdForPool, poolValue);
  feesEntity.cumulativeFeeUsdPerPoolValue = totalFeesEntity.feeUsdPerPoolValue;

  feesEntity.feeUsdPerGmToken = getUpdatedFeeUsdPerGmToken(feesEntity, feeUsdForPool, marketTokensSupply);
  feesEntity.prevCumulativeFeeUsdPerGmToken = feesEntity.cumulativeFeeUsdPerGmToken;
  feesEntity.cumulativeFeeUsdPerGmToken = totalFeesEntity.feeUsdPerGmToken;
}

export function saveSwapFeesInfo(data: SwapFeesCollectedEventData, eventData: EventData): SwapFeesInfo {
  let swapFeesInfo = new SwapFeesInfo(eventData.eventId);

  swapFeesInfo.marketAddress = data.market;
  swapFeesInfo.tokenAddress = data.token;

  let swapFeeType = data.swapFeeType;

  if (swapFeeType != null) {
    swapFeesInfo.swapFeeType = swapFeeType.toHexString();
  } else {
    let action = data.action;

    if (action == "deposit") {
      swapFeesInfo.swapFeeType = swapFeeTypes.get("DEPOSIT_FEE_TYPE")!;
    } else if (action == "withdrawal") {
      swapFeesInfo.swapFeeType = swapFeeTypes.get("WITHDRAWAL_FEE_TYPE")!;
    } else if (action == "swap") {
      swapFeesInfo.swapFeeType = swapFeeTypes.get("SWAP_FEE_TYPE")!;
    }
  }

  swapFeesInfo.tokenPrice = data.tokenPrice;
  swapFeesInfo.feeReceiverAmount = data.feeReceiverAmount;
  swapFeesInfo.feeUsdForPool = data.feeAmountForPool.times(swapFeesInfo.tokenPrice);

  swapFeesInfo.transaction = eventData.transaction.id;

  swapFeesInfo.save();

  return swapFeesInfo;
}

export function savePositionFeesInfo(eventData: EventData): PositionFeesInfo {
  let orderKey = eventData.getBytes32ItemOrNull("orderKey")!.toHexString();

  let id = orderKey + ":" + eventData.eventName;

  let feesInfo = new PositionFeesInfo(id);

  feesInfo.orderKey = orderKey;
  feesInfo.eventName = eventData.eventName;
  feesInfo.marketAddress = eventData.getAddressItemStringOrNull("market")!;
  feesInfo.collateralTokenAddress = eventData.getAddressItemStringOrNull("collateralToken")!;

  feesInfo.trader = eventData.getAddressItemStringOrNull("trader")!;
  feesInfo.affiliate = eventData.getAddressItemStringOrNull("affiliate")!;

  feesInfo.collateralTokenPriceMin = eventData.getUintItemOrNull("collateralTokenPrice.min")!;
  feesInfo.collateralTokenPriceMax = eventData.getUintItemOrNull("collateralTokenPrice.max")!;

  feesInfo.positionFeeAmount = eventData.getUintItemOrNull("positionFeeAmount")!;
  feesInfo.borrowingFeeAmount = eventData.getUintItemOrNull("borrowingFeeAmount")!;
  feesInfo.fundingFeeAmount = eventData.getUintItemOrNull("fundingFeeAmount")!;
  feesInfo.feeUsdForPool = eventData.getUintItemOrNull("feeAmountForPool")!.times(feesInfo.collateralTokenPriceMin);

  feesInfo.totalRebateAmount = eventData.getUintItemOrNull("totalRebateAmount")!;
  feesInfo.totalRebateFactor = eventData.getUintItemOrNull("totalRebateFactor")!;
  feesInfo.traderDiscountAmount = eventData.getUintItemOrNull("traderDiscountAmount")!;
  feesInfo.affiliateRewardAmount = eventData.getUintItemOrNull("affiliateRewardAmount")!;

  feesInfo.transaction = eventData.transaction.id;

  feesInfo.save();

  return feesInfo;
}

export function getOrCreateCollectedMarketFees(
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
    collectedFees.feeUsdForPool = ZERO;
    collectedFees.cummulativeFeeUsdForPool = ZERO;
    collectedFees.feeUsdPerPoolValue = ZERO;
    collectedFees.cumulativeFeeUsdPerPoolValue = ZERO;
    collectedFees.feeUsdPerGmToken = ZERO;
    collectedFees.cumulativeFeeUsdPerGmToken = ZERO;
    collectedFees.prevCumulativeFeeUsdPerGmToken = ZERO;
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

  dailyFees.totalFeeUsdForPool = dailyFees.totalFeeUsdForPool.plus(feeUsdForPool);
  dailyFees.totalFeeReceiverUsd = dailyFees.totalFeeReceiverUsd.plus(feeReceiverUsd);
  totalFees.totalFeeUsdForPool = totalFees.totalFeeUsdForPool.plus(feeUsdForPool);
  totalFees.totalFeeReceiverUsd = totalFees.totalFeeReceiverUsd.plus(feeReceiverUsd);

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

  dailyFees.totalBorrowingFeeUsd = dailyFees.totalBorrowingFeeUsd.plus(borrowingFeeUsd);
  dailyFees.totalPositionFeeAmount = dailyFees.totalPositionFeeAmount.plus(positionFeeAmount);
  dailyFees.totalPositionFeeUsd = dailyFees.totalPositionFeeUsd.plus(positionFeeUsd);
  dailyFees.totalPositionFeeAmountForPool = dailyFees.totalPositionFeeAmountForPool.plus(positionFeeAmountForPool);
  dailyFees.totalPositionFeeUsdForPool = dailyFees.totalPositionFeeUsdForPool.plus(positionFeeUsdForPool);

  totalFees.totalBorrowingFeeUsd = totalFees.totalBorrowingFeeUsd.plus(borrowingFeeUsd);
  totalFees.totalPositionFeeAmount = totalFees.totalPositionFeeAmount.plus(positionFeeAmount);
  totalFees.totalPositionFeeUsd = totalFees.totalPositionFeeUsd.plus(positionFeeUsd);
  totalFees.totalPositionFeeAmountForPool = totalFees.totalPositionFeeAmountForPool.plus(positionFeeAmountForPool);
  totalFees.totalPositionFeeUsdForPool = totalFees.totalPositionFeeUsdForPool.plus(positionFeeUsdForPool);

  dailyFees.save();
  totalFees.save();
}

function getOrCreateSwapFeesInfoWithPeriod(id: string, period: string): SwapFeesInfoWithPeriod {
  let feeInfo = SwapFeesInfoWithPeriod.load(id);

  if (feeInfo == null) {
    feeInfo = new SwapFeesInfoWithPeriod(id);
    feeInfo.period = period;
    feeInfo.totalFeeUsdForPool = ZERO;
    feeInfo.totalFeeReceiverUsd = ZERO;
  }

  return feeInfo as SwapFeesInfoWithPeriod;
}

function getOrCreatePositionFeesInfoWithPeriod(id: string, period: string): PositionFeesInfoWithPeriod {
  let feeInfo = PositionFeesInfoWithPeriod.load(id);

  if (feeInfo == null) {
    feeInfo = new PositionFeesInfoWithPeriod(id);
    feeInfo.period = period;
    feeInfo.totalBorrowingFeeUsd = ZERO;
    feeInfo.totalPositionFeeAmount = ZERO;
    feeInfo.totalPositionFeeUsd = ZERO;
    feeInfo.totalPositionFeeAmountForPool = ZERO;
    feeInfo.totalPositionFeeUsdForPool = ZERO;
  }

  return feeInfo as PositionFeesInfoWithPeriod;
}

export function saveCollectedMarketFees(
  transaction: Transaction,
  marketAddress: string,
  poolValue: BigInt,
  feeUsdForPool: BigInt,
  marketTokensSupply: BigInt
): void {
  // total should always come first, as its cumulativeFeeUsdPerPoolValue is used in pending fees iteration
  let totalFees = getOrCreateCollectedMarketFees(marketAddress, transaction.timestamp, "total");
  totalFees.cummulativeFeeUsdForPool = totalFees.cummulativeFeeUsdForPool.plus(feeUsdForPool);

  updateCollectedFeesFractions(poolValue, totalFees, totalFees, feeUsdForPool, marketTokensSupply);

  totalFees.feeUsdForPool = totalFees.feeUsdForPool.plus(feeUsdForPool);
  totalFees.save();

  let feesForPeriod = getOrCreateCollectedMarketFees(marketAddress, transaction.timestamp, "1h");

  updateCollectedFeesFractions(poolValue, feesForPeriod, totalFees, feeUsdForPool, marketTokensSupply);

  feesForPeriod.cummulativeFeeUsdForPool = totalFees.cummulativeFeeUsdForPool;
  feesForPeriod.feeUsdForPool = feesForPeriod.feeUsdForPool.plus(feeUsdForPool);
  feesForPeriod.save();
}

export function handlePositionImpactPoolDistributed(
  eventData: EventData,
  transaction: Transaction,
  network: string
): void {
  let data = new PositionImpactPoolDistributedEventData(eventData);
  let marketInfo = MarketInfo.load(data.market);

  if (!marketInfo) {
    log.warning("Market not found: {}", [data.market]);
    throw new Error("Market not found");
  }

  let indexToken = marketInfo.indexToken;
  let tokenPrice = getTokenPrice(indexToken);
  let amountUsd = data.distributionAmount.times(tokenPrice);
  let poolValue = getMarketPoolValueFromContract(data.market, network, transaction);
  let marketTokensSupply = getMarketTokensSupplyFromContract(data.market);

  saveCollectedMarketFees(transaction, data.market, poolValue, amountUsd, marketTokensSupply);
}

function getUpdatedFeeUsdPerPoolValue(feeInfo: CollectedMarketFeesInfo, fee: BigInt, poolValue: BigInt): BigInt {
  if (poolValue.equals(ZERO)) {
    return ZERO;
  }

  return feeInfo.feeUsdPerPoolValue.plus(fee.times(BigInt.fromI32(10).pow(30)).div(poolValue));
}

function getUpdatedFeeUsdPerGmToken(feeInfo: CollectedMarketFeesInfo, fee: BigInt, marketTokensSupply: BigInt): BigInt {
  if (marketTokensSupply.equals(ZERO)) {
    return ZERO;
  }

  return feeInfo.feeUsdPerGmToken.plus(fee.times(BigInt.fromI32(10).pow(18)).div(marketTokensSupply));
}
