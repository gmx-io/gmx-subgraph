import {
  PositionDecrease,
  PositionIncrease,
  Transaction,
} from "../../generated/schema";
import { EventData } from "../utils/eventData";

export function handlePositionIncrease(
  eventId: string,
  eventData: EventData,
  transaction: Transaction
): PositionIncrease {
  let entity = new PositionIncrease(eventId);

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

export function handlePositionDecrease(
  eventId: string,
  eventData: EventData,
  transaction: Transaction
): PositionDecrease {
  let entity = new PositionDecrease(eventId);

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
