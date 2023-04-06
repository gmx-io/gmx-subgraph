import {
  PositionDecrease,
  PositionFeesInfo,
  PositionIncrease,
  Transaction,
} from "../../generated/schema";
import { EventData } from "../utils/eventData";

export function savePositionIncrease(
  eventData: EventData,
  transaction: Transaction
): PositionIncrease {
  let orderKey = eventData.getBytes32Item("orderKey")!.toHexString();
  let entity = new PositionIncrease(orderKey);

  entity.orderKey = orderKey;
  entity.positionKey = eventData.getBytes32Item("positionKey")!.toHexString();

  entity.account = eventData.getAddressItemString("account")!;
  entity.marketAddress = eventData.getAddressItemString("market")!;
  entity.collateralTokenAddress = eventData.getAddressItemString(
    "collateralToken"
  )!;

  entity.sizeInUsd = eventData.getUintItem("sizeInUsd")!;
  entity.sizeInTokens = eventData.getUintItem("sizeInTokens")!;
  entity.collateralAmount = eventData.getUintItem("collateralAmount")!;

  entity.sizeDeltaUsd = eventData.getUintItem("sizeDeltaUsd")!;
  entity.sizeDeltaInTokens = eventData.getUintItem("sizeDeltaInTokens")!;
  entity.collateralDeltaAmount = eventData.getUintItem(
    "collateralDeltaAmount"
  )!;
  entity.borrowingFactor = eventData.getUintItem("borrowingFactor")!;
  entity.priceImpactDiffUsd = eventData.getUintItem("priceImpactDiffUsd")!;

  entity.executionPrice = eventData.getUintItem("executionPrice")!;

  entity.longTokenFundingAmountPerSize = eventData.getIntItem(
    "longTokenFundingAmountPerSize"
  )!;
  entity.shortTokenFundingAmountPerSize = eventData.getIntItem(
    "shortTokenFundingAmountPerSize"
  )!;
  entity.priceImpactAmount = eventData.getIntItem("priceImpactAmount")!;
  entity.pnlUsd = eventData.getIntItem("pnlUsd")!;

  entity.orderType = eventData.getUintItem("orderType")!;
  entity.isLong = eventData.getBoolItem("isLong");

  entity.transaction = transaction.id;

  entity.save();

  return entity;
}

export function savePositionDecrease(
  eventData: EventData,
  transaction: Transaction
): PositionDecrease {
  let orderKey = eventData.getBytes32Item("orderKey")!.toHexString();

  let entity = new PositionDecrease(orderKey);

  entity.orderKey = orderKey;
  entity.positionKey = eventData.getBytes32Item("positionKey")!.toHexString();

  entity.account = eventData.getAddressItemString("account")!;
  entity.marketAddress = eventData.getAddressItemString("market")!;
  entity.collateralTokenAddress = eventData.getAddressItemString(
    "collateralToken"
  )!;

  entity.sizeInUsd = eventData.getUintItem("sizeInUsd")!;
  entity.sizeInTokens = eventData.getUintItem("sizeInTokens")!;
  entity.collateralAmount = eventData.getUintItem("collateralAmount")!;

  entity.sizeDeltaUsd = eventData.getUintItem("sizeDeltaUsd")!;
  entity.sizeDeltaInTokens = eventData.getUintItem("sizeDeltaInTokens")!;
  entity.collateralDeltaAmount = eventData.getUintItem(
    "collateralDeltaAmount"
  )!;
  entity.borrowingFactor = eventData.getUintItem("borrowingFactor")!;
  entity.priceImpactDiffUsd = eventData.getUintItem("priceImpactDiffUsd")!;

  entity.executionPrice = eventData.getUintItem("executionPrice")!;

  entity.longTokenFundingAmountPerSize = eventData.getIntItem(
    "longTokenFundingAmountPerSize"
  )!;
  entity.shortTokenFundingAmountPerSize = eventData.getIntItem(
    "shortTokenFundingAmountPerSize"
  )!;
  entity.priceImpactAmount = eventData.getIntItem("priceImpactAmount")!;
  entity.pnlUsd = eventData.getIntItem("pnlUsd")!;

  entity.orderType = eventData.getUintItem("orderType")!;
  entity.isLong = eventData.getBoolItem("isLong");

  entity.transaction = transaction.id;

  entity.save();

  return entity;
}
