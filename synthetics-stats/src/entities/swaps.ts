import { SwapInfo, Transaction } from "../../generated/schema";
import { EventData } from "../utils/eventData";

export function handleSwapInfo(eventData: EventData, transaction: Transaction): SwapInfo {
  let orderKey = eventData.getBytes32ItemOrNull("orderKey")!.toHexString();
  let marketAddress = eventData.getAddressItemStringOrNull("market")!;

  let swapInfoId = getSwapInfoId(orderKey, marketAddress);

  let swapInfo = new SwapInfo(swapInfoId);

  swapInfo.orderKey = orderKey;
  swapInfo.marketAddress = marketAddress;
  swapInfo.transaction = transaction.id;

  swapInfo.receiver = eventData.getAddressItemStringOrNull("receiver")!;

  swapInfo.tokenInAddress = eventData.getAddressItemStringOrNull("tokenIn")!;
  swapInfo.tokenOutAddress = eventData.getAddressItemStringOrNull("tokenOut")!;

  swapInfo.tokenInPrice = eventData.getUintItemOrNull("tokenInPrice")!;
  swapInfo.tokenOutPrice = eventData.getUintItemOrNull("tokenOutPrice")!;

  swapInfo.amountIn = eventData.getUintItemOrNull("amountIn")!;
  swapInfo.amountInAfterFees = eventData.getUintItemOrNull("amountInAfterFees")!;
  swapInfo.amountOut = eventData.getUintItemOrNull("amountOut")!;
  swapInfo.priceImpactUsd = eventData.getUintItemOrNull("priceImpactUsd")!;

  swapInfo.save();

  return swapInfo;
}

export function getSwapInfoId(orderKey: string, marketAddress: string): string {
  return orderKey + ":" + marketAddress;
}
