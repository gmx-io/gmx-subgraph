import { BigInt } from "@graphprotocol/graph-ts";
import { CollectedPositionFee, PositionFeesInfo } from "../../generated/schema";
import { timestampToPeriodStart } from "../utils/time";

export function saveCollectedPositionFeesByPeriod(
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

  collectedFees.feeAmountForPool =
    collectedFees.feeAmountForPool + positionFeesInfo.feeAmountForPool;

  collectedFees.feeUsdForPool =
    collectedFees.feeUsdForPool +
    positionFeesInfo.feeAmountForPool *
      positionFeesInfo.collateralTokenPriceMin;

  collectedFees.save();

  return collectedFees;
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
