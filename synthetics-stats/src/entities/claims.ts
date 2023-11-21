import { BigInt, log } from "@graphprotocol/graph-ts";
import {
  ClaimAction,
  ClaimCollateralAction,
  ClaimRef,
  ClaimableFundingFeeInfo,
  Order,
  Transaction
} from "../../generated/schema";
import { EventData } from "../utils/eventData";
import { orderTypes } from "./orders";

let ZERO = BigInt.fromI32(0);
let ONE = BigInt.fromI32(1);

export function saveClaimActionOnOrderCreated(eventData: EventData): void {
  let orderId = eventData.getBytes32ItemOrNull("key")!.toHexString();

  let claimAction = getOrCreateClaimAction("SettleFundingFeeCreated", eventData);

  let marketAddress = eventData.getAddressItemStringOrNull("market")!;
  let marketAddresses = claimAction.marketAddresses;
  marketAddresses.push(marketAddress);
  claimAction.marketAddresses = marketAddresses;

  let isLongOrders = claimAction.isLongOrders;
  isLongOrders.push(eventData.getBoolItemOrFalse("isLong"));
  claimAction.isLongOrders = isLongOrders;

  claimAction.save();

  createClaimRefIfNotExists(orderId);
}

export function saveClaimActionOnOrderCancelled(eventData: EventData): void {
  let claimAction = getOrCreateClaimAction("SettleFundingFeeCancelled", eventData);

  let orderId = eventData.getBytes32ItemOrNull("key")!.toHexString();
  let order = Order.load(orderId);

  if (!order) throw new Error("Order not found");

  let marketAddresses = claimAction.marketAddresses;
  marketAddresses.push(order.marketAddress);
  claimAction.marketAddresses = marketAddresses;

  let isLongOrders = claimAction.isLongOrders;
  isLongOrders.push(order.isLong);
  claimAction.isLongOrders = isLongOrders;

  claimAction.save();
}

export function saveClaimActionOnOrderExecuted(eventData: EventData): void {
  let claimAction = getOrCreateClaimAction("SettleFundingFeeExecuted", eventData);
  let orderId = eventData.getBytes32ItemOrNull("key")!.toHexString();
  let order = Order.load(orderId);

  if (!order) throw new Error("Order not found");

  let account = eventData.getAddressItemStringOrNull("account")!;
  let claimableFundingFeeInfoId = eventData.transaction.id + ":" + account;
  let claimableFundingFeeInfo = ClaimableFundingFeeInfo.load(claimableFundingFeeInfoId);

  // if position has no pending funding fees ClaimableFundingUpdated is not emitted
  if (!claimableFundingFeeInfo) {
    return;
  }

  let sourceTokenAddresses = claimableFundingFeeInfo.tokenAddresses;

  for (let i = 0; i < sourceTokenAddresses.length; i++) {
    let sourceTokenAddress = sourceTokenAddresses[i];
    let targetTokenAddresses = claimAction.tokenAddresses;
    targetTokenAddresses.push(sourceTokenAddress);
    claimAction.tokenAddresses = targetTokenAddresses;
  }

  let sourceAmounts = claimableFundingFeeInfo.amounts;
  let targetAmounts = claimAction.amounts;

  for (let i = 0; i < sourceAmounts.length; i++) {
    let sourceAmount = sourceAmounts[i];
    targetAmounts.push(sourceAmount);
  }

  claimAction.amounts = targetAmounts;

  let tokensCount = claimableFundingFeeInfo.tokenAddresses.length;
  let marketAddresses = claimAction.marketAddresses;
  let isLongOrders = claimAction.isLongOrders;

  for (let i = 0; i < tokensCount; i++) {
    marketAddresses.push(order.marketAddress);
    isLongOrders.push(order.isLong);
  }

  claimAction.marketAddresses = marketAddresses;
  claimAction.isLongOrders = isLongOrders;

  claimAction.save();
}

