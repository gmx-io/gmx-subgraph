import { log } from "@graphprotocol/graph-ts";
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
import { PositionFeesCollectedEventData } from "../utils/eventData/PositionFeesCollectedEventData";
import { SwapFeesCollectedEventData } from "../utils/eventData/SwapFeesCollectedEventData";

export function handleSwapFeesCollected(eventData: EventData): void {
  let transaction = eventData.transaction;
  let data = new SwapFeesCollectedEventData(eventData);
  let swapFeesInfo = saveSwapFeesInfo(data, eventData);
  let action = getSwapActionByFeeType(swapFeesInfo.swapFeeType);
  let feeReceiverAmount = data.feeReceiverAmount;
  let tokenPrice = data.tokenPrice;

  let totalAmountIn = data.amountAfterFees.plus(data.feeAmountForPool).plus(feeReceiverAmount);
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
  saveSwapFeesInfoWithPeriod(data.feeAmountForPool, feeReceiverAmount, tokenPrice, transaction.timestamp);
}

export function handlePositionFeesCollected(eventData: EventData): void {
  let transaction = eventData.transaction;
  let data = new PositionFeesCollectedEventData(eventData);
  let positionFeesInfo = savePositionFeesInfo(eventData);
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
    data.positionFeeAmount,
    data.positionFeeAmountForPool,
    data.borrowingFeeUsd,
    data.collateralTokenPriceMin,
    transaction.timestamp
  );
}
