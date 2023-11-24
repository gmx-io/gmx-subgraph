import { SwapInfo, Transaction } from "../../generated/schema";
import { Ctx } from "../utils/eventData";

export function handleSwapInfo(ctx: Ctx, transaction: Transaction): SwapInfo {
  let orderKey = ctx.getBytes32Item("orderKey").toHexString();
  let marketAddress = ctx.getAddressItemString("market");

  let swapInfoId = getSwapInfoId(orderKey, marketAddress);

  let swapInfo = new SwapInfo(swapInfoId);

  swapInfo.orderKey = orderKey;
  swapInfo.marketAddress = marketAddress;
  swapInfo.transaction = transaction.id;

  swapInfo.receiver = ctx.getAddressItemString("receiver");

  swapInfo.tokenInAddress = ctx.getAddressItemString("tokenIn");
  swapInfo.tokenOutAddress = ctx.getAddressItemString("tokenOut");

  swapInfo.tokenInPrice = ctx.getUintItem("tokenInPrice");
  swapInfo.tokenOutPrice = ctx.getUintItem("tokenOutPrice");

  swapInfo.amountIn = ctx.getUintItem("amountIn");
  swapInfo.amountInAfterFees = ctx.getUintItem("amountInAfterFees");
  swapInfo.amountOut = ctx.getUintItem("amountOut");
  swapInfo.priceImpactUsd = ctx.getUintItem("priceImpactUsd");

  swapInfo.save();

  return swapInfo;
}

export function getSwapInfoId(orderKey: string, marketAddress: string): string {
  return orderKey + ":" + marketAddress;
}