export function handleCollateralClaimAction(eventName: string, eventData: EventData, transaction: Transaction): void {
  let claimCollateralAction = getOrCreateClaimCollateralAction(eventName, eventData, transaction);
  let claimAction = getOrCreateClaimAction(eventName, eventData);

  addFieldsToCollateralLikeClaimAction(claimAction, eventData);
  addFieldsToCollateralLikeClaimAction(claimCollateralAction as ClaimAction, eventData);

  claimCollateralAction.save();
  claimAction.save();
}

export function saveClaimableFundingFeeInfo(eventData: EventData, transaction: Transaction): ClaimableFundingFeeInfo {
  let account = eventData.getAddressItemStringOrNull("account")!;
  let id = transaction.id + ":" + account;
  let entity = ClaimableFundingFeeInfo.load(id);

  if (!entity) {
    entity = new ClaimableFundingFeeInfo(id);
    entity.amounts = new Array<BigInt>(0);
    entity.marketAddresses = new Array<string>(0);
    entity.tokenAddresses = new Array<string>(0);
  }

  let marketAddresses = entity.marketAddresses;
  marketAddresses.push(eventData.getAddressItemStringOrNull("market")!);
  entity.marketAddresses = marketAddresses;

  let tokenAddresses = entity.tokenAddresses;
  tokenAddresses.push(eventData.getAddressItemStringOrNull("token")!);
  entity.tokenAddresses = tokenAddresses;

  let amounts = entity.amounts;
  amounts.push(eventData.getUintItemOrNull("delta")!);
  entity.amounts = amounts;

  entity.save();

  return entity!;
}

function addFieldsToCollateralLikeClaimAction(claimAction: ClaimAction, eventData: EventData): void {
  let marketAddresses = claimAction.marketAddresses;
  marketAddresses.push(eventData.getAddressItemStringOrNull("market")!);
  claimAction.marketAddresses = marketAddresses;

  let tokenAddresses = claimAction.tokenAddresses;
  tokenAddresses.push(eventData.getAddressItemStringOrNull("token")!);
  claimAction.tokenAddresses = tokenAddresses;

  let amounts = claimAction.amounts;
  amounts.push(eventData.getUintItemOrNull("amount")!);
  claimAction.amounts = amounts;
}

function getOrCreateClaimCollateralAction(
  eventName: string,
  eventData: EventData,
  transaction: Transaction
): ClaimCollateralAction {
  let account = eventData.getAddressItemStringOrNull("account")!;
  let id = transaction.id + ":" + account + ":" + eventName;
  let entity = ClaimCollateralAction.load(id);

  if (!entity) {
    entity = new ClaimCollateralAction(id);
    entity.marketAddresses = new Array<string>(0);
    entity.tokenAddresses = new Array<string>(0);
    entity.amounts = new Array<BigInt>(0);

    entity.eventName = eventName;
    entity.account = account;
    entity.transaction = transaction.id;
    entity.save();
  }

  return entity as ClaimCollateralAction;
}

function getOrCreateClaimAction(eventName: string, eventData: EventData): ClaimAction {
  let account = eventData.getAddressItemStringOrNull("account")!;
  let id = eventData.transaction.id + ":" + account + ":" + eventName;
  let entity = ClaimAction.load(id);

  if (!entity) {
    entity = new ClaimAction(id);
    entity.marketAddresses = new Array<string>(0);
    entity.tokenAddresses = new Array<string>(0);
    entity.amounts = new Array<BigInt>(0);
    entity.isLongOrders = new Array<boolean>(0);

    entity.eventName = eventName;
    entity.account = account;
    entity.transaction = eventData.transaction.id;
    entity.save();
  }

  return entity as ClaimAction;
}

export function isFundingFeeSettleOrder(order: Order): boolean {
  return (
    order.initialCollateralDeltaAmount.equals(ONE) &&
    order.sizeDeltaUsd.equals(ZERO) &&
    order.orderType == orderTypes.get("MarketDecrease")
  );
}

function createClaimRefIfNotExists(orderId: string): void {
  if (!ClaimRef.load(orderId)) {
    let entity = new ClaimRef(orderId);
    entity.save();
  }
}
