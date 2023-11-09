import { getMarketPoolValueFromContract } from "../contracts/getMarketPoolValueFromContract";
import { getOrCreateTransaction } from "../entities/common";
import {
  getSwapActionByFeeType,
  saveCollectedMarketFees,
  savePositionFeesInfo,
  savePositionFeesInfoWithPeriod,
  saveSwapFeesInfo,
  saveSwapFeesInfoWithPeriod
} from "../entities/fees";
import { getMarketInfo } from "../entities/markets";
import { saveVolumeInfo } from "../entities/volume";
import { EventData } from "../utils/eventData";

export function handleSwapFeesCollected(eventData: EventData): void {
  let transaction = eventData.transaction;
  let swapFeesInfo = saveSwapFeesInfo(eventData, eventData.eventId, transaction);
  let tokenPrice = eventData.getUintItem("tokenPrice")!;
  let feeReceiverAmount = eventData.getUintItem("feeReceiverAmount")!;
  let feeAmountForPool = eventData.getUintItem("feeAmountForPool")!;
  let amountAfterFees = eventData.getUintItem("amountAfterFees")!;
  let action = getSwapActionByFeeType(swapFeesInfo.swapFeeType);
  let totalAmountIn = amountAfterFees.plus(feeAmountForPool).plus(feeReceiverAmount);
  let volumeUsd = totalAmountIn.times(tokenPrice);
  let poolValue = getMarketPoolValueFromContract(swapFeesInfo.marketAddress, eventData.network, transaction);
  let marketInfo = getMarketInfo(swapFeesInfo.marketAddress);

  saveCollectedMarketFees(
    transaction,
    swapFeesInfo.marketAddress,
    poolValue,
    swapFeesInfo.feeUsdForPool,
    marketInfo.marketTokensSupply
  );
  saveVolumeInfo(action, transaction.timestamp, volumeUsd);
  saveSwapFeesInfoWithPeriod(feeAmountForPool, feeReceiverAmount, tokenPrice, transaction.timestamp);
}

export function handlePositionFeesCollected(eventData: EventData): void {
  let transaction = eventData.transaction;
  let positionFeeAmount = eventData.getUintItem("positionFeeAmount")!;
  let positionFeeAmountForPool = eventData.getUintItem("positionFeeAmountForPool")!;
  let collateralTokenPriceMin = eventData.getUintItem("collateralTokenPrice.min")!;
  let borrowingFeeUsd = eventData.getUintItem("borrowingFeeUsd")!;
  let positionFeesInfo = savePositionFeesInfo(eventData, "PositionFeesCollected", transaction);
  let poolValue = getMarketPoolValueFromContract(positionFeesInfo.marketAddress, eventData.network, transaction);
  let marketInfo = getMarketInfo(positionFeesInfo.marketAddress);

  saveCollectedMarketFees(
    transaction,
    positionFeesInfo.marketAddress,
    poolValue,
    positionFeesInfo.feeUsdForPool,
    marketInfo.marketTokensSupply
  );
  savePositionFeesInfoWithPeriod(
    positionFeeAmount,
    positionFeeAmountForPool,
    borrowingFeeUsd,
    collateralTokenPriceMin,
    transaction.timestamp
  );
}
