import { BigInt, log } from "@graphprotocol/graph-ts";
import {
  ClaimAction,
  ClaimCollateralAction,
  ClaimRef,
  ClaimableFundingFeeInfo,
  Order,
  Transaction,
} from "../../generated/schema";
import { EventData } from "../utils/eventData";
import { orderTypes } from "./orders";

export function handleFundingFeeCreatedClaimAction(
  transaction: Transaction,
  eventData: EventData
): void {
  let orderId = eventData.getBytes32Item("key")!.toHexString();

  let account = eventData.getAddressItemString("account")!;
  let id = transaction.id + ":" + account + ":SettleFundingFeeCreated";
  let claimAction = getOrCreateClaimAction(id);

  addRequiredFieldsToClaimAction(
    claimAction,
    eventData,
    transaction,
    "SettleFundingFeeCreated"
  );

  let marketAddress = eventData.getAddressItemString("market")!;
  let marketAddresses = claimAction.marketAddresses;
  marketAddresses.push(marketAddress);
  claimAction.marketAddresses = marketAddresses;

  let isLongOrders = claimAction.isLongOrders;
  isLongOrders.push(eventData.getBoolItem("isLong"));
  claimAction.isLongOrders = isLongOrders;

  let transactionIds = claimAction.transactionIds;
  transactionIds.push(transaction.id);
  claimAction.transactionIds = transactionIds;

  claimAction.save();

  getOrCreateClaimRef(orderId);
}

export function handleFundingFeeExecutedClaimAction(
  transaction: Transaction,
  eventData: EventData
): void {
  let claimAction = getOrCreateFundingFeeClaimAction(
    transaction,
    "SettleFundingFeeExecuted",
    eventData
  );

  let orderId = eventData.getBytes32Item("key")!.toHexString();
  let order = Order.load(orderId);

  if (!order) throw new Error("Order not found");

  let account = eventData.getAddressItemString("account")!;
  let claimableFundingFeeInfoId = transaction.id + ":" + account;
  let claimableFundingFeeInfo = ClaimableFundingFeeInfo.load(
    claimableFundingFeeInfoId
  );

  if (!claimableFundingFeeInfo) {
    log.warning("ClaimableFundingFeeInfo not found {}", [
      claimableFundingFeeInfoId,
    ]);
    log.warning("Transaction {}", [transaction.id]);
    log.warning("Order {}", [order.id]);
    throw new Error("ClaimableFundingFeeInfo not found");
  }

  insertFundingFeeInfo(claimAction, claimableFundingFeeInfo!);

  let tokensCount = claimableFundingFeeInfo.tokenAddresses.length;

  for (let i = 0; i < tokensCount; i++) {
    let marketAddresses = claimAction.marketAddresses;
    let isLongOrders = claimAction.isLongOrders;
    let transactionIds = claimAction.transactionIds;

    marketAddresses.push(order.marketAddress);
    isLongOrders.push(order.isLong);
    transactionIds.push(transaction.id);

    claimAction.marketAddresses = marketAddresses;
    claimAction.isLongOrders = isLongOrders;
    claimAction.transactionIds = transactionIds;
  }

  claimAction.save();
}

export function handleCollateralClaimAction(
  eventData: EventData,
  transaction: Transaction,
  eventName: string
): void {
  let account = eventData.getAddressItemString("account")!;
  let id = transaction.id + ":" + account + ":" + eventName;
  let claimCollateralAction = getOrCreateClaimCollateralAction(id);
  let claimAction = getOrCreateClaimAction(id);

  addFieldsToCollateralLikeClaimAction(
    claimAction,
    eventData,
    transaction,
    eventName
  );
  addFieldsToCollateralLikeClaimAction(
    claimCollateralAction as ClaimAction,
    eventData,
    transaction,
    eventName
  );

  claimCollateralAction.save();
  claimAction.save();
}

export function handleFundingFeeCancelledClaimAction(
  transaction: Transaction,
  eventData: EventData
): void {
  let claimAction = getOrCreateFundingFeeClaimAction(
    transaction,
    "SettleFundingFeeCancelled",
    eventData
  );

  let orderId = eventData.getBytes32Item("key")!.toHexString();
  let order = Order.load(orderId);

  if (!order) throw new Error("Order not found");

  let marketAddresses = claimAction.marketAddresses;
  marketAddresses.push(order.marketAddress);
  claimAction.marketAddresses = marketAddresses;

  let isLongOrders = claimAction.isLongOrders;
  isLongOrders.push(order.isLong);
  claimAction.isLongOrders = isLongOrders;

  let transactionIds = claimAction.transactionIds;
  transactionIds.push(transaction.id);
  claimAction.transactionIds = transactionIds;

  claimAction.save();
}

