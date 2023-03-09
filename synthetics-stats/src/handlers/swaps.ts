import { SwapInfo, Transaction } from "../../generated/schema";
import { EventData } from "../utils/eventData";

export function handleSwapInfo(
  eventData: EventData,
  transaction: Transaction
): SwapInfo {
  let orderKey = eventData.getBytes32Item("orderKey")!.toHexString();
  let marketAddress = eventData.getAddressItemString("market")!;

  let swapInfoId = getSwapInfoId(orderKey, marketAddress);

  let swapInfo = new SwapInfo(swapInfoId);

  swapInfo.orderKey = orderKey;
  swapInfo.marketAddress = marketAddress;
  swapInfo.transaction = transaction.id;

  swapInfo.receiver = eventData.getAddressItemString("receiver")!;

  swapInfo.tokenInAddress = eventData.getAddressItemString("tokenIn")!;
  swapInfo.tokenOutAddress = eventData.getAddressItemString("tokenOut")!;

  swapInfo.tokenInPrice = eventData.getUintItem("tokenInPrice")!;
  swapInfo.tokenOutPrice = eventData.getUintItem("tokenOutPrice")!;

  swapInfo.amountIn = eventData.getUintItem("amountIn")!;
  swapInfo.amountInAfterFees = eventData.getUintItem("amountInAfterFees")!;
  swapInfo.amountOut = eventData.getUintItem("amountOut")!;
  swapInfo.priceImpactUsd = eventData.getUintItem("priceImpactUsd")!;

  swapInfo.save();

  return swapInfo;
}

export function getSwapInfoId(orderKey: string, marketAddress: string): string {
  return orderKey + ":" + marketAddress;
}
