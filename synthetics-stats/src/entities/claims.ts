import { BigInt } from "@graphprotocol/graph-ts";
import { ClaimCollateralAction, Transaction } from "../../generated/schema";
import { EventData } from "../utils/eventData";

export function handleCollateralClaimAction(
  eventData: EventData,
  transaction: Transaction,
  eventName: string
): ClaimCollateralAction {
  let account = eventData.getAddressItemString("account")!;

  let id = transaction.id + ":" + account + ":" + eventName;

  let claimAction = getOrCreateClaimCollateralAction(id);

  claimAction.eventName = eventName;
  claimAction.account = account;

  let marketAddresses = claimAction.marketAddresses;

  if (!marketAddresses) {
    marketAddresses = new Array<string>(1);
  }

  marketAddresses.push(eventData.getAddressItemString("market")!);

  claimAction.marketAddresses = marketAddresses;

  let tokenAddresses = claimAction.tokenAddresses;

  if (!tokenAddresses) {
    tokenAddresses = new Array<string>(1);
  }

  claimAction.tokenAddresses = tokenAddresses;

  let amounts = claimAction.amounts;

  if (!amounts) {
    amounts = new Array<BigInt>(1);
  }

  amounts.push(eventData.getUintItem("amount")!);

  claimAction.amounts = amounts;

  claimAction.transaction = transaction.id;

  claimAction.save();

  return claimAction;
}

export function getOrCreateClaimCollateralAction(
  id: string
): ClaimCollateralAction {
  let entity = ClaimCollateralAction.load(id);

  if (!entity) {
    entity = new ClaimCollateralAction(id);
  }

  return entity as ClaimCollateralAction;
}
