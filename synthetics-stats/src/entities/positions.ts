import { PositionDecrease, PositionIncrease, Transaction } from "../../generated/schema";
import { Ctx } from "../utils/eventData";

export function savePositionIncrease(ctx: Ctx, transaction: Transaction): PositionIncrease {
  let orderKey = ctx.getBytes32Item("orderKey").toHexString();
  let entity = new PositionIncrease(orderKey);

  entity.orderKey = orderKey;
  entity.positionKey = ctx.getBytes32Item("positionKey").toHexString();

  entity.account = ctx.getAddressItemString("account");
  entity.marketAddress = ctx.getAddressItemString("market");
  entity.collateralTokenAddress = ctx.getAddressItemString("collateralToken");

  entity.collateralTokenPriceMin = ctx.getUintItem("collateralTokenPrice.min");

  entity.collateralTokenPriceMax = ctx.getUintItem("collateralTokenPrice.max");

  entity.sizeInUsd = ctx.getUintItem("sizeInUsd");
  entity.sizeInTokens = ctx.getUintItem("sizeInTokens");
  entity.collateralAmount = ctx.getUintItem("collateralAmount");

  entity.sizeDeltaUsd = ctx.getUintItem("sizeDeltaUsd");
  entity.sizeDeltaInTokens = ctx.getUintItem("sizeDeltaInTokens");
  entity.collateralDeltaAmount = ctx.getIntItem("collateralDeltaAmount");
  entity.borrowingFactor = ctx.getUintItem("borrowingFactor");
  entity.priceImpactDiffUsd = ctx.getUintItem("priceImpactDiffUsd");

  entity.executionPrice = ctx.getUintItem("executionPrice");

  entity.longTokenFundingAmountPerSize = ctx.getIntItem("longTokenFundingAmountPerSize");
  entity.shortTokenFundingAmountPerSize = ctx.getIntItem("shortTokenFundingAmountPerSize");
  entity.priceImpactAmount = ctx.getIntItem("priceImpactAmount");
  entity.priceImpactUsd = ctx.getIntItem("priceImpactUsd");
  entity.basePnlUsd = ctx.getIntItem("basePnlUsd");

  entity.orderType = ctx.getUintItem("orderType");
  entity.isLong = ctx.getBoolItem("isLong");

  entity.transaction = transaction.id;

  entity.save();

  return entity;
}

export function savePositionDecrease(ctx: Ctx, transaction: Transaction): PositionDecrease {
  let orderKey = ctx.getBytes32Item("orderKey").toHexString();

  let entity = new PositionDecrease(orderKey);

  entity.orderKey = orderKey;
  entity.positionKey = ctx.getBytes32Item("positionKey").toHexString();

  entity.account = ctx.getAddressItemString("account");
  entity.marketAddress = ctx.getAddressItemString("market");
  entity.collateralTokenAddress = ctx.getAddressItemString("collateralToken");

  entity.collateralTokenPriceMin = ctx.getUintItem("collateralTokenPrice.min");

  entity.collateralTokenPriceMax = ctx.getUintItem("collateralTokenPrice.max");

  entity.sizeInUsd = ctx.getUintItem("sizeInUsd");
  entity.sizeInTokens = ctx.getUintItem("sizeInTokens");
  entity.collateralAmount = ctx.getUintItem("collateralAmount");

  entity.sizeDeltaUsd = ctx.getUintItem("sizeDeltaUsd");
  entity.sizeDeltaInTokens = ctx.getUintItem("sizeDeltaInTokens");
  entity.collateralDeltaAmount = ctx.getUintItem("collateralDeltaAmount");
  entity.borrowingFactor = ctx.getUintItem("borrowingFactor");
  entity.priceImpactDiffUsd = ctx.getUintItem("priceImpactDiffUsd");
  entity.priceImpactUsd = ctx.getIntItem("priceImpactUsd");

  entity.executionPrice = ctx.getUintItem("executionPrice");

  entity.longTokenFundingAmountPerSize = ctx.getIntItem("longTokenFundingAmountPerSize");
  entity.shortTokenFundingAmountPerSize = ctx.getIntItem("shortTokenFundingAmountPerSize");
  entity.priceImpactAmount = ctx.getIntItem("priceImpactAmount");
  entity.basePnlUsd = ctx.getIntItem("basePnlUsd");

  entity.orderType = ctx.getUintItem("orderType");
  entity.isLong = ctx.getBoolItem("isLong");

  entity.transaction = transaction.id;

  entity.save();

  return entity;
}