export function saveClaimableFundingFeeInfo(
  eventData: EventData,
  transaction: Transaction
): ClaimableFundingFeeInfo {
  let account = eventData.getAddressItemString("account")!;
  let id = transaction.id + ":" + account;
  let entity = ClaimableFundingFeeInfo.load(id);

  if (!entity) {
    entity = new ClaimableFundingFeeInfo(id);
    entity.amounts = new Array<BigInt>(0);
    entity.marketAddresses = new Array<string>(0);
    entity.tokenAddresses = new Array<string>(0);
  }

  let marketAddresses = entity.marketAddresses;
  marketAddresses.push(eventData.getAddressItemString("market")!);
  entity.marketAddresses = marketAddresses;

  let tokenAddresses = entity.tokenAddresses;
  tokenAddresses.push(eventData.getAddressItemString("token")!);
  entity.tokenAddresses = tokenAddresses;

  let amounts = entity.amounts;
  amounts.push(eventData.getUintItem("delta")!);
  entity.amounts = amounts;

  entity.save();

  return entity!;
}

function addFieldsToCollateralLikeClaimAction(
  claimAction: ClaimAction,
  eventData: EventData,
  transaction: Transaction,
  eventName: string
): void {
  addRequiredFieldsToClaimAction(
    claimAction,
    eventData,
    transaction,
    eventName
  );
  let marketAddresses = claimAction.marketAddresses;
  marketAddresses.push(eventData.getAddressItemString("market")!);
  claimAction.marketAddresses = marketAddresses;

  let tokenAddresses = claimAction.tokenAddresses;
  tokenAddresses.push(eventData.getAddressItemString("token")!);
  claimAction.tokenAddresses = tokenAddresses;

  let amounts = claimAction.amounts;
  amounts.push(eventData.getUintItem("amount")!);
  claimAction.amounts = amounts;
}

function getOrCreateFundingFeeClaimAction(
  transaction: Transaction,
  eventName: string,
  eventData: EventData
): ClaimAction {
  let id =
    transaction.id +
    ":" +
    eventData.getAddressItemString("account")! +
    ":" +
    eventName;
  let claimAction = getOrCreateClaimAction(id);

  addRequiredFieldsToClaimAction(
    claimAction,
    eventData,
    transaction,
    eventName
  );
  return claimAction;
}

function addRequiredFieldsToClaimAction(
  claimAction: ClaimAction,
  eventData: EventData,
  transaction: Transaction,
  eventName: string
): void {
  let account = eventData.getAddressItemString("account")!;
  claimAction.eventName = eventName;
  claimAction.account = account;
  claimAction.transaction = transaction.id;
  claimAction.save();
}

function insertFundingFeeInfo(
  claimAction: ClaimAction,
  claimableFundingFeeInfo: ClaimableFundingFeeInfo
): void {
  let sourceTokenAddresses = claimableFundingFeeInfo.tokenAddresses;

  for (let i = 0; i < sourceTokenAddresses.length; i++) {
    let sourceTokenAddress = sourceTokenAddresses[i];
    let targetTokenAddresses = claimAction.tokenAddresses;
    targetTokenAddresses.push(sourceTokenAddress);
    claimAction.tokenAddresses = targetTokenAddresses;
    claimAction.save();
  }

  let sourceAmounts = claimableFundingFeeInfo.amounts;

  for (let i = 0; i < sourceAmounts.length; i++) {
    let sourceAmount = sourceAmounts[i];
    let targetAmounts = claimAction.amounts;
    targetAmounts.push(sourceAmount);
    claimAction.amounts = targetAmounts;
    claimAction.save();
  }

  claimAction.save();
}

function getOrCreateClaimCollateralAction(id: string): ClaimCollateralAction {
  let entity = ClaimCollateralAction.load(id);

  if (!entity) {
    entity = new ClaimCollateralAction(id);
    entity.marketAddresses = new Array<string>(0);
    entity.tokenAddresses = new Array<string>(0);
    entity.amounts = new Array<BigInt>(0);
  }

  return entity as ClaimCollateralAction;
}

function getOrCreateClaimAction(id: string): ClaimAction {
  let entity = ClaimAction.load(id);

  if (!entity) {
    entity = new ClaimAction(id);
    entity.marketAddresses = new Array<string>(0);
    entity.tokenAddresses = new Array<string>(0);
    entity.amounts = new Array<BigInt>(0);
    entity.isLongOrders = new Array<boolean>(0);
    entity.transactionIds = new Array<string>(0);
  }

  return entity as ClaimAction;
}

export function isFundingFeeSettleOrder(order: Order): boolean {
  return (
    order.initialCollateralDeltaAmount.equals(BigInt.fromI32(1)) &&
    order.sizeDeltaUsd.equals(BigInt.fromI32(0)) &&
    order.orderType == orderTypes.get("MarketDecrease")
  );
}

function getOrCreateClaimRef(orderId: string): ClaimRef {
  let entity = ClaimRef.load(orderId);

  if (!entity) {
    entity = new ClaimRef(orderId);
    entity.save();
  }

  return entity!;
}
