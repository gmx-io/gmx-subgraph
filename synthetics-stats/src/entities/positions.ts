import { PositionDecrease, PositionIncrease, Transaction } from "../../generated/schema";
import { EventData } from "../utils/eventData";

export function savePositionIncrease(eventData: EventData, transaction: Transaction): PositionIncrease {
  let orderKey = eventData.getBytes32ItemOrNull("orderKey")!.toHexString();
  let entity = new PositionIncrease(orderKey);

  entity.orderKey = orderKey;
  entity.positionKey = eventData.getBytes32ItemOrNull("positionKey")!.toHexString();

  entity.account = eventData.getAddressItemStringOrNull("account")!;
  entity.marketAddress = eventData.getAddressItemStringOrNull("market")!;
  entity.collateralTokenAddress = eventData.getAddressItemStringOrNull("collateralToken")!;

  entity.collateralTokenPriceMin = eventData.getUintItemOrNull("collateralTokenPrice.min")!;

  entity.collateralTokenPriceMax = eventData.getUintItemOrNull("collateralTokenPrice.max")!;

  entity.sizeInUsd = eventData.getUintItemOrNull("sizeInUsd")!;
  entity.sizeInTokens = eventData.getUintItemOrNull("sizeInTokens")!;
  entity.collateralAmount = eventData.getUintItemOrNull("collateralAmount")!;

  entity.sizeDeltaUsd = eventData.getUintItemOrNull("sizeDeltaUsd")!;
  entity.sizeDeltaInTokens = eventData.getUintItemOrNull("sizeDeltaInTokens")!;
  entity.collateralDeltaAmount = eventData.getIntItemOrNull("collateralDeltaAmount")!;
  entity.borrowingFactor = eventData.getUintItemOrNull("borrowingFactor")!;
  entity.priceImpactDiffUsd = eventData.getUintItemOrNull("priceImpactDiffUsd")!;

  entity.executionPrice = eventData.getUintItemOrNull("executionPrice")!;

  entity.longTokenFundingAmountPerSize = eventData.getIntItemOrNull("longTokenFundingAmountPerSize")!;
  entity.shortTokenFundingAmountPerSize = eventData.getIntItemOrNull("shortTokenFundingAmountPerSize")!;
  entity.priceImpactAmount = eventData.getIntItemOrNull("priceImpactAmount")!;
  entity.priceImpactUsd = eventData.getIntItemOrNull("priceImpactUsd")!;
  entity.basePnlUsd = eventData.getIntItemOrNull("basePnlUsd")!;

  entity.orderType = eventData.getUintItemOrNull("orderType")!;
  entity.isLong = eventData.getBoolItemOrFalse("isLong");

  entity.transaction = transaction.id;

  entity.save();

  return entity;
}

export function savePositionDecrease(eventData: EventData, transaction: Transaction): PositionDecrease {
  let orderKey = eventData.getBytes32ItemOrNull("orderKey")!.toHexString();

  let entity = new PositionDecrease(orderKey);

  entity.orderKey = orderKey;
  entity.positionKey = eventData.getBytes32ItemOrNull("positionKey")!.toHexString();

  entity.account = eventData.getAddressItemStringOrNull("account")!;
  entity.marketAddress = eventData.getAddressItemStringOrNull("market")!;
  entity.collateralTokenAddress = eventData.getAddressItemStringOrNull("collateralToken")!;

  entity.collateralTokenPriceMin = eventData.getUintItemOrNull("collateralTokenPrice.min")!;

  entity.collateralTokenPriceMax = eventData.getUintItemOrNull("collateralTokenPrice.max")!;

  entity.sizeInUsd = eventData.getUintItemOrNull("sizeInUsd")!;
  entity.sizeInTokens = eventData.getUintItemOrNull("sizeInTokens")!;
  entity.collateralAmount = eventData.getUintItemOrNull("collateralAmount")!;

  entity.sizeDeltaUsd = eventData.getUintItemOrNull("sizeDeltaUsd")!;
  entity.sizeDeltaInTokens = eventData.getUintItemOrNull("sizeDeltaInTokens")!;
  entity.collateralDeltaAmount = eventData.getUintItemOrNull("collateralDeltaAmount")!;
  entity.borrowingFactor = eventData.getUintItemOrNull("borrowingFactor")!;
  entity.priceImpactDiffUsd = eventData.getUintItemOrNull("priceImpactDiffUsd")!;
  entity.priceImpactUsd = eventData.getIntItemOrNull("priceImpactUsd")!;

  entity.executionPrice = eventData.getUintItemOrNull("executionPrice")!;

  entity.longTokenFundingAmountPerSize = eventData.getIntItemOrNull("longTokenFundingAmountPerSize")!;
  entity.shortTokenFundingAmountPerSize = eventData.getIntItemOrNull("shortTokenFundingAmountPerSize")!;
  entity.priceImpactAmount = eventData.getIntItemOrNull("priceImpactAmount")!;
  entity.basePnlUsd = eventData.getIntItemOrNull("basePnlUsd")!;

  entity.orderType = eventData.getUintItemOrNull("orderType")!;
  entity.isLong = eventData.getBoolItemOrFalse("isLong");

  entity.transaction = transaction.id;

  entity.save();

  return entity;
}
