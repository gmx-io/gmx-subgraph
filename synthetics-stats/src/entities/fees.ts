import { BigInt } from "@graphprotocol/graph-ts";
import {
  CollectedPositionFee,
  PositionFeesInfo,
  Transaction,
} from "../../generated/schema";
import { timestampToPeriodStart } from "../utils/time";
import { EventData } from "../utils/eventData";

export function saveCollectedPositionFeesForPeriod(
  positionFeesInfo: PositionFeesInfo,
  period: string,
  timestamp: i32
): CollectedPositionFee {
  let collectedFees = getOrCreateColletedPositionFees(
    positionFeesInfo.marketAddress,
    positionFeesInfo.collateralTokenAddress,
    timestamp,
    period
  );

  collectedFees.feeAmountForPool = collectedFees.feeAmountForPool.plus(
    positionFeesInfo.feeAmountForPool
  );

  collectedFees.feeUsdForPool = collectedFees.feeUsdForPool.plus(
    positionFeesInfo.feeAmountForPool.times(
      positionFeesInfo.collateralTokenPriceMax
    )
  );

  collectedFees.save();

  return collectedFees;
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

  feesInfo.transaction = transaction.id;

  feesInfo.save();

  return feesInfo;
}

export function getOrCreateColletedPositionFees(
  marketAddress: string,
  collateralAddress: string,
  timestamp: i32,
  period: string
): CollectedPositionFee {
  let timestampGroup = timestampToPeriodStart(timestamp, period);

  let id =
    marketAddress +
    ":" +
    collateralAddress +
    ":" +
    "period" +
    ":" +
    timestampGroup.toString();

  let collectedFees = CollectedPositionFee.load(id);

  if (collectedFees == null) {
    collectedFees = new CollectedPositionFee(id);
    collectedFees.marketAddress = marketAddress;
    collectedFees.collateralTokenAddress = collateralAddress;
    collectedFees.period = period;
    collectedFees.timestampGroup = timestampGroup;
    collectedFees.feeAmountForPool = BigInt.fromI32(0);
    collectedFees.feeUsdForPool = BigInt.fromI32(0);
  }

  return collectedFees as CollectedPositionFee;
}
