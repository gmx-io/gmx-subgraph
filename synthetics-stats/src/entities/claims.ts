import { BigInt } from "@graphprotocol/graph-ts";
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
  let account = eventData.getAddressItemString("account")!;
  let id = transaction.id + ":" + account + ":SettleFundingFeeCreated";
  let claimAction = getOrCreateClaimAction(id);

  addRequiredFieldsToClaimAction(
    claimAction,
    eventData,
    transaction,
    "SettleFundingFeeCreated"
  );
  enrichCreatedClaimAction(claimAction, eventData);

  let key = eventData.getBytes32Item("key")!.toHexString();
  let order = Order.load(key);

  if (!order) throw new Error("Order not found");

  let claimRef = getOrCreateClaimRef(order.id);
  claimRef.claimIdPrefix = transaction.id + ":" + account;
  claimRef.save();
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
  let claimRef = getClaimRef(eventData);
  let claimActionCreated = ClaimAction.load(
    claimRef.claimIdPrefix + ":SettleFundingFeeCreated"
  );

  if (!claimActionCreated) throw new Error("ClaimAction not found");

  if (!claimActionCreated.orders || !claimActionCreated.orders.length)
    throw new Error("Empty orders in claimActionCreated");

  let orderId = eventData.getBytes32Item("key")!.toHexString();
  let order = Order.load(orderId);

  if (!order) throw new Error("Order not found");

  copyClaimActionMarketByIndex(
    claimActionCreated!,
    claimAction!,
    claimActionCreated.orders.indexOf(order.id)
  );

  let account = eventData.getAddressItemString("account")!;
  let claimableFundingFeeInfo = ClaimableFundingFeeInfo.load(
    transaction.id + ":" + account
  );

  if (!claimableFundingFeeInfo)
    throw new Error("ClaimableFundingFeeInfo not found");

  insertFundingFeeInfo(claimAction, claimableFundingFeeInfo!);
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
  let claimRef = getClaimRef(eventData);
  let claimActionCreated = ClaimAction.load(
    claimRef.claimIdPrefix + ":SettleFundingFeeCreated"
  );

  if (!claimActionCreated) throw new Error("ClaimAction not found");

  if (!claimActionCreated.orders || !claimActionCreated.orders.length)
    throw new Error("Empty orders in claimActionCreated");

  let orderId = eventData.getBytes32Item("key")!.toHexString();
  let order = Order.load(orderId);

  if (!order) throw new Error("Order not found");

  copyClaimActionMarketByIndex(
    claimActionCreated!,
    claimAction!,
    claimActionCreated.orders.indexOf(order.id)
  );
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
    entity.marketAddress = eventData.getAddressItemString("market")!;
    entity.delta = eventData.getUintItem("delta")!;
    entity.nextValue = eventData.getUintItem("nextValue")!;
  }

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
  let claimRef = getClaimRef(eventData);
  let id = claimRef.claimIdPrefix + ":" + eventName;
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

function enrichCreatedClaimAction(
  claimAction: ClaimAction,
  eventData: EventData
): void {
  let marketAddresses = claimAction.marketAddresses;
  let marketAddress = eventData.getAddressItemString("market")!;
  marketAddresses.push(marketAddress);
  claimAction.marketAddresses = marketAddresses;
  claimAction.save();

  let tokenAddresses = claimAction.tokenAddresses;
  let token = eventData.getAddressItemString("initialCollateralToken")!;

  tokenAddresses.push(token);
  claimAction.tokenAddresses = tokenAddresses;

  let orders = claimAction.orders || [];
  orders.push(eventData.getBytes32Item("key")!.toHexString());
  claimAction.orders = orders;

  claimAction.save();
}

function insertFundingFeeInfo(
  claimAction: ClaimAction,
  claimableFundingFeeInfo: ClaimableFundingFeeInfo
): void {
  let marketAddresses = claimAction.marketAddresses;
  let marketAddress = claimableFundingFeeInfo.marketAddress;
  let index = marketAddresses.indexOf(marketAddress);

  if (index !== -1) {
    let amounts = claimAction.amounts;
    amounts[index as i32] = claimableFundingFeeInfo.delta;

    claimAction.amounts = amounts;
  }
  claimAction.save();
}

function copyClaimActionMarketByIndex(
  from: ClaimAction,
  to: ClaimAction,
  index: i32
): void {
  if (index === -1) throw new Error("Order not found in orders");

  let fromMarketAddresses = from.marketAddresses;
  let fromTokenAddresses = from.tokenAddresses;
  let marketAddress = fromMarketAddresses[index as i32];
  let tokenAddress = fromTokenAddresses[index as i32];

  if (!marketAddress || !tokenAddress) {
    throw new Error("marketAddress or tokenAddress is null");
  }

  let toMarketAddresses = to.marketAddresses;
  let toTokenAddresses = to.tokenAddresses;

  toMarketAddresses.push(marketAddress);
  toTokenAddresses.push(tokenAddress);

  to.marketAddresses = toMarketAddresses;
  to.tokenAddresses = toTokenAddresses;

  to.save();
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
  }

  return entity as ClaimRef;
}

function getClaimRef(eventData: EventData): ClaimRef {
  let key = eventData.getBytes32Item("key")!.toHexString();
  let order = Order.load(key);

  if (!order) throw new Error("Order not found");

  let claimRef = ClaimRef.load(order.id);

  if (!claimRef) throw new Error("ClaimRef not found");

  return claimRef!;
}
