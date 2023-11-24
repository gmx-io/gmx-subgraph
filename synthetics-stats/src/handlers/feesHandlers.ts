import { getMarketPoolValueFromContract } from "../contracts/getMarketPoolValueFromContract";
import { getMarketTokensSupplyFromContract } from "../contracts/getMarketTokensSupplyFromContract";
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
import { Ctx } from "../utils/eventData";
import { PositionFeesCollectedEventData } from "../utils/eventData/PositionFeesCollectedEventData";
import { SwapFeesCollectedEventData } from "../utils/eventData/SwapFeesCollectedEventData";

export function handleSwapFeesCollected(ctx: Ctx): void {
  let transaction = ctx.transaction;
  let data = new SwapFeesCollectedEventData(ctx);
  let swapFeesInfo = saveSwapFeesInfo(data, ctx);
  let tokenPrice = data.tokenPrice;
  let feeReceiverAmount = data.feeReceiverAmount;
  let feeAmountForPool = data.feeAmountForPool;
  let amountAfterFees = data.amountAfterFees;
  let action = getSwapActionByFeeType(swapFeesInfo.swapFeeType);
  let totalAmountIn = amountAfterFees.plus(feeAmountForPool).plus(feeReceiverAmount);
  let volumeUsd = totalAmountIn.times(tokenPrice);
  let poolValue = getMarketPoolValueFromContract(swapFeesInfo.marketAddress, ctx.network, transaction);
  let marketTokensSupply = isDepositOrWithdrawalAction(action)
    ? getMarketTokensSupplyFromContract(swapFeesInfo.marketAddress)
    : getMarketInfo(swapFeesInfo.marketAddress).marketTokensSupply;

  saveCollectedMarketFees(
    transaction,
    swapFeesInfo.marketAddress,
    poolValue,
    swapFeesInfo.feeUsdForPool,
    marketTokensSupply
  );
  saveVolumeInfo(action, transaction.timestamp, volumeUsd);
  saveSwapFeesInfoWithPeriod(feeAmountForPool, feeReceiverAmount, tokenPrice, transaction.timestamp);
}

export function handlePositionFeesCollected(ctx: Ctx): void {
  let transaction = ctx.transaction;
  let data = new PositionFeesCollectedEventData(ctx);
  let positionFeesInfo = savePositionFeesInfo(ctx);
  let poolValue = getMarketPoolValueFromContract(positionFeesInfo.marketAddress, ctx.network, transaction);
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

function isDepositOrWithdrawalAction(action: string): boolean {
  return action == "deposit" || action == "withdrawal";
}
